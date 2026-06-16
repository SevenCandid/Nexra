
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def detailed_audit():
    async with engine.connect() as conn:
        for table in ['campaigns', 'sms_messages']:
            print(f"\n--- Table: {table} ---")
            res = await conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'"))
            for row in res:
                print(row)

if __name__ == "__main__":
    asyncio.run(detailed_audit())
