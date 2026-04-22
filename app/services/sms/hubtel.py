from typing import Dict
from app.services.sms.base import SMSProvider
from app.core.config import settings

class HubtelProvider(SMSProvider):
    async def send(self, recipient: str, sender: str, content: str) -> Dict:
        # TODO: Implement Hubtel API Logic
        # See: https://developers.hubtel.com/documentations/send-sms
        return {"status": "error", "message": "Hubtel integration not yet completed. Please provide API details."}

    async def get_balance(self) -> float:
        return 0.0
