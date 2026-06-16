import asyncio
from sqlalchemy import text
from app.db.database import engine

async def f():
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns'"))
        columns = [row[0] for row in r.all()]
        print(f"COLUMNS: {columns}")

if __name__ == "__main__":
    asyncio.run(f())
