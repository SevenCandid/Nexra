import asyncio
from sqlalchemy import select, delete
from app.db.session import SessionLocal
from app.db.models import User, UserRole

async def clear_privileged_accounts():
    async with SessionLocal() as db:
        # Find and delete all non-regular users
        result = await db.execute(
            select(User).where(User.role.in_([UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.STAFF]))
        )
        users = result.scalars().all()

        if not users:
            print("No admin/staff/superadmin accounts found.")
            return

        print(f"Found {len(users)} account(s) to delete:")
        for u in users:
            print(f"  - [{u.role}] {u.email} (ID: {u.id})")

        await db.execute(
            delete(User).where(User.role.in_([UserRole.SUPERADMIN, UserRole.ORG_ADMIN, UserRole.STAFF]))
        )
        await db.commit()
        print("Done. All admin/staff/superadmin accounts have been removed.")

if __name__ == "__main__":
    asyncio.run(clear_privileged_accounts())
