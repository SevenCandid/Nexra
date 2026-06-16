import asyncio
from sqlalchemy import select, func
from app.db.database import SessionLocal
from app.db.models import Campaign, SMSMessage, CampaignStatus, MessageStatus

async def verify_logic():
    async with SessionLocal() as db:
        # 1. Check recent campaigns and their statuses
        stmt = select(Campaign).order_by(Campaign.created_at.desc()).limit(5)
        result = await db.execute(stmt)
        campaigns = result.scalars().all()
        
        print("\n--- Recent Campaigns ---")
        for c in campaigns:
            # Count associated messages by status
            msg_stmt = select(SMSMessage.status, func.count(SMSMessage.id)).where(SMSMessage.campaign_id == c.id).group_by(SMSMessage.status)
            msg_result = await db.execute(msg_stmt)
            counts = msg_result.all()
            counts_str = ", ".join([f"{status}: {count}" for status, count in counts])
            print(f"ID: {c.id}, Name: {c.name}, Status: {c.status}, Messages: [{counts_str}]")

        # 2. Check overall message stats
        print("\n--- Overall Message Stats ---")
        for status in MessageStatus:
            stmt = select(func.count(SMSMessage.id)).where(SMSMessage.status == status)
            result = await db.execute(stmt)
            count = result.scalar()
            print(f"{status.value}: {count}")

if __name__ == "__main__":
    asyncio.run(verify_logic())
