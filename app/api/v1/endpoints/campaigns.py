from datetime import datetime, timedelta
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.db.models import User, Contact, Campaign, SMSMessage, MessageStatus, CampaignStatus, ContactGroup, contact_group_association
from app.db.database import get_db
from app.api import deps
from app.schemas.schemas import CampaignCreate, CampaignResponse, CampaignListResponse, MessageStats
from app.core.queue import enqueue_sms, enqueue_batch
from app.services.gateway_manager import gateway_manager

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("", response_model=CampaignListResponse)
async def get_campaigns(
    status: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List campaigns for the organization with search and filtering.
    """
    # Build query
    base_query = select(Campaign).where(Campaign.organization_id == current_user.organization_id)
    
    if q:
        base_query = base_query.where(Campaign.name.ilike(f"%{q}%"))
        
    if status:
        if status == 'delivering' or status == 'pending':
            base_query = base_query.where(Campaign.status.in_(['draft', 'scheduled', 'sending', 'delivering']))
        elif status == 'delivered' or status == 'completed':
            base_query = base_query.where(Campaign.status == 'completed')
        elif status == 'failed':
            base_query = base_query.where(Campaign.status.in_(['failed', 'cancelled']))
        else:
            base_query = base_query.where(Campaign.status == status)

    # Get total count for pagination
    count_query = select(func.count()).select_from(base_query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get items with ordering and pagination
    query = base_query.order_by(Campaign.id.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    campaigns = result.scalars().all()
    
    return CampaignListResponse(items=campaigns, total=total)

@router.post("", response_model=CampaignResponse)
async def create_campaign(
    campaign_in: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Create a new campaign and store contact associations for later broadcast.
    """
    # 0. Validate Sender ID (Must be approved for this org)
    from app.db.models import SenderID, SenderIDStatus
    s_query = select(SenderID).where(
        SenderID.sender_id == campaign_in.sender,
        SenderID.organization_id == current_user.organization_id,
        SenderID.status == SenderIDStatus.APPROVED
    )
    s_result = await db.execute(s_query)
    if not s_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400, 
            detail=f"Sender ID '{campaign_in.sender}' is not approved. Please request approval in settings."
        )

    # 0.5 Resolve groups to contacts if any
    all_contact_ids = set(campaign_in.contact_ids)
    if campaign_in.group_ids:
        # Resolve contacts from valid groups
        group_stmt = select(contact_group_association.c.contact_id).join(
            ContactGroup, ContactGroup.id == contact_group_association.c.group_id
        ).where(
            ContactGroup.id.in_(campaign_in.group_ids),
            ContactGroup.organization_id == current_user.organization_id
        )
        group_res = await db.execute(group_stmt)
        for row in group_res:
            all_contact_ids.add(row[0])
            
    unique_contact_ids = list(all_contact_ids)

    # Create Campaign record (SCHEDULED if time provided, else DRAFT)
    status = CampaignStatus.SCHEDULED if campaign_in.scheduled_at else CampaignStatus.DRAFT
    db_obj = Campaign(
        name=campaign_in.name,
        sender=campaign_in.sender,
        template=campaign_in.template,
        scheduled_at=campaign_in.scheduled_at,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        contact_ids=unique_contact_ids, # Save the resolved unique IDs
        group_ids=campaign_in.group_ids,   # Save the original group selection
        status=status,
        total_recipients=len(unique_contact_ids)
    )
    db.add(db_obj)
    await db.flush() # Get the ID before creating messages
    
    # 1. Fetch Contacts to create associated messages
    stmt = select(Contact).where(
        Contact.id.in_(unique_contact_ids),
        Contact.organization_id == current_user.organization_id
    )
    result = await db.execute(stmt)
    contacts = result.scalars().all()
    
    # 2. Create individual PENDING SMSMessage records upfront
    for contact in contacts:
        # Personalize message 
        f_name = (contact.first_name or "").strip()
        l_name = (contact.last_name or "").strip()
        full_name = f"{f_name} {l_name}".strip()
        
        # Fallback for {name}
        display_name = full_name if full_name else (f_name if f_name else contact.phone_number)

        content = db_obj.template
        content = content.replace("{first_name}", f_name)
        content = content.replace("{last_name}", l_name)
        content = content.replace("{name}", display_name)
        content = content.replace("{phone_number}", contact.phone_number)
        
        msg = SMSMessage(
            sender=db_obj.sender,
            recipient=contact.phone_number,
            content=content,
            status=MessageStatus.PENDING,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            campaign_id=db_obj.id,
            provider_name="Arkesel"
        )
        db.add(msg)
    
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get a specific campaign by ID.
    """
    stmt = select(Campaign).where(Campaign.id == campaign_id, Campaign.organization_id == current_user.organization_id)
    result = await db.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    return campaign

@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    campaign_in: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Update an existing campaign. Only possible if not yet completed.
    """
    stmt = select(Campaign).where(Campaign.id == campaign_id, Campaign.organization_id == current_user.organization_id)
    result = await db.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot edit a completed campaign")

    campaign.name = campaign_in.name
    campaign.template = campaign_in.template
    campaign.scheduled_at = campaign_in.scheduled_at
    
    # Auto-set status if scheduled
    if campaign.scheduled_at and campaign.status in [CampaignStatus.DRAFT.value, CampaignStatus.SCHEDULED.value]:
        campaign.status = CampaignStatus.SCHEDULED.value
    elif not campaign.scheduled_at and campaign.status == CampaignStatus.SCHEDULED.value:
        campaign.status = CampaignStatus.DRAFT.value

    await db.commit()
    await db.refresh(campaign)
    return campaign

