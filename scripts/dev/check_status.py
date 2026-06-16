import asyncio
from sqlalchemy import select, func
from app.db.database import SessionLocal
from app.db.models import Campaign, SMSMessage

async def check_statuses():
    async with SessionLocal() as db:
        c_stmt = select(Campaign.status, func.count(Campaign.id)).group_by(Campaign.status)
        c_res = await db.execute(c_stmt)
        print("Campaign Statuses:", dict(c_res.all()))
        
        m_stmt = select(SMSMessage.status, func.count(SMSMessage.id)).group_by(SMSMessage.status)
        m_res = await db.execute(m_stmt)
        print("Message Statuses:", dict(m_res.all()))

if __name__ == "__main__":
    asyncio.run(check_statuses())
