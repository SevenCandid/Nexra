import asyncio
from sqlalchemy import select
from app.db.database import engine
from app.db.models import User, UserRole

async def check_users():
    async with engine.connect() as conn:
        result = await conn.execute(select(User.id, User.email, User.role, User.permissions))
        users = result.all()
        print("\n--- Current Users ---")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role} | Perms: {u.permissions}")
        print("---------------------\n")

if __name__ == "__main__":
    asyncio.run(check_users())
