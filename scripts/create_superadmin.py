import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.models import Base, User, Organization, SubscriptionPlan, UserRole, Wallet
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

async def create_superadmin():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # 1. Create Default Plan if not exists
        from sqlalchemy import select
        result = await session.execute(select(SubscriptionPlan).where(SubscriptionPlan.slug == "pro"))
        plan = result.scalar_one_or_none()
        
        if not plan:
            plan = SubscriptionPlan(
                name="Pro",
                slug="pro",
                monthly_price=50.0,
                sms_rate=0.06,
                max_users=100,
                features={"all": True},
                monthly_credits=1250.0,
                bonus_credits_on_signup=250.0,
                pricing_model="hybrid"
            )
            session.add(plan)
            await session.flush()
            print("Created Pro plan.")

        # 2. Create Default Organization if not exists
        result = await session.execute(select(Organization).where(Organization.slug == "nexra-admin"))
        org = result.scalar_one_or_none()
        
        if not org:
            org = Organization(
                name="NEXRA Admin",
                slug="nexra-admin",
                plan_id=plan.id
            )
            session.add(org)
            await session.flush()
            
            # Create Wallet for Org
            wallet = Wallet(organization_id=org.id, balance=1000.0)
            session.add(wallet)
            print("Created Admin Organization.")

        # 3. Create Super Admin User if not exists
        result = await session.execute(select(User).where(User.email == "admin@nexra.com"))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                email="admin@nexra.com",
                hashed_password=pwd_context.hash("admin123"),
                full_name="NEXRA Super Admin",
                role=UserRole.SUPERADMIN,
                organization_id=org.id
            )
            session.add(user)
            print("Created Super Admin: admin@nexra.com / admin123")
        else:
            print("Super Admin already exists.")

        await session.commit()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_superadmin())
