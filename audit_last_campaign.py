
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Contact, SMSMessage, Campaign

async def audit_last_campaign():
    async with SessionLocal() as db:
        # Get last campaign
        stmt = select(Campaign).order_by(Campaign.id.desc()).limit(1)
        res = await db.execute(stmt)
        camp = res.scalar_one_or_none()
        if not camp:
            print("No campaigns found.")
            return
        
        print(f"Campaign: {camp.name} (ID: {camp.id})")
        print(f"Template: {repr(camp.template)}")
        
        # Get messages for this campaign
        m_stmt = select(SMSMessage).where(SMSMessage.campaign_id == camp.id).limit(5)
        m_res = await db.execute(m_stmt)
        msgs = m_res.scalars().all()
        
        for m in msgs:
            print(f"\nMessage ID: {m.id}, Content: {repr(m.content)}")
            # Find the contact
            c_stmt = select(Contact).where(Contact.phone_number == m.recipient)
            c_res = await db.execute(c_stmt)
            c = c_res.scalars().first()
            if c:
                print(f"  Contact ID: {c.id}, First: {repr(c.first_name)}, Last: {repr(c.last_name)}")
            else:
                print("  Contact not found for this recipient.")

if __name__ == "__main__":
    asyncio.run(audit_last_campaign())
