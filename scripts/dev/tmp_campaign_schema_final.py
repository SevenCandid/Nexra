import asyncio
from sqlalchemy import text
from app.db.database import engine

async def check():
    async with engine.connect() as conn:
        print("Schema for table: campaigns")
        r = await conn.execute(text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'campaigns' ORDER BY ordinal_position"))
        for row in r.all():
            print(f"Col: {row[0]:20} | Type: {row[1]:20} | Nullable: {row[2]}")

if __name__ == "__main__":
    asyncio.run(check())
