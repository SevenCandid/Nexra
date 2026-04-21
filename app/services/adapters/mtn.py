from typing import Optional
from app.services.adapters.base import BaseMNOAdapter
from app.services.mtn_smpp_client import MTNSMPPClient

class MTNAdapter(BaseMNOAdapter):
    """
    Adapter for MTN Ghana MNO. 
    Wraps the custom raw MTNSMPPClient.
    """

    def __init__(self, provider_id: str, host: str, port: int, system_id: str, password: str, system_type: str = ""):
        super().__init__(provider_id)
        self.client = MTNSMPPClient(
            host=host,
            port=port,
            system_id=system_id,
            password=password,
            system_type=system_type
        )

    async def connect(self):
        self.client.on_dlr_received = self.on_dlr_received
        await self.client.connect()

    async def send_sms(self, recipient: str, sender: str, message: str) -> Optional[str]:
        # The MTNSMPPClient handles the raw protocol submission
        return await self.client.submit_sm(
            source_addr=sender,
            dest_addr=recipient,
            message=message
        )

    def is_connected(self) -> bool:
        return self.client._is_connected and self.client._is_bound

    async def disconnect(self):
        # Graceful shutdown logic would go here
        if self.client.writer:
            self.client.writer.close()
            await self.client.writer.wait_closed()
        self.client._is_connected = False
        self.client._is_bound = False
