import asyncio
import logging
import struct
import time
from typing import Dict, Optional, Any, Callable
from app.services.smpp_proto import CommandId, CommandStatus, SMPPPDU, cstring, read_cstring

logger = logging.getLogger(__name__)

class MTNSMPPClient:
    """
    A low-level, high-performance async SMPP client for MTN Ghana.
    This implementation handles raw PDU buffers and async socket state.
    """

    def __init__(
        self, 
        host: str, 
        port: int, 
        system_id: str, 
        password: str, 
        system_type: str = "",
        enquire_interval: int = 30
    ):
        self.host = host
        self.port = port
        self.system_id = system_id
        self.password = password
        self.system_type = system_type
        self.enquire_interval = enquire_interval
        
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self._sequence_number = 1
        self._pending_responses: Dict[int, asyncio.Future] = {}
        self._is_connected = False
        self._is_bound = False
        
        # Callback for Delivery Reports (DLRs)
        self.on_dlr_received: Optional[Callable[[str, str], Any]] = None

    @property
    def next_sequence(self) -> int:
        res = self._sequence_number
        self._sequence_number = (self._sequence_number + 1) % 0x7FFFFFFF
        if self._sequence_number == 0: self._sequence_number = 1
        return res

    async def connect(self):
        """Establish TCP connection and start the listening loop."""
        logger.info(f"Connecting to MTN SMPP at {self.host}:{self.port}")
        self.reader, self.writer = await asyncio.open_connection(self.host, self.port)
        self._is_connected = True
        asyncio.create_task(self._listen_loop())
        asyncio.create_task(self._keep_alive_loop())
        
        await self.bind()

    async def bind(self):
        """Perform BIND_TRANSCEIVER."""
        body = (
            cstring(self.system_id) +
            cstring(self.password) +
            cstring(self.system_type) +
            struct.pack('>BBB', 0x34, 0x01, 0x01) + # interface_version, addr_ton, addr_npi
            cstring("") # address_range
        )
        
        resp = await self._send_pdu_and_wait(CommandId.BIND_TRANSCEIVER, body)
        if resp.status == CommandStatus.ESME_ROK:
            self._is_bound = True
            logger.info(f"SMPP Bound successfully as {self.system_id}")
        else:
            raise Exception(f"Failed to bind: Status {resp.status}")

    async def submit_sm(self, source_addr: str, dest_addr: str, message: str) -> str:
        """Submit a single SMS."""
        if not self._is_bound:
            raise Exception("SMPP Client not bound")

        msg_bytes = message.encode('ascii', errors='replace') # basic GSM 03.38 or ASCII
        
        body = (
            cstring("") + # service_type
            struct.pack('>BB', 0x05, 0x00) + # source_addr_ton (Alpha), source_addr_npi
            cstring(source_addr) +
            struct.pack('>BB', 0x01, 0x01) + # dest_addr_ton, dest_addr_npi
            cstring(dest_addr) +
            struct.pack('>BBB', 0x00, 0x00, 0x01) + # esm_class, protocol_id, priority_flag
            cstring("") + # schedule_delivery_time
            cstring("") + # validity_period
            struct.pack('>BB', 0x01, 0x00) + # registered_delivery, replace_if_present_flag
            struct.pack('>B', 0x00) + # data_coding
            struct.pack('>B', 0x00) + # sm_default_msg_id
            struct.pack('>B', len(msg_bytes)) +
            msg_bytes
        )

        resp = await self._send_pdu_and_wait(CommandId.SUBMIT_SM, body)
        if resp.status == CommandStatus.ESME_ROK:
            msg_id, _ = read_cstring(resp.body)
            return msg_id
        else:
            raise Exception(f"SUBMIT_SM failed with status {resp.status}")

    async def _send_pdu_and_wait(self, command_id: CommandId, body: bytes = b'') -> SMPPPDU:
        seq = self.next_sequence
        pdu = SMPPPDU(command_id, seq, body=body)
        
        future = asyncio.get_running_loop().create_future()
        self._pending_responses[seq] = future
        
        self.writer.write(pdu.pack())
        await self.writer.drain()
        
        try:
            return await asyncio.wait_for(future, timeout=10.0)
        finally:
            self._pending_responses.pop(seq, None)

    async def _listen_loop(self):
        """Continuously read from the socket."""
        try:
            while self._is_connected:
                # Read header (16 bytes)
                header_data = await self.reader.readexactly(16)
                length, cmd_id, status, seq = struct.unpack('>IIII', header_data)
                
                # Read body
                body_len = length - 16
                body_data = b''
                if body_len > 0:
                    body_data = await self.reader.readexactly(body_len)
                
                pdu = SMPPPDU(CommandId(cmd_id), seq, status, body_data)
                await self._handle_incoming_pdu(pdu)
        except Exception as e:
            logger.error(f"SMPP Connection lost in listen loop: {e}")
            self._is_connected = False
            self._is_bound = False

    async def _handle_incoming_pdu(self, pdu: SMPPPDU):
        """Route the PDU depending on its type."""
        # 1. Responses to our requests
        if pdu.command_id & 0x80000000:
            future = self._pending_responses.get(pdu.sequence_number)
            if future and not future.done():
                future.set_result(pdu)
        
        # 2. Inbound requests from the MNO
        elif pdu.command_id == CommandId.ENQUIRE_LINK:
            resp = SMPPPDU(CommandId.ENQUIRE_LINK_RESP, pdu.sequence_number)
            self.writer.write(resp.pack())
            await self.writer.drain()
            
        elif pdu.command_id == CommandId.DELIVER_SM:
            # This handles DLRs in SMPP terminology
            await self._parse_deliver_sm(pdu)
            # Acknowledge
            resp = SMPPPDU(CommandId.DELIVER_SM_RESP, pdu.sequence_number)
            self.writer.write(resp.pack())
            await self.writer.drain()

    async def _parse_deliver_sm(self, pdu: SMPPPDU):
        """Parse the DLR from the body of a DELIVER_SM PDU."""
        try:
            # Skip fields to get to short_message
            # service_type (cstring)
            _, offset = read_cstring(pdu.body)
            # source_addr_ton (1), source_addr_npi (1)
            offset += 2
            # source_addr (cstring)
            _, offset = read_cstring(pdu.body, offset)
            # dest_addr_ton (1), dest_addr_npi (1)
            offset += 2
            # destination_addr (cstring)
            _, offset = read_cstring(pdu.body, offset)
            # esm_class, protocol_id, priority_flag, schedule, validity, reg_dlv, replace, data_coding, sm_default
            offset += 9
            # sm_length (1)
            sm_len = pdu.body[offset]
            offset += 1
            short_message = pdu.body[offset:offset+sm_len].decode('ascii', errors='ignore')
            
            # Look for id:XXXX status:XXXX
            # Example format: "id:123456789 sub:001 dlvrd:001 submit date:2302072045 done date:2302072045 stat:DELIVRD err:000 text:..."
            import re
            dlr_data = {
                "id": None,
                "sub": None,
                "dlvrd": None,
                "stat": None,
                "err": None,
                "raw": short_message
            }
            
            patterns = {
                "id": r'id:([^\s]+)',
                "sub": r'sub:(\d+)',
                "dlvrd": r'dlvrd:(\d+)',
                "stat": r'stat:([A-Z]+)',
                "err": r'err:(\d+)'
            }
            
            for key, pattern in patterns.items():
                m = re.search(pattern, short_message)
                if m:
                    dlr_data[key] = m.group(1)

            if dlr_data["id"] and dlr_data["stat"]:
                logger.info(f"DLR Parsed: ID={dlr_data['id']}, Status={dlr_data['stat']}, Err={dlr_data['err']}")
                if self.on_dlr_received:
                    await self.on_dlr_received(dlr_data)
        except Exception as e:
            logger.error(f"Failed to parse DLR PDU: {e}")

    async def _keep_alive_loop(self):
        """Send ENQUIRE_LINK at intervals."""
        while self._is_connected:
            await asyncio.sleep(self.enquire_interval)
            try:
                if self._is_bound:
                    await self._send_pdu_and_wait(CommandId.ENQUIRE_LINK)
                    logger.debug("ENQUIRE_LINK sent and acked")
            except Exception as e:
                logger.warning(f"Keep-alive failed: {e}")
                # Connection might be dead, listen loop will handle reconnect logic
