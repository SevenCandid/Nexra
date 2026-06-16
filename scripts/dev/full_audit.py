
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def full_audit():
    async with engine.connect() as conn:
        print("\n--- Table: campaigns ---")
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'campaigns' ORDER BY ordinal_position"))
        for row in res:
            print(row)

if __name__ == "__main__":
    asyncio.run(full_audit())
