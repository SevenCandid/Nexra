
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def global_audit():
    async with engine.connect() as conn:
        print("\n--- GLOBAL SCHEMA AUDIT ---")
        res = await conn.execute(text("""
            SELECT table_schema, table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns'
        """))
        for row in res.fetchall():
            print(f"Schema: {row[0]}, Table: {row[1]}, Col: {row[2]}")
            
        print("\n--- TABLES IN PUBLIC ---")
        res = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        for row in res.fetchall():
            print(f"Table: {row[0]}")

if __name__ == "__main__":
    asyncio.run(global_audit())
