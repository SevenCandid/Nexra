import asyncio
import sys
sys.path.append('c:\\Users\\DELL\\NEXRA')
from app.db.database import SessionLocal
from app.db.models import BillingLedger
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        stmt = select(BillingLedger).where(BillingLedger.reference_id == '178')
        result = await db.execute(stmt)
        ledgers = result.scalars().all()
        for l in ledgers:
            print(f"Ledger ID: {l.id}, Amount: {l.amount}, Type: {l.type.value if hasattr(l.type, 'value') else l.type}, Balance After: {l.balance_after}, Category: {l.category}, Credit Source: {l.credit_source}")

asyncio.run(main())
