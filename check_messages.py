
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import SMSMessage

async def check_messages():
    async with SessionLocal() as db:
        stmt = select(SMSMessage).order_by(SMSMessage.id.desc()).limit(15)
        result = await db.execute(stmt)
        messages = result.scalars().all()
        
        print("\nLast 15 Messages:")
        for m in messages:
            print(f"ID: {m.id}, Recipient: {m.recipient}, Content: {repr(m.content)}")

if __name__ == "__main__":
    asyncio.run(check_messages())
