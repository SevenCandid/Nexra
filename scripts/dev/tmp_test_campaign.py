import asyncio
import traceback
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Campaign

async def test():
    async with SessionLocal() as db:
        print("Test 1: Simple select Campaign")
        try:
            stmt = select(Campaign).limit(1)
            result = await db.execute(stmt)
            c = result.scalars().first()
            print(f"Success: {c}")
        except Exception:
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
