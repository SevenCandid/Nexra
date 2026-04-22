import asyncio
import logging
from datetime import datetime
from app.db.session import SessionLocal
from app.db.models import SMSMessage, MessageStatus, DeliveryReportLog
from sqlalchemy.future import select

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
    stat = dlr_data.get("stat")
    
    if not provider_msg_id:
        logger.error("DLR data missing provider_msg_id")
        return

    async with SessionLocal() as db:
        try:
            # 1. Find the corresponding message
            stmt = select(SMSMessage).where(SMSMessage.provider_msg_id == provider_msg_id)
            result = await db.execute(stmt)
            msg = result.scalar_one_or_none()
            
            # Map SMPP status to internal MessageStatus
            # Standard SMPP stats: DELIVRD, EXPIRED, DELETED, UNDELIV, ACCEPTD, UNKNOWN, REJECTD
            status_map = {
                "DELIVRD": MessageStatus.DELIVERED,
                "EXPIRED": MessageStatus.EXPIRED,
                "UNDELIV": MessageStatus.UNDELIVERABLE,
                "REJECTD": MessageStatus.FAILED,
                "DELETED": MessageStatus.FAILED,
            }
            
            new_status = status_map.get(stat, MessageStatus.SENT)
            
            # 2. Create the raw audit log
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

            # 3. Update SMSMessage if found
            if msg:
                msg.status = new_status
                if new_status == MessageStatus.DELIVERED:
                    msg.delivered_at = datetime.utcnow()
                logger.info(f"Updated msg_id={msg.id} to status={new_status} via DLR")

                # Check if refund is needed for failed deliveries
                if new_status in [MessageStatus.FAILED, MessageStatus.EXPIRED, MessageStatus.UNDELIVERABLE]:
                    from app.services.billing_service import billing_service
                    await billing_service.refund_failed_sms(db, msg.id)
                
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
                    event = "message.delivered" if msg.status == MessageStatus.DELIVERED else "message.failed"
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
