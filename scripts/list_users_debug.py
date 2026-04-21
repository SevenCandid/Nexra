import asyncio
from sqlalchemy import select
from app.db.database import get_db # or SessionLocal
# Let's use SessionLocal directly for simplicity
from app.db.session import SessionLocal
from app.db.models import User

async def list_users():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"{'ID':<5} | {'Email':<30} | {'Role':<15} | {'Active':<10}")
        print("-" * 65)
        for user in users:
            print(f"{user.id:<5} | {user.email:<30} | {user.role:<15} | {user.is_active:<10}")

if __name__ == "__main__":
    asyncio.run(list_users())
