import os
import logging
from typing import Optional
from app.services.adapters.base import BaseMNOAdapter

logger = logging.getLogger(__name__)

class VodafoneAdapter(BaseMNOAdapter):
    """
    Placeholder adapter for Vodafone Ghana (Telecel).
    Currently implemented as a mock for development.
    """

    def __init__(self, provider_id: str, host: str, port: int, system_id: str, password: str, system_type: str = ""):
        super().__init__(provider_id)
        self._connected = False

    async def connect(self):
        logger.info(f"Mock connecting to Vodafone at {self.provider_id}")
        self._connected = True

    async def send_sms(self, recipient: str, sender: str, message: str) -> Optional[str]:
        logger.info(f"MOCK SEND [Vodafone]: {sender} -> {recipient}: {message}")
        return f"vod_{os.urandom(8).hex()}" if self._connected else None

    def is_connected(self) -> bool:
        return self._connected

    async def disconnect(self):
        self._connected = False
