
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def describe_pg_table():
    async with engine.connect() as conn:
        print("--- Table: campaigns ---")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns'
        """))
        rows = result.fetchall()
        for row in rows:
            print(row)
            
        print("\n--- Data Sample: campaigns ---")
        try:
            result = await conn.execute(text("SELECT id, name, status FROM campaigns LIMIT 5"))
            for row in result:
                print(row)
        except Exception as e:
            print(f"Error fetching data: {e}")

if __name__ == "__main__":
    asyncio.run(describe_pg_table())
