from abc import ABC, abstractmethod
from typing import List, Optional, Dict

class SMSProvider(ABC):
    @abstractmethod
    async def send(self, recipient: str, sender: str, content: str) -> Dict:
        """Send a single SMS message."""
        pass

    @abstractmethod
    async def get_balance(self) -> float:
        """Get the current provider account balance (in GHS/units)."""
        pass
