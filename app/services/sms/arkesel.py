import httpx
from typing import Dict
from app.core.config import settings
from app.services.sms.base import SMSProvider

class ArkeselProvider(SMSProvider):
    def __init__(self):
        self.api_key = settings.ARKESEL_API_KEY
        self.base_url = "https://sms.arkesel.com/api/v2/sms/send"

    async def send(self, recipient: str, sender: str, content: str) -> Dict:
        if not self.api_key:
            return {"status": "error", "message": "Arkesel API Key not configured"}

        headers = {"api-key": self.api_key}
        # Format number for Ghana (Arkesel prefers 233...)
        clean_recipient = recipient.replace("+", "").strip()
        if clean_recipient.startswith("0"):
            clean_recipient = "233" + clean_recipient[1:]
        elif not clean_recipient.startswith("233"):
            # If it doesn't start with 233 and was just e.g. 244...
            clean_recipient = "233" + clean_recipient

        payload = {
            "sender": sender,
            "message": content,
            "recipients": [clean_recipient]
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.base_url, json=payload, headers=headers)
                data = response.json()
                
                # Arkesel success is usually status 201
                if response.status_code in [200, 201]:
                    return {
                        "status": "success", 
                        "provider_msg_id": data.get("data", {}).get("id") or data.get("id"),
                        "raw_response": data
                    }
                return {"status": "error", "message": data.get("message", "Unknown Arkesel error"), "raw_response": data}
            except Exception as e:
                return {"status": "error", "message": str(e)}

    async def get_balance(self) -> float:
        if not self.api_key: return 0.0
        # Arkesel balance check endpoint
        url = "https://sms.arkesel.com/api/v2/clients/balance"
        headers = {"api-key": self.api_key}
        async with httpx.AsyncClient() as client:
            try:
                res = await client.get(url, headers=headers)
                data = res.json()
                return float(data.get("balance", 0.0))
            except:
                return 0.0
