
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def concise_audit():
    async with engine.connect() as conn:
        for table in ['campaigns', 'sms_messages']:
            print(f"\n--- Table: {table} ---")
            res = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"))
            cols = [r[0] for r in res.fetchall()]
            print(f"Columns: {cols}")

if __name__ == "__main__":
    asyncio.run(concise_audit())
