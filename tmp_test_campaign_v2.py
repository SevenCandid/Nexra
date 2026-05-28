import asyncio
import traceback
import sys
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Campaign

async def test():
    try:
        async with SessionLocal() as db:
            print("Running query...")
            stmt = select(Campaign).limit(1)
            result = await db.execute(stmt)
            row = result.scalars().first()
            print(f"Success! Row ID: {row.id if row else 'None'}")
    except Exception as e:
        print(f"\nCaught Exception: {type(e).__name__}: {str(e)}")
        print("\nFull Traceback:")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test())
