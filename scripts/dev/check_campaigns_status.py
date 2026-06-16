
import asyncio
from sqlalchemy import select, func
from app.db.database import SessionLocal
from app.db.models import Campaign, User, Organization

async def check_campaigns_in_db():
    async with SessionLocal() as db:
        # Get count
        res = await db.execute(select(func.count(Campaign.id)))
        count = res.scalar()
        print(f"Total Campaigns in DB: {count}")
        
        # Get last 5
        res = await db.execute(select(Campaign).order_by(Campaign.id.desc()).limit(5))
        campaigns = res.scalars().all()
        
        for c in campaigns:
            print(f"ID: {c.id}, Name: {c.name}, Org ID: {c.organization_id}, User ID: {c.user_id}, Status: {c.status}")

if __name__ == "__main__":
    asyncio.run(check_campaigns_in_db())
