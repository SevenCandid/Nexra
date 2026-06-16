import asyncio
from sqlalchemy import text
from app.db.database import engine

async def check():
    async with engine.connect() as conn:
        for table in ['users', 'organizations', 'campaigns', 'contacts', 'sms_messages']:
            try:
                r = await conn.execute(text(f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{table}'"))
                print(f"\nTable: {table}")
                for row in r.all():
                    print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")
            except Exception as e:
                print(f"Error checking {table}: {e}")

if __name__ == "__main__":
    asyncio.run(check())
