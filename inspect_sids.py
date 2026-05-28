
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal, engine
from app.db.models import SenderID

async def check_sender_ids():
    async with SessionLocal() as db:
        result = await db.execute(select(SenderID))
        sids = result.scalars().all()
        print(f"Total Sender IDs: {len(sids)}")
        for sid in sids:
            print(f"ID: {sid.id}, SenderID: {sid.sender_id}, Status: {sid.status}, OrgID: {sid.organization_id}")

if __name__ == "__main__":
    asyncio.run(check_sender_ids())
