
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import User, Organization, SubscriptionPlan, Wallet

async def test_creation():
    async with SessionLocal() as db:
        print("Starting test creation...")
        # 1. Get Plan
        result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.slug == "starter"))
        plan = result.scalar_one_or_none()
        if not plan:
            print("Starter plan missing, creating...")
            plan = SubscriptionPlan(
                name="Starter", slug="starter", monthly_price=50.0, sms_rate=0.05,
                max_users=5, monthly_credits=1000.0, bonus_credits_on_signup=100.0,
                pricing_model="hybrid", payg_rate_multiplier=1.2, features={"tps_limit": 5}
            )
            db.add(plan)
            await db.flush()
        
        # 2. Try specific name that might cause issues
        full_name = "Frank Bediako"
        email = "frank.new@example.com"
        
        org_name = f"{full_name}'s Org"
        org_slug = org_name.lower().replace(" ", "-").replace("'", "")
        
        print(f"Testing org slug: {org_slug}")
        
        try:
            organization = Organization(
                name=org_name,
                slug=org_slug,
                plan_id=plan.id,
                is_active=True
            )
            db.add(organization)
            await db.flush()
            print("Org created successfully.")
            
            user = User(
                email=email,
                hashed_password="oauth_managed",
                full_name=full_name,
                organization_id=organization.id,
                is_active=True
            )
            db.add(user)
            await db.flush()
            print("User created successfully.")
            
            # 3. Commit
            await db.commit()
            print("Commit successful!")
        except Exception as e:
            print(f"FAILED: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(test_creation())
