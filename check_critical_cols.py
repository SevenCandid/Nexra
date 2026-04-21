
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def check_critical_cols():
    async with engine.connect() as conn:
        cols_to_check = ['user_id', 'organization_id', 'contact_ids', 'scheduled_at', 'total_recipients', 'meta_data']
        print("\n--- CRITICAL COLUMN CHECK ---")
        for col in cols_to_check:
            res = await conn.execute(text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'campaigns' AND column_name = '{col}'
            """))
            row = res.fetchone()
            if row:
                print(f"Col: {row[0]}, Type: {row[1]}")
            else:
                print(f"Col: {col} - MISSING")

if __name__ == "__main__":
    asyncio.run(check_critical_cols())
