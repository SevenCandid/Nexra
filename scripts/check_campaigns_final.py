
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def check_campaigns():
    async with engine.connect() as conn:
        print("Checking for existing campaigns...")
        result = await conn.execute(text("SELECT id, name, status FROM campaigns"))
        rows = result.fetchall()
        if not rows:
            print("No campaigns found in the database.")
        else:
            print(f"Found {len(rows)} campaigns:")
            for row in rows:
                print(row)

if __name__ == "__main__":
    asyncio.run(check_campaigns())
