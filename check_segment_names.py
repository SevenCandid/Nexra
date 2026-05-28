
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Contact, ContactGroup, contact_group_association

async def check_segment_names():
    async with SessionLocal() as db:
        # Get all groups
        stmt = select(ContactGroup)
        result = await db.execute(stmt)
        groups = result.scalars().all()
        
        for g in groups:
            print(f"\nGroup: {g.name} (ID: {g.id})")
            c_stmt = (
                select(Contact)
                .join(contact_group_association, Contact.id == contact_group_association.c.contact_id)
                .where(contact_group_association.c.group_id == g.id)
            )
            c_res = await db.execute(c_stmt)
            contacts = c_res.scalars().all()
            print(f"Total contacts: {len(contacts)}")
            for c in contacts:
                print(f"  - ID: {c.id}, Phone: {c.phone_number}, First: {repr(c.first_name)}, Last: {repr(c.last_name)}")

if __name__ == "__main__":
    asyncio.run(check_segment_names())
