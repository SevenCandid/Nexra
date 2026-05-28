
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import User, Organization

async def check_users_orgs():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"Total Users: {len(users)}")
        for u in users:
            result_org = await db.execute(select(Organization).where(Organization.id == u.organization_id))
            org = result_org.scalar_one_or_none()
            org_name = org.name if org else "None"
            print(f"User: {u.full_name}, Email: {u.email}, OrgID: {u.organization_id}, OrgName: {org_name}, Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(check_users_orgs())
