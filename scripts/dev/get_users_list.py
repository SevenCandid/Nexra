
import asyncio
from app.db.database import SessionLocal
from app.db.models import User
from sqlalchemy import select

async def list_users():
    async with SessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Org ID: {u.organization_id}")

if __name__ == "__main__":
    asyncio.run(list_users())
