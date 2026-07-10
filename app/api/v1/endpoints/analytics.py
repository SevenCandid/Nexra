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
    import json
    from app.core.redis import redis_client

    now = datetime.utcnow()
    # Default to last 7 days if no dates provided
    if not start_date:
        start_date = now - timedelta(days=7)
    if not end_date:
        end_date = now

    # Strip timezone info — DB stores naive UTC datetimes; incoming ISO strings may be tz-aware
    start_date = start_date.replace(tzinfo=None)
    end_date = end_date.replace(tzinfo=None)

    # Clamp start_date if it is older than the oldest message to avoid large padding loops
    oldest_msg_query = (
        select(func.min(SMSMessage.created_at))
        .where(SMSMessage.organization_id == current_user.organization_id)
    )
    oldest_msg_result = await db.execute(oldest_msg_query)
    oldest_msg_date = oldest_msg_result.scalar()
    if oldest_msg_date:
        oldest_msg_date = oldest_msg_date.replace(tzinfo=None)
        if start_date < oldest_msg_date:
            start_date = oldest_msg_date
    else:
        # If there are no messages, set start_date to now - 7 days to avoid loops
        if start_date < now - timedelta(days=30):
            start_date = now - timedelta(days=7)

    # Determine Cache Key AFTER parsing and clamping dates
    cache_key = None
    if redis_client:
        # Round to nearest minute to allow cache hits
        s_str = start_date.strftime('%Y%m%d%H%M')
        e_str = end_date.strftime('%Y%m%d%H%M')
        cache_key = f"org:{current_user.organization_id}:analytics:stats:start_{s_str}:end_{e_str}"

        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    
    delta = end_date - start_date
    is_24h_view = delta.total_seconds() <= 90000  # 25 hours

    # 1. Activity (Messages per time bucket)
    if is_24h_view:
        # Group by hour for 24h view
        activity_query = (
            select(
                func.date_trunc('hour', SMSMessage.created_at).label("time_bucket"),
                func.count(SMSMessage.id).label("count")
            )
            .where(
                SMSMessage.organization_id == current_user.organization_id,
                SMSMessage.created_at >= start_date,
                SMSMessage.created_at <= end_date
            )
            .group_by(func.date_trunc('hour', SMSMessage.created_at))
            .order_by(func.date_trunc('hour', SMSMessage.created_at))
        )
        activity_result = await db.execute(activity_query)
        db_counts = {row.time_bucket.isoformat(): row.count for row in activity_result}
        
        # Pad missing hours
        activity_data = []
        current_hour = start_date.replace(minute=0, second=0, microsecond=0)
        end_hour = end_date.replace(minute=0, second=0, microsecond=0)
        while current_hour <= end_hour:
            iso_key = current_hour.isoformat()
            label = current_hour.strftime("%H:00")
            activity_data.append({
                "day": label,
                "count": db_counts.get(iso_key, 0)
            })
            current_hour += timedelta(hours=1)
    else:
        # Group by day for >24h view
        activity_query = (
            select(
                func.date(SMSMessage.created_at).label("time_bucket"),
                func.count(SMSMessage.id).label("count")
            )
            .where(
                SMSMessage.organization_id == current_user.organization_id,
                SMSMessage.created_at >= start_date,
                SMSMessage.created_at <= end_date
            )
            .group_by(func.date(SMSMessage.created_at))
            .order_by(func.date(SMSMessage.created_at))
        )
        activity_result = await db.execute(activity_query)
        db_counts = {row.time_bucket.isoformat(): row.count for row in activity_result}
        
        # Pad missing days
        activity_data = []
        current_day = start_date.date()
        end_day = end_date.date()
        while current_day <= end_day:
            iso_key = current_day.isoformat()
            # For UI display, we'll format it as a short date like "Jun 08" or just keep iso
            label = current_day.strftime("%b %d")
            activity_data.append({
                "day": label,
                "count": db_counts.get(iso_key, 0)
            })
            current_day += timedelta(days=1)

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

    # 4. Delivery Speed — avg seconds between sent_at and delivered_at (PostgreSQL only)
    speed_query = (
        select(
            func.avg(
                func.extract('epoch', SMSMessage.delivered_at - SMSMessage.sent_at)
            )
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

    response_data = {
        "activity": activity_data,
        "success_rate": {
            "delivering": (
                success_stats.get(MessageStatus.PENDING, 0)
                + success_stats.get(MessageStatus.PROCESSING, 0)
            ),
            "submitted": success_stats.get(MessageStatus.SUBMITTED, 0),
            "delivered": success_stats.get(MessageStatus.DELIVERED, 0),
            "not_delivered": success_stats.get(MessageStatus.NOT_DELIVERED, 0),
            "failed": success_stats.get(MessageStatus.FAILED, 0),
        },
        "networks": network_data,
        "avg_delivery_time": round(float(avg_speed), 2)
    }

    if redis_client and cache_key:
        await redis_client.setex(cache_key, 120, json.dumps(response_data))

    return response_data

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
        
    if redis_client:
        cached_data = await redis_client.get("admin:overview:stats")
        if cached_data:
            return json.loads(cached_data)

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
    # Note: Currently we're using User Charge as a fallback if provider_cost isn't set
    cost_q = select(func.coalesce(func.sum(SMSMessage.cost), 0)).where(  # type: ignore
        SMSMessage.cost.is_not(None),
        SMSMessage.is_refunded == False
    )
    cost_result = await db.execute(cost_q)
    total_user_charges = float(cost_result.scalar() or 0)



    # 5. Platform-wide message counts
    msg_stats_q = (
        select(SMSMessage.status, func.count(SMSMessage.id).label("count"))  # type: ignore
        .group_by(SMSMessage.status)
    )
    msg_stats_result = await db.execute(msg_stats_q)
    msg_stats = {row.status: row.count for row in msg_stats_result}

    total_messages = sum(msg_stats.values())
    
    # 4. Estimated Profit
    # Base cost is 0.031 GHS per SMS
    # Profit = (What we charged the user) - (What we paid the network)
    # Note: We subtract refunded messages already from total_user_charges
    # We only calculate profit on messages that were NOT refunded
    refunded_q = select(func.count(SMSMessage.id)).where(SMSMessage.is_refunded == True)
    refunded_result = await db.execute(refunded_q)
    refunded_count = int(refunded_result.scalar() or 0)
    
    billable_messages = total_messages - refunded_count
    estimated_profit = total_user_charges - (billable_messages * 0.031)

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

    # 8. Trends (Last 14 days)
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
    
    # SMS Volume Trend
    sms_trend_q = (
        select(
            func.date(SMSMessage.created_at).label("day"),
            func.count(SMSMessage.id).label("count")
        )
        .where(SMSMessage.created_at >= fourteen_days_ago)
        .group_by(func.date(SMSMessage.created_at))
        .order_by(func.date(SMSMessage.created_at))
    )
    sms_trend_result = await db.execute(sms_trend_q)
    sms_trend = {row.day.isoformat(): row.count for row in sms_trend_result}

    # Revenue Trend
    rev_trend_q = (
        select(
            func.date(BillingLedger.created_at).label("day"),
            func.sum(BillingLedger.amount).label("total")
        )
        .where(
            BillingLedger.created_at >= fourteen_days_ago,
            BillingLedger.category == "topup",
            BillingLedger.type == LedgerType.CREDIT
        )
        .group_by(func.date(BillingLedger.created_at))
        .order_by(func.date(BillingLedger.created_at))
    )
    rev_trend_result = await db.execute(rev_trend_q)
    rev_trend = {row.day.isoformat(): float(row.total) for row in rev_trend_result}

    # Merge trends into a single array for the chart
    trends = []
    for i in range(14, -1, -1):
        day_date = (datetime.utcnow() - timedelta(days=i)).date()
        day_str = day_date.isoformat()
        trends.append({
            "day": day_str,
            "sms_count": sms_trend.get(day_str, 0),
            "revenue": rev_trend.get(day_str, 0.0)
        })

    # 9. Wallet Distribution (Subscription vs PAYG)
    dist_q = select(
        func.sum(Wallet.subscription_credits).label("sub"),
        func.sum(Wallet.payg_credits).label("payg")
    )
    dist_result = await db.execute(dist_q)
    dist_row = dist_result.first()
    
    response_data = {
        "financials": {
            "total_revenue": round(total_revenue, 2),
            "total_liability": round(total_liability, 2),
            "total_network_cost": round(total_user_charges, 4),
            "estimated_profit": round(estimated_profit, 2),
            "distribution": {
                "subscription": float(dist_row.sub or 0),
                "payg": float(dist_row.payg or 0)
            }
        },
        "platform": {
            "total_organizations": total_orgs,
            "total_messages": total_messages,
            "delivered": msg_stats.get(MessageStatus.DELIVERED, 0),
            "submitted": msg_stats.get(MessageStatus.SUBMITTED, 0),
            "not_delivered": msg_stats.get(MessageStatus.NOT_DELIVERED, 0),
            "failed": msg_stats.get(MessageStatus.FAILED, 0),
            "refunded": refunded_count,
            "pending": msg_stats.get(MessageStatus.PENDING, 0) + msg_stats.get(MessageStatus.PROCESSING, 0),
        },
        "recent_topups": recent_topups,
        "trends": trends
    }
    
    if redis_client:
        await redis_client.setex("admin:overview:stats", 120, json.dumps(response_data))
        
    return response_data
