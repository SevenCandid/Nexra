import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.database import SessionLocal
from app.db.models import SMSMessage, MessageStatus, Organization, Campaign, Contact, CampaignStatus
from app.services.gateway_manager import gateway_manager
from app.services.rate_limiter import RateLimiter
from app.core.queue import enqueue_sms

logger = logging.getLogger(__name__)

def process_sms_job(sms_id: int):
    """Entry point for RQ worker (Synchronous, but runs our async logic)."""
    asyncio.run(_async_process_sms(sms_id))

async def _async_process_sms(sms_id: int):
    """Core async logic for sending an SMS."""
    async with SessionLocal() as db:
        # 1. Fetch message and organization/plan details
        stmt = (
            select(SMSMessage)
            .options(selectinload(SMSMessage.organization).selectinload(Organization.plan))
            .where(SMSMessage.id == sms_id)
        )
        result = await db.execute(stmt)
        msg = result.scalar_one_or_none()
        
        if not msg or msg.status in [MessageStatus.SENT, MessageStatus.DELIVERED]:
            return

        org = msg.organization
        
        # 2. Check Organization Rate Limit (TPS)
        # Based on Subscription Plan or a default
        tps_limit = org.plan.features.get("tps_limit", 5) if org.plan else 5
        
        if not await RateLimiter.is_allowed(f"org:{org.id}", limit=tps_limit):
            logger.warning(f"Organization {org.id} throttled. Retrying job later.")
            raise Exception(f"Rate limit exceeded for organization {org.id}")

        # 3. Calculate SMS cost and deduct credits
        from app.services.billing_service import billing_service
        from decimal import Decimal
        
        try:
            # Calculate cost
            cost = await billing_service.calculate_sms_cost(db, msg.recipient, org)
            
            # Deduct credits BEFORE sending
            success, error = await billing_service.deduct_credits_for_sms(
                db, 
                org.id, 
                msg.id, 
                cost,
                msg.user_id
            )
            
            if not success:
                msg.status = MessageStatus.FAILED
                await db.commit()
                logger.error(f"Insufficient balance for msg_id={msg.id}: {error}")
                return
            
        except Exception as e:
            logger.error(f"Billing error for msg_id={msg.id}: {str(e)}")
            msg.status = MessageStatus.FAILED
            await db.commit()
            return

        # 4. Process Sending
        try:
            # Re-confirm route
            provider_name = await gateway_manager.route_message(msg.recipient)
            
            # Check MNO Rate Limit (if applicable)
            # This is globally handled by GatewayManager in production, 
            # but we can add a check here too.
            
            provider_msg_id = await gateway_manager.send_sms(
                recipient=msg.recipient,
                sender=msg.sender,
                message=msg.content
            )

            if provider_msg_id:
                msg.status = MessageStatus.SENT
                msg.provider_msg_id = provider_msg_id
                msg.sent_at = datetime.utcnow()
                logger.info(f"Worker sent msg_id={msg.id} successfully")
            else:
                msg.status = MessageStatus.FAILED
                logger.error(f"Worker failed to send msg_id={msg.id} (Gateway returned None)")
                # No exception raised here to allow commit of FAILED status
            
            await db.commit()
        except Exception as e:
            logger.error(f"Error in SMS worker for msg_id={msg.id}: {str(e)}")
            # Critical: Ensure FAILED status is saved even on unexpected exception
            try:
                msg.status = MessageStatus.FAILED
                await db.commit()
            except:
                await db.rollback()
                # Last resort: separate session to force failure status
                async with SessionLocal() as fail_db:
                    fail_msg = await fail_db.get(SMSMessage, sms_id)
                    if fail_msg:
                        fail_msg.status = MessageStatus.FAILED
                        await fail_db.commit()

async def process_campaign_batch(campaign_id: int):
    """
    Logic for processing a large batch of messages from a campaign.
    - Fetches the campaign and its organization.
    - Gets all contacts associated with the campaign (or organization).
    - Creates individual SMSMessage records and enqueues them.
    """
    async with SessionLocal() as db:
        # 1. Fetch Campaign
        stmt = select(Campaign).where(Campaign.id == campaign_id)
        result = await db.execute(stmt)
        campaign = result.scalar_one_or_none()
        
        if not campaign or campaign.status == CampaignStatus.COMPLETED:
            return

        if campaign.status != CampaignStatus.SENDING:
            logger.warning(f"Campaign {campaign_id} is in {campaign.status} status. Skipping batch processing.")
            return

        await db.commit()

        # 2. Fetch existing PENDING messages for this campaign
        stmt = (
            select(SMSMessage)
            .where(SMSMessage.campaign_id == campaign_id, SMSMessage.status == MessageStatus.PENDING)
        )
        result = await db.execute(stmt)
        messages = result.scalars().all()

        logger.info(f"Processing campaign '{campaign.name}' with {len(messages)} pending messages")

        # 3. Enqueue existing messages
        for msg in messages:
            # Enqueue individual SMS job
            await enqueue_sms(msg.id)

        campaign.status = CampaignStatus.COMPLETED
        await db.commit()
        logger.info(f"Campaign '{campaign.name}' processing complete")