@router.post("/{campaign_id}/broadcast")
async def broadcast_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Manually trigger the broadcast for a draft/scheduled campaign.
    Checks for gateway availability before starting.
    """
    # 1. Fetch Campaign
    stmt = select(Campaign).where(Campaign.id == campaign_id, Campaign.organization_id == current_user.organization_id)
    result = await db.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status in [CampaignStatus.SENDING, CampaignStatus.COMPLETED]:
        raise HTTPException(status_code=400, detail=f"Campaign is already {campaign.status}")

    # 2. Check Gateway Availability (Pre-flight)
    # For now, we check the default route for a sample or just general readiness
    ready = gateway_manager.is_provider_ready("Arkesel")
    if not ready:
        # 1. Mark Campaign as FAILED
        campaign.status = CampaignStatus.FAILED
        
        # 2. Mark all PENDING messages for this campaign as FAILED
        msg_stmt = (
            select(SMSMessage)
            .where(SMSMessage.campaign_id == campaign_id, SMSMessage.status == MessageStatus.PENDING)
        )
        msg_result = await db.execute(msg_stmt)
        pending_messages = msg_result.scalars().all()
        for msg in pending_messages:
            msg.status = MessageStatus.FAILED
            
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Primary SMS Gateway is offline. All messages marked as failed. Please check connections before retrying."
        )

    # 3. Determine if immediate or scheduled
    now = datetime.utcnow()
    is_immediate = True
    if campaign.scheduled_at and campaign.scheduled_at > now + timedelta(minutes=1):
        is_immediate = False
        campaign.status = CampaignStatus.SCHEDULED
        logger.info(f"Campaign {campaign.id} scheduled for {campaign.scheduled_at}")
    else:
        campaign.status = CampaignStatus.SENDING
        logger.info(f"Campaign {campaign.id} starting immediate broadcast")

    await db.commit()
    
    # 4. Trigger Worker if immediate
    if is_immediate:
        # Enqueue the batch process
        from app.core.queue import enqueue_batch
        await enqueue_batch(campaign.id)
    
    return {
        "message": "Broadcast scheduled successfully" if not is_immediate else "Broadcast started successfully",
        "status": campaign.status
    }

@router.post("/{campaign_id}/retry")
async def retry_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Retry all failed messages in a campaign.
    """
    # 1. Verify campaign ownership
    stmt = select(Campaign).where(Campaign.id == campaign_id, Campaign.organization_id == current_user.organization_id)
    result = await db.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # 2. Find all failed messages for this campaign
    msg_stmt = select(SMSMessage).where(
        SMSMessage.campaign_id == campaign_id,
        SMSMessage.status.in_([MessageStatus.FAILED.value, MessageStatus.NOT_DELIVERED.value])
    )
    msg_result = await db.execute(msg_stmt)
    failed_messages = msg_result.scalars().all()
    
    if not failed_messages:
        return {"message": "No failed messages found for this campaign."}

    # 3. Reset and re-enqueue
    for msg in failed_messages:
        msg.status = MessageStatus.PENDING
        msg.retry_count = 0
        await db.commit() # Commit each to be safe for background task
        await enqueue_sms(msg.id)

    return {"message": f"Successfully re-enqueued {len(failed_messages)} messages for retry."}

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Delete a campaign and all its associated messages.
    """
    stmt = select(Campaign).where(
        Campaign.id == campaign_id,
        Campaign.organization_id == current_user.organization_id
    )
    result = await db.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Delete associated messages explicitly
    msg_delete_stmt = delete(SMSMessage).where(SMSMessage.campaign_id == campaign_id)
    await db.execute(msg_delete_stmt)
    
    await db.delete(campaign)
    await db.commit()
    return {"message": "Campaign and associated messages deleted successfully"}
@router.get("/{campaign_id}/stats", response_model=MessageStats)
async def get_campaign_stats(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get message statistics for a specific campaign.
    """
    # Verify campaign belongs to org
    c_stmt = select(Campaign).where(
        Campaign.id == campaign_id,
        Campaign.organization_id == current_user.organization_id
    )
    c_res = await db.execute(c_stmt)
    if not c_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    async def get_count(status: Optional[str] = None):
        query = select(func.count(SMSMessage.id)).where(
            SMSMessage.campaign_id == campaign_id,
            SMSMessage.organization_id == current_user.organization_id
        )
        if status:
            query = query.where(SMSMessage.status == status)
        result = await db.execute(query)
        return result.scalar() or 0

    return MessageStats(
        total=await get_count(),
        submitted=await get_count(MessageStatus.SUBMITTED),
        delivered=await get_count(MessageStatus.DELIVERED),
        pending=(await get_count(MessageStatus.PENDING)) + (await get_count(MessageStatus.PROCESSING)),
        failed=(
            await get_count(MessageStatus.FAILED)
            + await get_count(MessageStatus.NOT_DELIVERED)
        )
    )

