import asyncio
import logging
from datetime import datetime
from app.db.session import SessionLocal
from app.db.models import SMSMessage, MessageStatus, DeliveryReportLog
from sqlalchemy.future import select
from app.services.campaign_status import refresh_campaign_delivery_status

logger = logging.getLogger(__name__)

def process_delivery_report(dlr_data: dict):
    """Entry point for RQ worker to process a delivery report."""
    asyncio.run(_async_process_dlr(dlr_data))

async def _async_process_dlr(dlr_data: dict):
    """
    Core async logic for processing a delivery report.
    1. Find SMSMessage by provider_msg_id.
    2. Update its status and delivered_at timestamp.
    3. Log raw delivery report for auditing.
    """
    provider_msg_id = dlr_data.get("id")
    stat = str(dlr_data.get("stat") or "").strip().replace(" ", "_").replace("-", "_").upper()
    
    if not provider_msg_id:
        logger.error("DLR data missing provider_msg_id")
        return

    async with SessionLocal() as db:
        try:
            # 1. Find the corresponding message
            stmt = select(SMSMessage).where(SMSMessage.provider_msg_id == provider_msg_id)
            result = await db.execute(stmt)
            msg = result.scalar_one_or_none()
            previous_status = msg.status if msg else None
            
            # Map Arkesel / SMPP delivery states to internal MessageStatus.
            # Arkesel webhook values documented by the provider:
            # DELIVERED, SUBMITTED, PROHIBITED, QUEUED, NOT_DELIVERED, EXPIRED
            status_map = {
                # Standard SMPP stats
                "DELIVRD": MessageStatus.DELIVERED,
                "EXPIRED": MessageStatus.NOT_DELIVERED,
                "UNDELIV": MessageStatus.NOT_DELIVERED,
                "ACCEPTD": MessageStatus.SUBMITTED,
                "REJECTD": MessageStatus.NOT_DELIVERED,
                "DELETED": MessageStatus.NOT_DELIVERED,
                
                # Arkesel & Webhook string stats
                "DELIVERED": MessageStatus.DELIVERED,
                "SUBMITTED": MessageStatus.SUBMITTED,
                "QUEUED": MessageStatus.SUBMITTED,
                "PROHIBITED": MessageStatus.NOT_DELIVERED,
                "NOT_DELIVERED": MessageStatus.NOT_DELIVERED,
                "UNDELIVERED": MessageStatus.NOT_DELIVERED,
                "FAILED": MessageStatus.NOT_DELIVERED,
                "REJECTED": MessageStatus.NOT_DELIVERED,
            }
            
            new_status = status_map.get(stat)
            
            # 2. Create the raw audit log (always, regardless of whether we recognize the status)
            log_entry = DeliveryReportLog(
                raw_content=dlr_data.get("raw"),
                provider_msg_id=provider_msg_id,
                stat=stat,
                err=dlr_data.get("err"),
                sub=dlr_data.get("sub"),
                dlvrd=dlr_data.get("dlvrd"),
                sms_message_id=msg.id if msg else None
            )
            db.add(log_entry)

            # 3. Update SMSMessage if found and status is recognized
            if msg:
                if new_status is None:
                    # Unknown status string from the provider — log and skip the update.
                    # Do NOT default to SUBMITTED: that would silently keep the message
                    # alive in the poller queue for an unrecognized reason.
                    logger.warning(
                        f"[DLR] Unrecognized status '{stat}' for provider_msg_id={provider_msg_id} "
                        f"(msg_id={msg.id}). Audit log written but msg status NOT changed."
                    )
                else:
                    msg.status = new_status
                    if new_status == MessageStatus.DELIVERED:
                        msg.delivered_at = datetime.utcnow()
                    elif new_status in [MessageStatus.FAILED, MessageStatus.NOT_DELIVERED]:
                        if dlr_data.get("err"):
                            msg.error_message = str(dlr_data.get("err"))
                    logger.info(f"Updated msg_id={msg.id} to status={new_status} via DLR")

                    # Check if refund is needed for failed deliveries
                    if new_status in [MessageStatus.FAILED, MessageStatus.NOT_DELIVERED]:
                        from app.services.billing_service import billing_service
                        await billing_service.refund_failed_sms(db, msg.id)

                if msg.campaign_id:
                    await refresh_campaign_delivery_status(db, msg.campaign_id)
                
                # BROADCAST UPDATE (WebSocket & Webhook)
                try:
                    from app.core.websocket import manager
                    from app.services.webhook_service import webhook_service

                    await manager.broadcast_to_org(msg.organization_id, {
                        "type": "message_updated",
                        "data": {
                            "id": msg.id,
                            "status": msg.status,
                            "recipient": msg.recipient
                        }
                    })

                    # Dispatch Webhook
                    event = None
                    if msg.status == MessageStatus.DELIVERED:
                        event = "message.delivered"
                    elif msg.status == MessageStatus.SUBMITTED and previous_status != MessageStatus.SUBMITTED:
                        event = "message.submitted"
                    elif msg.status in [MessageStatus.FAILED, MessageStatus.NOT_DELIVERED]:
                        event = "message.failed"

                    if event:
                        asyncio.create_task(webhook_service.dispatch_message_event(msg.id, event))

                except Exception as e:
                    logger.error(f"Broadcasting failed for DLR: {str(e)}")
            else:
                logger.warning(f"DLR received for unknown provider_msg_id={provider_msg_id}")

            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.error(f"Error processing DLR for {provider_msg_id}: {str(e)}")
            raise
