
import asyncio
from sqlalchemy import text
from app.db.database import SessionLocal, engine

async def describe_table():
    async with engine.connect() as conn:
        print("--- Table: campaigns ---")
        result = await conn.execute(text("PRAGMA table_info(campaigns)"))
        for row in result:
            print(row)
            
        print("\n--- Table: sms_messages ---")
        result = await conn.execute(text("PRAGMA table_info(sms_messages)"))
        for row in result:
            print(row)

        print("\n--- Data: campaigns ---")
        result = await conn.execute(text("SELECT * FROM campaigns LIMIT 5"))
        columns = result.keys()
        print(f"Columns: {list(columns)}")
        for row in result:
            print(row)

if __name__ == "__main__":
    asyncio.run(describe_table())
