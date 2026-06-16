
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def final_audit():
    async with engine.connect() as conn:
        print("\n--- CAMPAIGNS COLUMNS ---")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns'"))
        cols = [r[0] for r in res.fetchall()]
        print(", ".join(cols))
        
        print("\n--- SMS_MESSAGES COLUMNS ---")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'sms_messages'"))
        cols = [r[0] for r in res.fetchall()]
        print(", ".join(cols))

if __name__ == "__main__":
    asyncio.run(final_audit())
