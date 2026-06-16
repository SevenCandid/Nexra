
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def verify_schema():
    async with engine.connect() as conn:
        print(f"Connected to: {engine.url}")
        
        # Check current database and schema
        res = await conn.execute(text("SELECT current_database(), current_schema()"))
        db, schema = res.fetchone()
        print(f"Database: {db}, Schema: {schema}")
        
        # Check if table exists in this schema
        res = await conn.execute(text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = '{schema}' AND table_name = 'campaigns'
            )
        """))
        exists = res.scalar()
        print(f"Table 'campaigns' exists in '{schema}': {exists}")
        
        if exists:
            # List columns in this schema only
            res = await conn.execute(text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = '{schema}' AND table_name = 'campaigns'
                ORDER BY ordinal_position
            """))
            print("\n--- Columns in 'campaigns' ---")
            for row in res.fetchall():
                print(f"  - {row[0]} ({row[1]})")

if __name__ == "__main__":
    asyncio.run(verify_schema())
