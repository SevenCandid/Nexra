import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.db.database import SessionLocal
from app.db.models import SMSMessage, MessageStatus, Organization, Campaign, CampaignStatus
from app.services.gateway_manager import gateway_manager
from app.services.rate_limiter import RateLimiter
from app.core.queue import enqueue_sms
from app.services.campaign_status import refresh_campaign_delivery_status

logger = logging.getLogger(__name__)

async def _refund_failed_message(db, msg: SMSMessage) -> None:
    """Refund a message that has reached a terminal failed state."""
    from app.services.billing_service import billing_service

    refunded = await billing_service.refund_failed_sms(db, msg.id)
    if refunded:
        logger.info(f"Refunded failed SMS msg_id={msg.id}")
    else:
        logger.info(f"No refund applied for failed SMS msg_id={msg.id}")

def process_sms_job(sms_id: int):
    """Entry point for RQ worker."""
    asyncio.run(_async_process_sms(sms_id))

async def _async_process_sms(sms_id: int):
    """Core async logic for sending an SMS with the new status flow."""
    async with SessionLocal() as db:
        # 1. Fetch message and organization
        stmt = (
            select(SMSMessage)
            .options(selectinload(SMSMessage.organization).selectinload(Organization.plan))
            .where(SMSMessage.id == sms_id)
        )
        result = await db.execute(stmt)
        msg = result.scalar_one_or_none()

        if not msg or msg.status in [MessageStatus.SUBMITTED, MessageStatus.DELIVERED]:
            return

        org = msg.organization
        
        # 2. Mark as PROCESSING (First step in the new flow)
        msg.status = MessageStatus.PROCESSING
        await db.commit()

        # 3. Billing & Rate Limiting
        try:
            from app.services.billing_service import billing_service
            cost = await billing_service.calculate_sms_cost(db, msg.recipient, msg.content, org)

            # Check Rate Limit (TPS)
            tps_limit = org.plan.features.get("tps_limit", 5) if org.plan else 5
            if not await RateLimiter.is_allowed(f"org:{org.id}", limit=tps_limit):
                # Throttled — reset to PENDING so the retry_worker picks it up.
                # Do NOT mark as FAILED: this is a transient queue condition, not a delivery failure.
                # Do NOT fire message.failed webhook: it hasn't been attempted yet.
                msg.status = MessageStatus.PENDING
                msg.next_retry_at = datetime.utcnow() + timedelta(minutes=1)
                await db.commit()
                logger.info(f"[RATE-LIMIT] msg_id={msg.id} re-queued as PENDING, retry at {msg.next_retry_at}")
                return

            allow_payg = True
            if msg.campaign_id:
                camp_stmt = select(Campaign).where(Campaign.id == msg.campaign_id)
                camp_res = await db.execute(camp_stmt)
                campaign = camp_res.scalar_one_or_none()
                if campaign and campaign.meta_data and isinstance(campaign.meta_data, dict):
                    allow_payg = campaign.meta_data.get("use_payg", True)

            success, error = await billing_service.deduct_credits_for_sms(
                db, org.id, msg.id, cost, msg.user_id, allow_payg=allow_payg
            )

            if not success:
                msg.status = MessageStatus.FAILED
                msg.error_message = error
                await db.commit()
                return

        except Exception as e:
            logger.error(f"Pre-send error for msg_id={msg.id}: {str(e)}")
            msg.status = MessageStatus.FAILED
            await db.commit()
            return

        # 4. Hand off to Gateway (Mark as SENT/PROCESSED if successful)
        try:
            # We use "message" in the send_sms call as per current GatewayManager signature
            result = await gateway_manager.send_sms(
                recipient=msg.recipient,
                sender=msg.sender,
                content=msg.content,
                provider_name=msg.provider_name
            )

            if result.get("status") == "success":
                # Arkesel accepted it. In your flow, this is "SENT" (Waiting for DLR)
                msg.status = MessageStatus.SUBMITTED
                msg.provider_msg_id = result.get("provider_msg_id")
                msg.sent_at = datetime.utcnow()
                logger.info(f"Message {msg.id} sent to provider successfully")
            else:
                msg.status = MessageStatus.FAILED
                msg.error_message = result.get("message", "Provider rejected message")
                await _refund_failed_message(db, msg)

            if msg.campaign_id:
                await refresh_campaign_delivery_status(db, msg.campaign_id)
            
            await db.commit()
            
            # BROADCAST UPDATE (WebSocket & Webhook)
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
            event = "message.sent" if msg.status == MessageStatus.SUBMITTED else "message.failed"
            asyncio.create_task(webhook_service.dispatch_message_event(msg.id, event))

        except Exception as e:
            logger.error(f"Gateway error for msg_id={msg.id}: {str(e)}")
            msg.status = MessageStatus.FAILED
            msg.error_message = f"Gateway Error: {str(e)}"
            await _refund_failed_message(db, msg)
            if msg.campaign_id:
                await refresh_campaign_delivery_status(db, msg.campaign_id)
            await db.commit()
            
            from app.core.websocket import manager
            from app.services.webhook_service import webhook_service
            
            # BROADCAST UPDATE (WebSocket & Webhook)
            await manager.broadcast_to_org(msg.organization_id, {
                "type": "message_updated",
                "data": {
                    "id": msg.id,
                    "status": msg.status,
                    "recipient": msg.recipient
                }
            })
            asyncio.create_task(webhook_service.dispatch_message_event(msg.id, "message.failed"))

async def process_campaign_batch(campaign_id: int):
    """Processes a campaign batch and updates campaign status."""
    async with SessionLocal() as db:
        stmt = select(Campaign).where(Campaign.id == campaign_id)
        result = await db.execute(stmt)
        campaign = result.scalar_one_or_none()
        
        if not campaign or campaign.status == CampaignStatus.COMPLETED:
            return

        # Start processing
        campaign.status = CampaignStatus.SENDING
        await db.commit()

        # Fetch pending messages
        stmt = select(SMSMessage).where(
            SMSMessage.campaign_id == campaign_id, 
            SMSMessage.status == MessageStatus.PENDING
        )
        result = await db.execute(stmt)
        messages = result.scalars().all()

        for msg in messages:
            await enqueue_sms(msg.id)

        # After enqueuing, the campaign is "DELIVERING" (waiting for all to be SENT/DELIVERED)
        campaign.status = CampaignStatus.DELIVERING
        await db.commit()
        logger.info(f"Campaign '{campaign.name}' moved to DELIVERING")
