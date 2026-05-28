
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import User, Organization, SubscriptionPlan

async def debug_path(email):
    async with SessionLocal() as db:
        print(f"Checking for user: {email}")
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"Path taken: EXISTING USER LOGIN (User ID: {user.id}, Org ID: {user.organization_id})")
        else:
            print("Path taken: NEW USER REGISTRATION")
            # Check if organization with same name would conflict
            # Assuming full_name is "Frank Bediako" -> org_name = "Frank Bediako's Org" -> org_slug = "frank-bediakos-org"
            org_slug = "frank-bediakos-org"
            org_result = await db.execute(select(Organization).where(Organization.slug == org_slug))
            if org_result.scalar_one_or_none():
                print(f"Conflict found: Organization slug '{org_slug}' already exists!")
            else:
                print(f"Slug '{org_slug}' is free.")

if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "frankbediako38@gmail.com"
    asyncio.run(debug_path(email))
