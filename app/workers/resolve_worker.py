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
SUBMITTED_POLL_WINDOW_HOURS = 24  # How far back to look for stuck SUBMITTED messages
PENDING_ORPHAN_THRESHOLD_MINUTES = 5  # Re-enqueue PENDING messages older than this


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


async def resolve_stuck_messages(hours: int = None, limit: int = 100) -> dict:
    """
    Polls Arkesel for all messages stuck in SUBMITTED status and updates
    their delivery state. Returns a summary dict.

    This is the single source of truth used by both:
    - The automatic background poller (every 2 minutes)
    - The manual /resolve admin endpoint in sms.py
    """
    if not settings.ARKESEL_API_KEY:
        logger.warning("[RESOLVE] ARKESEL_API_KEY not set, skipping resolve.")
        return {"message": "Arkesel API key not configured.", "resolved": 0, "checked": 0, "errors": []}

    window_hours = hours if hours is not None else SUBMITTED_POLL_WINDOW_HOURS
    async with AsyncSessionLocal() as db:
        # Poll SUBMITTED messages sent within the last window_hours.
        # Previously this was 2 hours, which caused messages that arrived late
        # (or whose DLRs were delayed) to be permanently stuck in SUBMITTED.
        cutoff = datetime.utcnow() - timedelta(hours=window_hours)
        stmt = select(SMSMessage).where(
            SMSMessage.status == MessageStatus.SUBMITTED,
            SMSMessage.provider_msg_id.isnot(None),
            SMSMessage.sent_at >= cutoff,
        ).limit(limit)
        result = await db.execute(stmt)
        stuck = result.scalars().all()

        if not stuck:
            logger.debug("[RESOLVE] No stuck SUBMITTED messages found.")
            return {"message": "No stuck messages.", "resolved": 0, "checked": 0, "errors": []}

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


async def recover_orphaned_pending_messages() -> dict:
    """
    Re-enqueues PENDING messages that were never processed (sent_at IS NULL)
    and are older than PENDING_ORPHAN_THRESHOLD_MINUTES.

    This handles messages whose RQ jobs were lost due to worker crashes or
    Render cold starts, which leave them permanently stuck in PENDING.
    """
    from app.core.queue import enqueue_sms

    threshold = datetime.utcnow() - timedelta(minutes=PENDING_ORPHAN_THRESHOLD_MINUTES)

    async with AsyncSessionLocal() as db:
        stmt = select(SMSMessage).where(
            SMSMessage.status == MessageStatus.PENDING,
            SMSMessage.sent_at.is_(None),
            SMSMessage.created_at <= threshold,
        ).limit(100)
        result = await db.execute(stmt)
        orphans = result.scalars().all()

        if not orphans:
            logger.debug("[PENDING-RECOVERY] No orphaned PENDING messages found.")
            return {"message": "No orphaned messages.", "recovered": 0, "checked": 0}

        logger.info(f"[PENDING-RECOVERY] Found {len(orphans)} orphaned PENDING message(s). Re-enqueuing...")

        recovered = 0
        for msg in orphans:
            try:
                await enqueue_sms(msg.id)
                recovered += 1
                logger.info(f"[PENDING-RECOVERY] Re-enqueued msg_id={msg.id} (created_at={msg.created_at})")
            except Exception as e:
                logger.error(f"[PENDING-RECOVERY] Failed to re-enqueue msg_id={msg.id}: {e}")

    summary = {"recovered": recovered, "checked": len(orphans)}
    logger.info(f"[PENDING-RECOVERY] Complete. {summary}")
    return summary


async def auto_resolve_loop():
    """
    Background loop that runs every POLL_INTERVAL_SECONDS and:
    1. Polls Arkesel for SUBMITTED messages and auto-resolves them.
    2. Re-enqueues orphaned PENDING messages whose RQ jobs were lost.

    This compensates for Render free-tier cold starts which cause Arkesel's
    push DLR callbacks to be lost and RQ jobs to be dropped.
    """
    logger.info(f"[AUTO-RESOLVE] Poller started. Interval: {POLL_INTERVAL_SECONDS}s")
    while True:
        try:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
            logger.info("[AUTO-RESOLVE] Running scheduled resolve pass...")
            await resolve_stuck_messages()
            await recover_orphaned_pending_messages()
        except asyncio.CancelledError:
            logger.info("[AUTO-RESOLVE] Poller cancelled.")
            break
        except Exception as e:
            logger.error(f"[AUTO-RESOLVE] Unexpected error in resolve loop: {e}", exc_info=True)
