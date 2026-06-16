import asyncio
from sqlalchemy import text
from app.db.database import engine

async def f():
    tables = [
        'users', 'api_keys', 'contacts', 'campaigns', 'sms_messages',
        'billing_ledger', 'wallets', 'sender_ids', 'organizations'
    ]
    async with engine.connect() as conn:
        for table in tables:
            try:
                r = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"))
                cols = [row[0] for row in r.all()]
                has_org = 'organization_id' in cols
                print(f"Table {table:15}: {'HAS_ORG' if has_org else 'MISSING_ORG'}")
            except Exception as e:
                print(f"Table {table:15}: NOT FOUND ({e})")

if __name__ == "__main__":
    asyncio.run(f())
