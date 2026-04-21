
import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal

async def final_cleanup():
    async with SessionLocal() as db:
        try:
            print("Dropping legacy columns...")
            
            queries = [
                # Drop message_text from campaigns
                "ALTER TABLE campaigns DROP COLUMN IF EXISTS message_text",
                
                # Drop body from sms_messages (legacy from my mistake or user's previous version)
                "ALTER TABLE sms_messages DROP COLUMN IF EXISTS body",
                
                # Ensure all required columns match exactly
                "ALTER TABLE campaigns ALTER COLUMN name SET NOT NULL",
                "ALTER TABLE campaigns ALTER COLUMN sender SET NOT NULL",
                "ALTER TABLE campaigns ALTER COLUMN template SET NOT NULL",
                "ALTER TABLE campaigns ALTER COLUMN status SET NOT NULL",
            ]
            
            for q in queries:
                try:
                    await db.execute(text(q))
                except Exception as e:
                    print(f"Query '{q}' failed: {e}")
            
            await db.commit()
            print("Successfully cleaned up schema.")
            
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(final_cleanup())
