
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import User, Organization, SenderID

async def check_all_data():
    async with SessionLocal() as db:
        with open("db_audit.txt", "w") as f:
            f.write("--- USERS ---\n")
            result_users = await db.execute(select(User))
            users = result_users.scalars().all()
            for u in users:
                f.write(f"User: {u.full_name}, Email: {u.email}, OrgID: {u.organization_id}, Role: {u.role}\n")
            
            f.write("\n--- ORGANIZATIONS ---\n")
            result_orgs = await db.execute(select(Organization))
            orgs = result_orgs.scalars().all()
            for o in orgs:
                f.write(f"Org: {o.name}, ID: {o.id}\n")
            
            f.write("\n--- SENDER IDS ---\n")
            result_sids = await db.execute(select(SenderID))
            sids = result_sids.scalars().all()
            for s in sids:
                f.write(f"ID: {s.id}, SenderID: {s.sender_id}, Status: {s.status}, OrgID: {s.organization_id}\n")

if __name__ == "__main__":
    asyncio.run(check_all_data())
