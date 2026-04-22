import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.getcwd())
from app.db.database import engine

async def migrate():
    print("Applying migration: Adding error_message column to sms_messages...")
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS error_message TEXT"))
    print("Migration successful!")

if __name__ == "__main__":
    asyncio.run(migrate())
