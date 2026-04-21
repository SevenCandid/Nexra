import struct
from enum import IntEnum

# --- SMPP CONSTANTS (v3.4) ---

class CommandId(IntEnum):
    BIND_RECEIVER = 0x00000001
    BIND_TRANSMITTER = 0x00000002
    QUERY_SM = 0x00000003
    SUBMIT_SM = 0x00000004
    DELIVER_SM = 0x00000005
    UNBIND = 0x00000006
    REPLACE_SM = 0x00000007
    CANCEL_SM = 0x00000008
    BIND_TRANSCEIVER = 0x00000009
    OUTBIND = 0x0000000B
    ENQUIRE_LINK = 0x00000015
    SUBMIT_MULTI = 0x00000021
    ALERT_NOTIFICATION = 0x00000102
    DATA_SM = 0x00000103
    
    # Response IDs are 0x80000000 | CommandId
    BIND_RECEIVER_RESP = 0x80000001
    BIND_TRANSMITTER_RESP = 0x80000002
    QUERY_SM_RESP = 0x80000003
    SUBMIT_SM_RESP = 0x80000004
    DELIVER_SM_RESP = 0x80000005
    UNBIND_RESP = 0x80000006
    REPLACE_SM_RESP = 0x80000007
    CANCEL_SM_RESP = 0x80000008
    BIND_TRANSCEIVER_RESP = 0x80000009
    ENQUIRE_LINK_RESP = 0x80000015
    SUBMIT_MULTI_RESP = 0x80000021
    DATA_SM_RESP = 0x80000003

class CommandStatus(IntEnum):
    ESME_ROK = 0x00000000
    ESME_RINVMSGLEN = 0x00000001
    ESME_RINVCMDLEN = 0x00000002
    ESME_RINVCMDID = 0x00000003
    ESME_RINVBNDSTS = 0x00000004
    ESME_RALYBND = 0x00000005
    ESME_RINVPRTFLG = 0x00000006
    ESME_RINVREGDLV = 0x00000007
    ESME_RSYSERR = 0x00000008
    ESME_RINVSRCADR = 0x0000000A
    ESME_RINVDSTADR = 0x0000000B
    ESME_RINVMSGID = 0x0000000C
    ESME_RBINDFAIL = 0x0000000D
    ESME_RINVPASWD = 0x0000000E
    ESME_RINVSYSID = 0x0000000F
    ESME_RINVSYSTYP = 0x00000012
    ESME_RTHROTTLED = 0x00000058

class SMPPPDU:
    """Represents a raw SMPP Protocol Data Unit."""
    def __init__(self, command_id: CommandId, sequence_number: int, status: int = 0, body: bytes = b''):
        self.command_id = command_id
        self.sequence_number = sequence_number
        self.status = status
        self.body = body

    def pack(self) -> bytes:
        length = 16 + len(self.body)
        header = struct.pack('>IIII', length, self.command_id, self.status, self.sequence_number)
        return header + self.body

    @classmethod
    def unpack(cls, data: bytes) -> 'SMPPPDU':
        if len(data) < 16:
            raise ValueError("Data too short briefly for SMPP header")
        length, command_id, status, sequence_number = struct.unpack('>IIII', data[:16])
        body = data[16:length]
        return cls(CommandId(command_id), sequence_number, status, body)

def cstring(s: str) -> bytes:
    """Null-terminated string for SMPP."""
    return s.encode('ascii') + b'\x00'

def read_cstring(data: bytes, offset: int = 0) -> tuple[str, int]:
    end = data.find(b'\x00', offset)
    if end == -1:
        return data[offset:].decode('ascii'), len(data)
    return data[offset:end].decode('ascii'), end + 1
