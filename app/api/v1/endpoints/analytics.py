from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.api import deps
from app.db.database import get_db
from app.db.models import User, SMSMessage, MessageStatus, BillingLedger, Wallet, LedgerType, UserRole
from fastapi import HTTPException, status

router = APIRouter()

@router.get("/stats")
async def get_analytics_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get aggregated statistics for dashboard charts with date filtering.
    """
    now = datetime.utcnow()
    # Default to last 7 days if no dates provided
    if not start_date:
        start_date = now - timedelta(days=7)
    if not end_date:
        end_date = now

    # 1. Activity (Messages per day)
    activity_query = (
        select(
            func.date(SMSMessage.created_at).label("day"),  # type: ignore
            func.count(SMSMessage.id).label("count")  # type: ignore
        )
        .where(
            SMSMessage.organization_id == current_user.organization_id,
            SMSMessage.created_at >= start_date,
            SMSMessage.created_at <= end_date
        )
        .group_by(func.date(SMSMessage.created_at))  # type: ignore
        .order_by(func.date(SMSMessage.created_at))  # type: ignore
    )
    activity_result = await db.execute(activity_query)
    activity_data = [{"day": row.day.isoformat(), "count": row.count} for row in activity_result]

    # 2. Success Rate (Delivered vs Failed) within the range
    success_query = (
        select(
            SMSMessage.status,
            func.count(SMSMessage.id).label("count")  # type: ignore
        )
        .where(
            SMSMessage.organization_id == current_user.organization_id,
            SMSMessage.created_at >= start_date,
            SMSMessage.created_at <= end_date
        )
        .group_by(SMSMessage.status)
    )
    success_result = await db.execute(success_query)
    success_stats = {row.status: row.count for row in success_result}

    # 3. Network Breakdown within the range
    network_query = (
        select(
            SMSMessage.provider_name,
            func.count(SMSMessage.id).label("count")  # type: ignore
        )
        .where(
            SMSMessage.organization_id == current_user.organization_id,
            SMSMessage.created_at >= start_date,
            SMSMessage.created_at <= end_date
        )
        .group_by(SMSMessage.provider_name)
    )
    network_result = await db.execute(network_query)
    network_data = {row.provider_name: row.count for row in network_result}

    # 4. Delivery Speed (Average)
    speed_query = (
        select(
            func.avg(
                func.julianday(SMSMessage.delivered_at) - func.julianday(SMSMessage.sent_at)
            ) * 86400 # Convert to seconds
        )
        .where(
            SMSMessage.organization_id == current_user.organization_id,
            SMSMessage.status == MessageStatus.DELIVERED,
            SMSMessage.created_at >= start_date,
            SMSMessage.created_at <= end_date,
            SMSMessage.delivered_at.is_not(None),
            SMSMessage.sent_at.is_not(None)
        )
    )
    speed_result = await db.execute(speed_query)
    avg_speed = speed_result.scalar() or 0

    return {
        "activity": activity_data,
        "success_rate": {
            "delivering": (success_stats.get(MessageStatus.PENDING, 0) + 
                           success_stats.get(MessageStatus.PROCESSING, 0)),
            "completed": success_stats.get(MessageStatus.SENT, 0),
            "delivered": success_stats.get(MessageStatus.DELIVERED, 0),
            "failed": success_stats.get(MessageStatus.FAILED, 0)
        },
        "networks": network_data,
        "avg_delivery_time": round(float(avg_speed), 2)
    }

@router.get("/export/messages")
async def export_messages_csv(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Export message logs as CSV.
    """
    import csv
    import io
    from fastapi.responses import StreamingResponse

    stmt = (
        select(SMSMessage)
        .where(
            SMSMessage.organization_id == current_user.organization_id,
            SMSMessage.created_at >= (start_date or (datetime.utcnow() - timedelta(days=30))),
            SMSMessage.created_at <= (end_date or datetime.utcnow())
        )
        .order_by(SMSMessage.created_at.desc())
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Date", "Recipient", "Sender", "Content", "Status", "Network", "Sent At", "Delivered At", "Cost (GHS)"])
    
    # Data
    for msg in messages:
        writer.writerow([
            msg.id,
            msg.created_at.isoformat(),
            msg.recipient,
            msg.sender,
            msg.content.replace("\n", " "),
            msg.status,
            msg.provider_name,
            msg.sent_at.isoformat() if msg.sent_at else "",
            msg.delivered_at.isoformat() if msg.delivered_at else "",
            msg.cost or 0
        ])

    output.seek(0)
    
    filename = f"nexra_messages_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/admin/overview")
