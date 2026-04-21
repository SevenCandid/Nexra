import asyncio
from sqlalchemy import select, update
from app.db.session import SessionLocal
from app.db.models import User, UserRole
from app.core import security

async def fix_admin():
    async with SessionLocal() as db:
        email = "frankbediako38@gmail.com" # Assuming this is your main account
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            print(f"Found user: {email}. Promoting to SUPERADMIN...")
            new_password = "NexraAdmin2026!"
            await db.execute(
                update(User)
                .where(User.email == email)
                .values(
                    role=UserRole.SUPERADMIN,
                    hashed_password=security.get_password_hash(new_password),
                    is_active=True
                )
            )
            await db.commit()
            print(f"Successfully promoted {email} to SUPERADMIN.")
            print(f"Password has been reset to: {new_password}")
        else:
            print(f"User {email} not found. Creating default admin...")
            admin_user = User(
                email="admin@nexra.com",
                hashed_password=security.get_password_hash("NexraAdmin2026!"),
                full_name="NEXRA SuperAdmin",
                is_active=True,
                role=UserRole.SUPERADMIN,
                api_key=security.generate_api_key()
            )
            db.add(admin_user)
            await db.commit()
            print("Created default admin: admin@nexra.com / NexraAdmin2026!")

if __name__ == "__main__":
    asyncio.run(fix_admin())
