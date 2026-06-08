import asyncio
import logging
import httpx
from datetime import datetime, timedelta

from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models import SMSMessage, MessageStatus
from app.services.campaign_status import refresh_campaign_delivery_status
from app.core.config import settings

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 120  # Poll every 2 minutes


STATUS_MAP = {
    "DELIVERED": MessageStatus.DELIVERED,
    "DELIVRD": MessageStatus.DELIVERED,
    "NOT_DELIVERED": MessageStatus.NOT_DELIVERED,
    "UNDELIV": MessageStatus.NOT_DELIVERED,
    "FAILED": MessageStatus.NOT_DELIVERED,
    "EXPIRED": MessageStatus.NOT_DELIVERED,
    "REJECTED": MessageStatus.NOT_DELIVERED,
    "PROHIBITED": MessageStatus.NOT_DELIVERED,
    "UNDELIVERED": MessageStatus.NOT_DELIVERED,
}


async def resolve_stuck_messages() -> dict:
    """
    Polls Arkesel for all messages stuck in SUBMITTED status and updates
    their delivery state. Returns a summary dict.

    This is the single source of truth used by both:
    - The automatic background poller (every 2 minutes)
    - The manual /resolve admin endpoint in sms.py
    """
    if not settings.ARKESEL_API_KEY:
        logger.warning("[RESOLVE] ARKESEL_API_KEY not set, skipping resolve.")
        return {"message": "Arkesel API key not configured.", "resolved": 0}

    async with AsyncSessionLocal() as db:
        # Only poll messages sent within the last 2 hours.
        # Older messages have either been auto-resolved by the 15-min fallback
        # or are genuinely stuck and should not keep hitting the Arkesel API.
        cutoff = datetime.utcnow() - timedelta(hours=2)
        stmt = select(SMSMessage).where(
            SMSMessage.status == MessageStatus.SUBMITTED,
            SMSMessage.provider_msg_id.isnot(None),
            SMSMessage.sent_at >= cutoff,
        ).limit(100)
        result = await db.execute(stmt)
        stuck = result.scalars().all()

        if not stuck:
            logger.debug("[RESOLVE] No stuck SUBMITTED messages found.")
            return {"message": "No stuck messages.", "resolved": 0}

        logger.info(f"[RESOLVE] Found {len(stuck)} SUBMITTED message(s) to poll.")

        resolved = 0
        errors = []
        campaign_ids_to_refresh = set()

        async with httpx.AsyncClient(timeout=15.0) as client:
            for msg in stuck:
                try:
                    resp = await client.get(
                        f"https://sms.arkesel.com/api/v2/sms/{msg.provider_msg_id}",
                        headers={"api-key": settings.ARKESEL_API_KEY},
                    )
                    data = resp.json()
                    logger.info(
                        f"[RESOLVE] Arkesel status for msg_id={msg.id}, "
                        f"provider_id={msg.provider_msg_id}: {data}"
                    )

                    raw_data = data.get("data", data)
                    if isinstance(raw_data, list) and raw_data:
                        raw_data = raw_data[0]
                    elif not isinstance(raw_data, dict):
                        raw_data = {}

                    raw_status = (
                        str(raw_data.get("status") or data.get("status") or "")
                        .strip()
                        .replace(" ", "_")
                        .replace("-", "_")
                        .upper()
                    )

                    new_status = STATUS_MAP.get(raw_status)
                    
                    # Carrier DLR Loss Fallback:
                    # If Arkesel still reports SUBMITTED after 15 minutes, we assume it was delivered.
                    # Carriers frequently lose or drop DLRs for heavy multi-part messages.
                    if new_status is None and raw_status in ("SUBMITTED", "QUEUED"):
                        if msg.created_at and datetime.utcnow() - msg.created_at > timedelta(minutes=15):
                            logger.info(f"[RESOLVE] Auto-resolving stale SUBMITTED msg_id={msg.id} to DELIVERED (older than 15 minutes).")
                            new_status = MessageStatus.DELIVERED

                    if new_status is not None:
                        msg.status = new_status
                        if new_status == MessageStatus.DELIVERED:
                            msg.delivered_at = datetime.utcnow()
                        resolved += 1

                        if msg.campaign_id:
                            campaign_ids_to_refresh.add(msg.campaign_id)

                        # Broadcast the status update over WebSocket
                        try:
                            from app.core.websocket import manager
                            await manager.broadcast_to_org(msg.organization_id, {
                                "type": "message_updated",
                                "data": {
                                    "id": msg.id,
                                    "status": msg.status,
                                    "recipient": msg.recipient,
                                },
                            })
                        except Exception as ws_err:
                            logger.warning(f"[RESOLVE] WebSocket broadcast failed for msg_id={msg.id}: {ws_err}")

                except Exception as e:
                    errors.append(f"msg_id={msg.id}: {str(e)}")
                    logger.error(f"[RESOLVE] Failed to poll msg_id={msg.id}: {e}")

        # Refresh all affected campaigns in one pass
        for campaign_id in campaign_ids_to_refresh:
            try:
                await refresh_campaign_delivery_status(db, campaign_id)
            except Exception as e:
                logger.error(f"[RESOLVE] Campaign refresh failed for campaign_id={campaign_id}: {e}")

        await db.commit()

    summary = {
        "resolved": resolved,
        "checked": len(stuck),
        "errors": errors,
    }
    logger.info(f"[RESOLVE] Complete. {summary}")
    return summary


async def auto_resolve_loop():
    """
    Background loop that automatically polls Arkesel every POLL_INTERVAL_SECONDS
    for any messages stuck in SUBMITTED status.

    This compensates for Render free-tier cold starts which cause Arkesel's
    push DLR callbacks to be lost.
    """
    logger.info(f"[AUTO-RESOLVE] Poller started. Interval: {POLL_INTERVAL_SECONDS}s")
    while True:
        try:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
            logger.info("[AUTO-RESOLVE] Running scheduled resolve pass...")
            await resolve_stuck_messages()
        except asyncio.CancelledError:
            logger.info("[AUTO-RESOLVE] Poller cancelled.")
            break
        except Exception as e:
            logger.error(f"[AUTO-RESOLVE] Unexpected error in resolve loop: {e}", exc_info=True)
