import asyncio
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from app.db.database import SessionLocal

async def add_column():
    async with SessionLocal() as db:
        try:
            print("Adding 'phone_number' column to 'users' table...")
            await db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)"))
            await db.commit()
            print("Successfully added 'phone_number' column.")
        except Exception as e:
            await db.rollback()
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
