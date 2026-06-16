
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def audit_full_schema():
    async with engine.connect() as conn:
        for table in ['campaigns', 'sms_messages', 'contacts', 'sender_ids']:
            print(f"\n--- Table: {table} ---")
            result = await conn.execute(text(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table}'
                ORDER BY ordinal_position
            """))
            for row in result:
                print(row)

if __name__ == "__main__":
    asyncio.run(audit_full_schema())
