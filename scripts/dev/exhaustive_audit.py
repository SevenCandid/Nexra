
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def exhaustive_audit():
    async with engine.connect() as conn:
        print("\n--- CAMPAIGNS COLUMN AUDIT ---")
        try:
            res = await conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'campaigns'
                ORDER BY ordinal_position
            """))
            cols = res.fetchall()
            print(f"Total columns found: {len(cols)}")
            for col in cols:
                print(f" - {col[0]} ({col[1]})")
            
            # Check for any other tables named campaigns in different schemas
            print("\n--- ALL CAMPAIGNS TABLES ---")
            res = await conn.execute(text("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name = 'campaigns'
            """))
            for row in res.fetchall():
                print(f"Schema: {row[0]}, Table: {row[1]}")

        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(exhaustive_audit())
