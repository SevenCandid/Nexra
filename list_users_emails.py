
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import User

async def run():
    async with SessionLocal() as db:
        res = await db.execute(select(User))
        for u in res.scalars().all():
            print(f"User Email: |{u.email}|")

if __name__ == "__main__":
    asyncio.run(run())
