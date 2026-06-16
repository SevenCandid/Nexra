
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def audit_campaigns():
    async with engine.connect() as conn:
        print("\n--- CAMPAIGNS FULL SCHEMA ---")
        res = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns'
            ORDER BY ordinal_position
        """))
        for row in res.fetchall():
            print(f"Col: {row[0]}, Type: {row[1]}")

if __name__ == "__main__":
    asyncio.run(audit_campaigns())
