
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, func
from app.db.database import SessionLocal
from app.db.models import SMSMessage, Campaign, CampaignStatus, MessageStatus

async def check_stale_tasks():
    print("=== BACKGROUND WORKER & DATA INTEGRITY CHECK ===")
    async with SessionLocal() as db:
        # 1. Stale Messages
        five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
        stale_msgs_query = select(func.count(SMSMessage.id)).where(
            SMSMessage.status == MessageStatus.PENDING,
            SMSMessage.created_at < five_mins_ago
        )
        result = await db.execute(stale_msgs_query)
        stale_count = result.scalar()
        
        if stale_count > 0:
            print(f"WARNING: Found {stale_count} messages STUCK in PENDING for > 5 minutes.")
        else:
            print("SUCCESS: No stale messages found.")

        # 2. Campaign Status Mismatch
        active_campaigns_query = select(Campaign).where(
            Campaign.status.in_([CampaignStatus.SENDING, CampaignStatus.SCHEDULED])
        )
        result = await db.execute(active_campaigns_query)
        active_campaigns = result.scalars().all()
        
        if not active_campaigns:
            print("SUCCESS: No campaigns in unstable 'SENDING' or 'SCHEDULED' states without workers.")
        else:
            for c in active_campaigns:
                print(f"INFO: Campaign '{c.name}' is in {c.status} state. Created at: {c.created_at}")

        # 3. Last Worker Pulse (if applicable, but we use DB indicators)
        latest_msg_res = await db.execute(select(SMSMessage).order_by(SMSMessage.id.desc()).limit(1))
        latest_msg = latest_msg_res.scalar_one_or_none()
        if latest_msg:
             print(f"INFO: Most recent message ID {latest_msg.id} status: {latest_msg.status} (Updated at {latest_msg.created_at})")

if __name__ == "__main__":
    asyncio.run(check_stale_tasks())
