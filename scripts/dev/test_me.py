import asyncio
from app.db.database import SessionLocal
from sqlalchemy import select
from app.db.models import User, Organization
from sqlalchemy.orm import selectinload
from app.schemas.schemas import User as UserSchema

async def main():
    async with SessionLocal() as db:
        query = (
            select(User)
            .options(selectinload(User.organization).selectinload(Organization.plan))
            .where(User.hashed_password == "oauth_managed")
            .order_by(User.id.desc())
            .limit(1)
        )
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        if user:
            print(f"Found user: {user.email}")
            try:
                user_data = UserSchema.from_orm(user)
                user_data.organization_name = user.organization.name
                user_data.plan_name = user.organization.plan.name if user.organization.plan else None
                user_data.plan_slug = user.organization.plan.slug if user.organization.plan else None
                print("Success!")
                print(user_data.json())
            except Exception as e:
                print(f"Error during UserSchema generation: {type(e).__name__} - {e}")
        else:
            print("No users found.")

asyncio.run(main())
