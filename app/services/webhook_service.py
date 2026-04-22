import hmac
import hashlib
import json
import logging
import httpx
import asyncio
from typing import Any, Dict, List
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import WebhookSubscription, SMSMessage

logger = logging.getLogger(__name__)

class WebhookService:
    async def dispatch_message_event(self, message_id: int, event_type: str):
        """
        Triggered when a message status changes.
        event_type: 'message.sent', 'message.delivered', 'message.failed'
        """
        async with SessionLocal() as db:
            # 1. Fetch message data
            stmt = select(SMSMessage).where(SMSMessage.id == message_id)
            result = await db.execute(stmt)
            msg = result.scalar_one_or_none()
            
            if not msg:
                return

            # 2. Find active subscriptions for this organization
            sub_stmt = select(WebhookSubscription).where(
                WebhookSubscription.organization_id == msg.organization_id,
                WebhookSubscription.is_active == True
            )
            sub_result = await db.execute(sub_stmt)
            subscriptions = sub_result.scalars().all()

            if not subscriptions:
                return

            # 3. Build payload
            payload = {
                "event": event_type,
                "timestamp": msg.delivered_at.isoformat() if msg.delivered_at else msg.created_at.isoformat(),
                "data": {
                    "id": msg.id,
                    "recipient": msg.recipient,
                    "status": msg.status,
                    "provider_msg_id": msg.provider_msg_id,
                    "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
                    "delivered_at": msg.delivered_at.isoformat() if msg.delivered_at else None,
                    "error": msg.error_message
                }
            }
            
            # 4. Fire off webhooks in parallel (background tasks)
            tasks = [self._send_webhook(sub, payload) for sub in subscriptions if event_type in sub.events]
            if tasks:
                asyncio.gather(*tasks)

    async def _send_webhook(self, sub: WebhookSubscription, payload: Dict[str, Any]):
        payload_bytes = json.dumps(payload).encode('utf-8')
        signature = hmac.new(
            sub.secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "X-Nexra-Signature": signature,
            "User-Agent": "Nexra-Webhook-Dispatcher/1.0"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(sub.url, content=payload_bytes, headers=headers)
                if response.status_code >= 400:
                    logger.warning(f"Webhook to {sub.url} failed with status {response.status_code}")
                else:
                    logger.info(f"Webhook dispatched successfully to {sub.url}")
        except Exception as e:
            logger.error(f"Webhook dispatch error to {sub.url}: {str(e)}")

webhook_service = WebhookService()
