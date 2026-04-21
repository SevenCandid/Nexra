import asyncio
from sqlalchemy import text
from app.db.database import engine

async def migrate():
    async with engine.begin() as conn:
        try:
            print("Adding permissions column...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN permissions JSON DEFAULT '{}'::json;"))
            print("Successfully added permissions column to users table.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("Column already exists. Skipping.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
