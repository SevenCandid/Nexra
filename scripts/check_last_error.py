import asyncio
import sys
import os
from sqlalchemy import select

sys.path.append(os.getcwd())

from app.db.database import SessionLocal
from app.db.models import SMSMessage

async def check():
    async with SessionLocal() as db:
        res = await db.execute(select(SMSMessage).order_by(SMSMessage.id.desc()).limit(1))
        msg = res.scalar()
        print("\n--- LAST SMS ERROR REASON ---")
        print(f"Status: {msg.status}")
        print(f"Error: {msg.error_message}")
        print(f"Provider: {msg.provider_name}")
        print("-----------------------------\n")

if __name__ == "__main__":
    asyncio.run(check())
