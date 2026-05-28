import asyncio
import traceback
from sqlalchemy import text
from app.db.database import SessionLocal

async def diagnose():
    async with SessionLocal() as db:
        print("--- Diagnosing Campaigns Table ---")
        try:
            await db.execute(text("SELECT * FROM campaigns LIMIT 1"))
            print("Successfully queried all columns in 'campaigns'.")
        except Exception:
            print("Error in 'campaigns' table:")
            print(traceback.format_exc())

        print("\n--- Diagnosing SMSMessages Table ---")
        try:
            await db.execute(text("SELECT * FROM sms_messages LIMIT 1"))
            print("Successfully queried all columns in 'sms_messages'.")
        except Exception:
            print("Error in 'sms_messages' table:")
            print(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(diagnose())
