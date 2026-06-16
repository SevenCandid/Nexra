
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def check_db_details():
    async with engine.connect() as conn:
        # Get current database
        res = await conn.execute(text("SELECT current_database()"))
        db_name = res.scalar()
        print(f"Current Database: {db_name}")
        
        # Get all tables in public schema
        res = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        print("Tables in public schema:")
        for row in res.fetchall():
            print(f" - {row[0]}")
            
        # Get columns for campaigns
        print("\nColumns in 'campaigns':")
        res = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns'
            ORDER BY ordinal_position
        """))
        for row in res.fetchall():
            print(f" - {row[0]} ({row[1]})")

if __name__ == "__main__":
    asyncio.run(check_db_details())
