
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import SenderID, SenderIDStatus, Organization

async def audit_sids():
    async with SessionLocal() as db:
        print("\n--- SENDER IDS AUDIT ---")
        res = await db.execute(select(SenderID))
        sids = res.scalars().all()
        if not sids:
            print("No sender IDs found in DB.")
        for sid in sids:
            print(f"ID: {sid.id}, SID: {sid.sender_id}, Status: {sid.status}, OrgID: {sid.organization_id}")
            
        print("\n--- ORGANIZATIONS ---")
        res = await conn.execute(select(Organization)) if 'conn' in locals() else await db.execute(select(Organization))
        orgs = res.scalars().all()
        for org in orgs:
            print(f"ID: {org.id}, Name: {org.name}")

if __name__ == "__main__":
    asyncio.run(audit_sids())
