
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def audit_subset():
    async with engine.connect() as conn:
        print("--- Table: campaigns ---")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns'"))
        cols = [r[0] for r in res.fetchall()]
        print(f"Columns: {cols}")
        
        print("\n--- Table: sms_messages ---")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'sms_messages'"))
        cols = [r[0] for r in res.fetchall()]
        print(f"Columns: {cols}")

if __name__ == "__main__":
    asyncio.run(audit_subset())