@router.get("/{campaign_id}/recipients")
async def get_campaign_recipients(
    campaign_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Return a paginated list of all SMS recipients for a campaign,
    including message_id, phone number, name, delivery status, and error info.
    """
    c_stmt = select(Campaign).where(
        Campaign.id == campaign_id,
        Campaign.organization_id == current_user.organization_id
    )
    c_res = await db.execute(c_stmt)
    campaign = c_res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    count_stmt = select(func.count(SMSMessage.id)).where(
        SMSMessage.campaign_id == campaign_id,
        SMSMessage.organization_id == current_user.organization_id
    )
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0

    msg_stmt = (
        select(SMSMessage)
        .where(
            SMSMessage.campaign_id == campaign_id,
            SMSMessage.organization_id == current_user.organization_id,
        )
        .order_by(SMSMessage.id.asc())
        .offset(skip)
        .limit(limit)
    )
    msg_res = await db.execute(msg_stmt)
    messages = msg_res.scalars().all()

    # Build phone -> contact name map
    contact_ids = campaign.contact_ids or []
    name_map = {}
    if contact_ids:
        contacts_stmt = select(Contact).where(
            Contact.id.in_(contact_ids),
            Contact.organization_id == current_user.organization_id
        )
        contacts_res = await db.execute(contacts_stmt)
        for c in contacts_res.scalars().all():
            full = f"{c.first_name or ''} {c.last_name or ''}".strip()
            name_map[c.phone_number] = full or None

    items = [
        {
            "id": msg.id,
            "phone": msg.recipient,
            "name": name_map.get(msg.recipient),
            "status": msg.status,
            "error_message": msg.error_message,
            "retry_count": msg.retry_count,
            "sent_at": msg.created_at.isoformat() if msg.created_at else None,
        }
        for msg in messages
    ]

    return {"items": items, "total": total}


@router.post("/{campaign_id}/messages/{message_id}/retry")
async def retry_single_message(
    campaign_id: int,
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Retry a single failed message by its ID."""
    stmt = select(SMSMessage).where(
        SMSMessage.id == message_id,
        SMSMessage.campaign_id == campaign_id,
        SMSMessage.organization_id == current_user.organization_id
    )
    res = await db.execute(stmt)
    msg = res.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.status not in (MessageStatus.FAILED.value, MessageStatus.NOT_DELIVERED.value):
        raise HTTPException(status_code=400, detail=f"Message is not in a failed state (current: {msg.status})")

    msg.status = MessageStatus.PENDING
    msg.retry_count = (msg.retry_count or 0) + 1
    msg.error_message = None
    await db.commit()
    await enqueue_sms(msg.id)
    return {"message": "Message re-enqueued for delivery."}


class RetrySelectedRequest(BaseModel):
    message_ids: List[int]

@router.post("/{campaign_id}/messages/retry-selected")
async def retry_selected_messages(
    campaign_id: int,
    body: RetrySelectedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Retry a specific selection of failed message IDs from a campaign."""
    if not body.message_ids:
        raise HTTPException(status_code=400, detail="No message IDs provided.")

    stmt = select(SMSMessage).where(
        SMSMessage.id.in_(body.message_ids),
        SMSMessage.campaign_id == campaign_id,
        SMSMessage.organization_id == current_user.organization_id,
        SMSMessage.status.in_([MessageStatus.FAILED.value, MessageStatus.NOT_DELIVERED.value])
    )
    res = await db.execute(stmt)
    messages = res.scalars().all()

    if not messages:
        return {"message": "No failed messages found for the given IDs."}

    count = 0
    for msg in messages:
        msg.status = MessageStatus.PENDING
        msg.retry_count = (msg.retry_count or 0) + 1
        msg.error_message = None
        count += 1

    await db.commit()
    for msg in messages:
        await enqueue_sms(msg.id)

    return {"message": f"Successfully re-enqueued {count} messages for retry."}
