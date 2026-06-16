import asyncio
from sqlalchemy import select
from app.db.session import SessionLocal
from app.db.models import User, UserRole

async def check():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"ID={u.id} | email={u.email} | role={u.role!r} | role_type={type(u.role)} | role_value={u.role.value if hasattr(u.role, 'value') else u.role}")

if __name__ == "__main__":
    asyncio.run(check())
