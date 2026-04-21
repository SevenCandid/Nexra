import logging
from typing import Optional
from app.services.adapters.base import BaseMNOAdapter

logger = logging.getLogger(__name__)

class AirtelTigoAdapter(BaseMNOAdapter):
    """
    Placeholder adapter for AirtelTigo Ghana (AT).
    Currently implemented as a mock for development.
    """

    def __init__(self, provider_id: str, host: str, port: int, system_id: str, password: str, system_type: str = ""):
        super().__init__(provider_id)
        self._connected = False

    async def connect(self):
        logger.info(f"Mock connecting to AirtelTigo at {self.provider_id}")
        self._connected = True

    async def send_sms(self, recipient: str, sender: str, message: str) -> Optional[str]:
        logger.info(f"MOCK SEND [AirtelTigo]: {sender} -> {recipient}: {message}")
        return f"atg_{id(message)}"

    def is_connected(self) -> bool:
        return self._connected

    async def disconnect(self):
        self._connected = False
