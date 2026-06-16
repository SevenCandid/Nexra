
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def get_all_cols():
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'campaigns' AND table_schema = 'public'
            ORDER BY ordinal_position
        """))
        cols = [r[0] for r in res.fetchall()]
        print(f"FULL COLUMN LIST: {cols}")
        
        # Check if user_id and name are there
        for check in ['user_id', 'name']:
            if check in cols:
                print(f"✅ {check} exists")
            else:
                print(f"❌ {check} MISSING")

if __name__ == "__main__":
    asyncio.run(get_all_cols())
