from datetime import datetime, timedelta
from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.api import deps
from app.db.database import get_db
from app.db.models import User, SMSMessage, MessageStatus

router = APIRouter()

@router.get("/stats")
async def get_analytics_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get aggregated statistics for dashboard charts.
    """
    now = datetime.utcnow()
    last_7_days = now - timedelta(days=7)

    # 1. Activity (Messages per day for last 7 days)
    activity_query = (
        select(
            func.date(SMSMessage.created_at).label("day"),
            func.count(SMSMessage.id).label("count")
        )
        .where(
            SMSMessage.organization_id == current_user.organization_id,
            SMSMessage.created_at >= last_7_days
        )
        .group_by(func.date(SMSMessage.created_at))
        .order_by(func.date(SMSMessage.created_at))
    )
    activity_result = await db.execute(activity_query)
    activity_data = [{"day": row.day.isoformat(), "count": row.count} for row in activity_result]

    # 2. Success Rate (Delivered vs Failed)
    success_query = (
        select(
            SMSMessage.status,
            func.count(SMSMessage.id).label("count")
        )
        .where(SMSMessage.organization_id == current_user.organization_id)
        .group_by(SMSMessage.status)
    )
    success_result = await db.execute(success_query)
    success_stats = {row.status: row.count for row in success_result}

    # 3. Network Breakdown
    network_query = (
        select(
            SMSMessage.provider_name,
            func.count(SMSMessage.id).label("count")
        )
        .where(SMSMessage.organization_id == current_user.organization_id)
        .group_by(SMSMessage.provider_name)
    )
    network_result = await db.execute(network_query)
    network_data = {row.provider_name: row.count for row in network_result}

    return {
        "activity": activity_data,
        "success_rate": {
            "delivered": success_stats.get(MessageStatus.DELIVERED, 0),
            "failed": success_stats.get(MessageStatus.FAILED, 0),
            "pending": success_stats.get(MessageStatus.PENDING, 0) + success_stats.get(MessageStatus.SENT, 0)
        },
        "networks": network_data
    }
