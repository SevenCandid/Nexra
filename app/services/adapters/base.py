from abc import ABC, abstractmethod
from typing import Optional

class BaseMNOAdapter(ABC):
    """
    Abstract base class for all MNO (Mobile Network Operator) Adapters.
    Follows the Adapter Pattern to provide a unified interface for SMS sending.
    """

    def __init__(self, provider_id: str):
        self.provider_id = provider_id
        self.on_dlr_received = None

    @abstractmethod
    async def connect(self):
        """Establish connection to the MNO gateway."""
        pass

    @abstractmethod
    async def send_sms(self, recipient: str, sender: str, message: str) -> Optional[str]:
        """Send an SMS via the MNO gateway. Returns provider message ID or None."""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Check if the adapter is currently connected and ready."""
        pass

    @abstractmethod
    async def disconnect(self):
        """Gracefully disconnect from the gateway."""
        pass
