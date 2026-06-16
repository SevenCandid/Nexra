import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal

async def add_column():
    async with SessionLocal() as db:
        try:
            print("Adding 'contact_ids' column to 'campaigns' table...")
            # Use JSONB if postgres, or JSON if sqlite. The app uses postgres (asyncpg).
            await db.execute(text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS contact_ids JSONB"))
            await db.commit()
            print("Successfully added 'contact_ids' column.")
        except Exception as e:
            await db.rollback()
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
