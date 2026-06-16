
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Contact, Organization

async def audit_contacts():
    async with SessionLocal() as db:
        result = await db.execute(select(Contact))
        contacts = result.scalars().all()
        print(f"Total Contacts: {len(contacts)}")
        for c in contacts:
            print(f"ID: {c.id}, Phone: {c.phone_number}, OrgID: {c.organization_id}, Tags: {c.tags}")

if __name__ == "__main__":
    asyncio.run(audit_contacts())
