import asyncio
from sqlalchemy import text
from app.db.database import engine

async def f():
    async with engine.connect() as conn:
        for table in ['campaigns', 'sms_messages']:
            r = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"))
            columns = [row[0] for row in r.all()]
            print(f"TABLE {table}: {columns}")

if __name__ == "__main__":
    asyncio.run(f())
