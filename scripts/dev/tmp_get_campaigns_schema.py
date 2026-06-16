import asyncio
from sqlalchemy import text
from app.db.database import engine

async def check():
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'campaigns' ORDER BY ordinal_position"))
        data = r.all()
        print("CAMPAIGNS_SCHEMA_START")
        for row in data:
            print(f"{row[0]}|{row[1]}")
        print("CAMPAIGNS_SCHEMA_END")

if __name__ == "__main__":
    asyncio.run(check())
