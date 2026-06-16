
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def audit_sms_messages():
    async with engine.connect() as conn:
        print("\n--- Table: sms_messages ---")
        res = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = 'sms_messages'"))
        cols = [r[0] for r in res.fetchall()]
        print(f"Columns: {cols}")

if __name__ == "__main__":
    asyncio.run(audit_sms_messages())
