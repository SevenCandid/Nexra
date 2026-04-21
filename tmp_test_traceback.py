import asyncio
import traceback
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Campaign

async def test():
    async with SessionLocal() as db:
        print("Starting select test...")
        try:
            stmt = select(Campaign).limit(1)
            result = await db.execute(stmt)
            c = result.scalars().first()
            print(f"Result: {c}")
        except Exception:
            print("ERROR_TRACEBACK_START")
            traceback.print_exc()
            print("ERROR_TRACEBACK_END")

if __name__ == "__main__":
    asyncio.run(test())
