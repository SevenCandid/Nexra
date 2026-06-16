from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.api import deps
from app.db.models import User, SMSMessage, MessageStatus
from app.db.database import get_db
from app.schemas.schemas import MessageStats, MessageListResponse

router = APIRouter()

@router.get("", response_model=MessageListResponse)
async def get_messages(
    status: Optional[str] = None,
    campaign_id: Optional[int] = None,
    limit: int = 50,
    skip: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List messages for the organization with optional status filtering.
    """
    query = select(SMSMessage).where(SMSMessage.organization_id == current_user.organization_id)
    
    if status:
        query = query.where(SMSMessage.status == status)
    if campaign_id:
        query = query.where(SMSMessage.campaign_id == campaign_id)
    
    # Count total
    count_query = select(func.count(SMSMessage.id)).where(SMSMessage.organization_id == current_user.organization_id)
    if status:
        count_query = count_query.where(SMSMessage.status == status)
    if campaign_id:
        count_query = count_query.where(SMSMessage.campaign_id == campaign_id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get items
    query = query.order_by(SMSMessage.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return MessageListResponse(items=items, total=total)

@router.get("/stats", response_model=MessageStats)
async def get_message_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get message statistics for the organization.
    """
    # Helper to count messages by status
    async def get_count(status: str = None):
        query = select(func.count(SMSMessage.id)).where(SMSMessage.organization_id == current_user.organization_id)
        if status:
            query = query.where(SMSMessage.status == status)
        result = await db.execute(query)
        return result.scalar() or 0

    total = await get_count()
    sent = await get_count(MessageStatus.SUBMITTED)
    delivered = await get_count(MessageStatus.DELIVERED)
    pending = await get_count(MessageStatus.PENDING)
    failed = (
        await get_count(MessageStatus.FAILED)
        + await get_count(MessageStatus.EXPIRED)
        + await get_count(MessageStatus.UNDELIVERABLE)
    )
    
    return MessageStats(
        total=total,
        sent=sent,
        delivered=delivered,
        pending=pending,
        failed=failed
    )

@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Delete a specific message log.
    """
    stmt = select(SMSMessage).where(
        SMSMessage.id == message_id,
        SMSMessage.organization_id == current_user.organization_id
    )
    result = await db.execute(stmt)
    message = result.scalar_one_or_none()
    
    if not message:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Message not found")
        
    await db.delete(message)
    await db.commit()
    return {"message": "Message deleted successfully"}

@router.delete("/purge/pending")
async def purge_pending_messages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Purge all pending messages for the organization.
    """
    from sqlalchemy import delete
    stmt = delete(SMSMessage).where(
        SMSMessage.organization_id == current_user.organization_id,
        SMSMessage.status == MessageStatus.PENDING
    )
    result = await db.execute(stmt)
    await db.commit()
    return {"message": f"Purged {result.rowcount} pending messages"}
