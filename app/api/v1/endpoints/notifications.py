from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.api import deps
from app.db.database import get_db
from app.db.models import User, Notification
from app.schemas.schemas import NotificationResponse

router = APIRouter()

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Get all notifications for the current user."""
    stmt = select(Notification).where(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_as_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Mark a notification as read."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    )
    result = await db.execute(stmt)
    db_obj = result.scalar_one_or_none()
    
    if not db_obj:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    db_obj.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}

@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Mark all notifications as read."""
    stmt = update(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).values(is_read=True)
    await db.execute(stmt)
    await db.commit()
    return {"message": "All notifications marked as read"}
