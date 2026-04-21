
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def deep_audit():
    async with engine.connect() as conn:
        for table in ['campaigns', 'sms_messages', 'contacts', 'sender_ids']:
            print(f"\n--- Checking table: {table} ---")
            try:
                # Get column info from information_schema
                res = await conn.execute(text(f"""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}'
                    ORDER BY ordinal_position
                """))
                cols = res.fetchall()
                if not cols:
                    print(f"Table '{table}' not found in information_schema!")
                for col in cols:
                    print(f"  - {col[0]} ({col[1]})")
            except Exception as e:
                print(f"Error checking {table}: {e}")

if __name__ == "__main__":
    asyncio.run(deep_audit())
