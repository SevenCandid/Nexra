import asyncio
import sys
sys.path.append('c:\\Users\\DELL\\NEXRA')
from app.db.database import SessionLocal
from app.db.models import SMSMessage, BillingLedger, Wallet
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        stmt = select(SMSMessage).order_by(SMSMessage.id.desc()).limit(10)
        result = await db.execute(stmt)
        msgs = result.scalars().all()
        print(f"Found {len(msgs)} total messages")
        for msg in msgs:
            print(f"Msg ID: {msg.id}, Cost: {msg.cost}, Refunded: {msg.is_refunded}, Status: {msg.status.value if hasattr(msg.status, 'value') else msg.status}")
            print(f"  Error: {msg.error_message}")

asyncio.run(main())