async def get_admin_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    SUPERADMIN ONLY. Returns a high-level business financial overview:
    - Total Revenue (sum of all top-up credits)
    - Total Liability (sum of all current wallet balances = what we owe users)
    - Total SMS Cost (sum of all per-message costs logged)
    - Estimated Profit (Revenue - Liability - Cost)
    - Platform-wide message stats
    """
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required"
        )

    # 1. Total Revenue: Sum of all topup credits ever received
    revenue_q = select(func.coalesce(func.sum(BillingLedger.amount), 0)).where(  # type: ignore
        BillingLedger.category == "topup",
        BillingLedger.type == LedgerType.CREDIT
    )
    revenue_result = await db.execute(revenue_q)
    total_revenue = float(revenue_result.scalar() or 0)

    # 2. Total Liability: Sum of all wallet balances (credit owed to users)
    liability_q = select(func.coalesce(func.sum(Wallet.balance), 0))  # type: ignore
    liability_result = await db.execute(liability_q)
    total_liability = float(liability_result.scalar() or 0)

    # 3. Total SMS Network Cost (what we paid to send messages)
    cost_q = select(func.coalesce(func.sum(SMSMessage.cost), 0)).where(  # type: ignore
        SMSMessage.cost.is_not(None)
    )
    cost_result = await db.execute(cost_q)
    total_network_cost = float(cost_result.scalar() or 0)

    # 4. Estimated Profit
    estimated_profit = total_revenue - total_liability - total_network_cost

    # 5. Platform-wide message counts
    msg_stats_q = (
        select(SMSMessage.status, func.count(SMSMessage.id).label("count"))  # type: ignore
        .group_by(SMSMessage.status)
    )
    msg_stats_result = await db.execute(msg_stats_q)
    msg_stats = {row.status: row.count for row in msg_stats_result}

    total_messages = sum(msg_stats.values())

    # 6. Total active organizations
    from app.db.models import Organization
    orgs_q = select(func.count(Organization.id)).where(Organization.is_active == True)  # type: ignore
    orgs_result = await db.execute(orgs_q)
    total_orgs = int(orgs_result.scalar() or 0)

    # 7. Recent top-ups (last 10)
    recent_topups_q = (
        select(BillingLedger)
        .where(
            BillingLedger.category == "topup",
            BillingLedger.type == LedgerType.CREDIT
        )
        .order_by(BillingLedger.created_at.desc())
        .limit(10)
    )
    recent_topups_result = await db.execute(recent_topups_q)
    recent_topups = [
        {
            "id": t.id,
            "amount": float(t.amount),
            "description": t.description,
            "created_at": t.created_at.isoformat()
        }
        for t in recent_topups_result.scalars().all()
    ]

    return {
        "financials": {
            "total_revenue": round(total_revenue, 2),
            "total_liability": round(total_liability, 2),
            "total_network_cost": round(total_network_cost, 4),
            "estimated_profit": round(estimated_profit, 2),
        },
        "platform": {
            "total_organizations": total_orgs,
            "total_messages": total_messages,
            "delivered": msg_stats.get(MessageStatus.DELIVERED, 0),
            "failed": msg_stats.get(MessageStatus.FAILED, 0),
            "pending": msg_stats.get(MessageStatus.PENDING, 0) + msg_stats.get(MessageStatus.PROCESSING, 0),
        },
        "recent_topups": recent_topups
    }
