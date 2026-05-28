import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal

async def fix_schema():
    async with SessionLocal() as db:
        try:
            print("Fixing 'campaigns' table schema...")
            # Adding group_ids column
            await db.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS group_ids JSONB"))
            await db.commit()
            print("Successfully added 'group_ids' column.")
        except Exception as e:
            await db.rollback()
            print(f"Error fixing schema: {e}")

if __name__ == "__main__":
    asyncio.run(fix_schema())
