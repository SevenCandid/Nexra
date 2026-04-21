import asyncio
import logging
from typing import Dict, Optional, Any
from pydantic import BaseModel
import smpplib.client
import smpplib.consts
import smpplib.gsm

logger = logging.getLogger(__name__)

class SMPPConfig(BaseModel):
    host: str
    port: int
    system_id: str
    password: str
    system_type: str = ""
    addr_ton: int = 1
    addr_npi: int = 1
    source_addr_ton: int = 5
    source_addr_npi: int = 0
    dest_addr_ton: int = 1
    dest_addr_npi: int = 1

class SMPPGateway:
    """
    Asynchronous SMPP Gateway for NEXRA.
    Uses smpplib for the protocol but wrapped in an async-friendly way.
    Note: smpplib itself is synchronous, so we run it in threads or use a wrapper.
    For a production-grade system, we'll eventually move to a native async library
    or manage a persistent thread pool for each MNO connection.
    """

    def __init__(self, provider_id: str, config: SMPPConfig):
        self.provider_id = provider_id
        self.config = config
        self.client: Optional[smpplib.client.Client] = None
        self._is_connected = False

    async def connect(self):
        """Establish connection and bind to the MSC."""
        try:
            # Running synchronous smpplib in a thread to keep FastAPI async
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self._sync_connect)
            self._is_connected = True
            logger.info(f"Connected to SMPP provider: {self.provider_id}")
        except Exception as e:
            logger.error(f"Failed to connect to {self.provider_id}: {str(e)}")
            self._is_connected = False
            raise

    def _sync_connect(self):
        """Synchronous connection logic for smpplib."""
        self.client = smpplib.client.Client(self.config.host, self.config.port)
        
        # Set up callbacks
        self.client.set_message_sent_handler(self._on_message_sent)
        self.client.set_message_received_handler(self._on_message_received)
        
        # Connect and bind
        self.client.connect()
        self.client.bind_transceiver(
            system_id=self.config.system_id,
            password=self.config.password,
            system_type=self.config.system_type
        )

    def _on_message_sent(self, pdu):
        logger.debug(f"[{self.provider_id}] PDU sent: {pdu.sequence}")

    def _on_message_received(self, pdu):
        """Handle incoming PDUs (DeliverSM, EnquireLink, etc.)"""
        logger.debug(f"[{self.provider_id}] PDU received: {pdu.command}")
        
        # Handle EnquireLink (Keep-alive)
        if pdu.command == 'enquire_link':
            # smpplib handles response if we use listen() or manually
            pass

    async def send_sms(self, recipient: str, sender: str, message: str) -> str:
        """Send an SMS message via the bound connection."""
        if not self._is_connected:
            await self.connect()

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._sync_send_sms, recipient, sender, message)

    def _sync_send_sms(self, recipient: str, sender: str, message: str) -> str:
        """Synchronous SMS sending logic."""
        # Handle multi-part messages (GSMA standard)
        parts, encoding, esm_class = smpplib.gsm.make_parts(message)
        
        msg_ids = []
        for part in parts:
            pdu = self.client.send_message(
                source_addr_ton=self.config.source_addr_ton,
                source_addr_npi=self.config.source_addr_npi,
                source_addr=sender,
                dest_addr_ton=self.config.dest_addr_ton,
                dest_addr_npi=self.config.dest_addr_npi,
                destination_addr=recipient,
                short_message=part,
                data_coding=encoding,
                esm_class=esm_class,
                registered_delivery=True, # We want DLRs
            )
            msg_ids.append(str(pdu.sequence))
        
        return ",".join(msg_ids)

    async def listen(self):
        """Continuously listen for incoming PDUs (DLRs, Inbound SMS)."""
        if not self._is_connected:
            await self.connect()
        
        loop = asyncio.get_running_loop()
        while True:
            try:
                await loop.run_in_executor(None, self.client.listen)
            except Exception as e:
                logger.error(f"Error in SMPP listener for {self.provider_id}: {e}")
                await asyncio.sleep(5)
                await self.connect()
