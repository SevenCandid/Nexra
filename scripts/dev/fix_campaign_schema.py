
import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal

async def fix_schema():
    async with SessionLocal() as db:
        try:
            print("Auditing and fixing 'campaigns' table...")
            
            # 1. Add 'name' column if missing
            await db.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS name VARCHAR(255)"))
            
            # 2. Add 'sender' column if missing (though audit says it exists, let's be safe)
            await db.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sender VARCHAR(20)"))
            
            # 3. Add 'template' column if missing
            await db.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template TEXT"))
            
            # 4. Add 'contact_ids' column if missing (JSONB for Postgres)
            await db.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS contact_ids JSONB"))
            
            # 5. Clean up 'message_text' if it exists (legacy)
            # await db.execute(text("ALTER TABLE campaigns DROP COLUMN IF EXISTS message_text"))
            
            await db.commit()
            print("Successfully updated 'campaigns' table schema.")
            
        except Exception as e:
            await db.rollback()
            print(f"Error updating schema: {e}")

if __name__ == "__main__":
    asyncio.run(fix_schema())
