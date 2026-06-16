import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Campaign

async def audit_campaign_statuses():
    async with SessionLocal() as db:
        stmt = select(Campaign)
        result = await db.execute(stmt)
        campaigns = result.scalars().all()
        
        with open("audit_report.txt", "w") as f:
            f.write(f"Total Campaigns: {len(campaigns)}\n")
            for c in campaigns:
                f.write(f"ID: {c.id} | Name: {c.name} | Status: {c.status} | Scheduled At: {c.scheduled_at}\n")

if __name__ == "__main__":
    asyncio.run(audit_campaign_statuses())
