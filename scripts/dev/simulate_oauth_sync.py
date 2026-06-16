
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import User, Organization, SubscriptionPlan, Wallet

async def simulate_sync(email, full_name):
    async with SessionLocal() as db:
        try:
            print(f"Checking for user: {email}")
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if not user:
                print(f"User not found, starting registration for {email}")
                result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.slug == "starter"))
                plan = result.scalar_one_or_none()
                
                if not plan:
                    print("Creating starter plan")
                    plan = SubscriptionPlan(
                        name="Starter", slug="starter", monthly_price=50.0, sms_rate=0.05,
                        max_users=5, monthly_credits=1000.0, bonus_credits_on_signup=100.0,
                        pricing_model="hybrid", payg_rate_multiplier=1.2, features={"tps_limit": 5}
                    )
                    db.add(plan)
                    await db.flush()
                
                org_name = f"{full_name}'s Org"
                org_slug = org_name.lower().replace(" ", "-").replace("'", "")
                print(f"Creating organization: {org_name} (Slug: {org_slug})")
                organization = Organization(
                    name=org_name,
                    slug=org_slug,
                    plan_id=plan.id,
                    is_active=True
                )
                db.add(organization)
                await db.flush()
                
                user = User(
                    email=email,
                    hashed_password="oauth_managed",
                    full_name=full_name,
                    organization_id=organization.id,
                    is_active=True
                )
                db.add(user)
                await db.flush()
                
                wallet = Wallet(
                    organization_id=organization.id,
                    balance=plan.bonus_credits_on_signup,
                    subscription_credits=0.0,
                    payg_credits=plan.bonus_credits_on_signup,
                    currency="GHS"
                )
                db.add(wallet)
                await db.commit()
                print("Simulation Success: Account created.")
            else:
                print(f"Simulation Success: User {email} already exists.")
        except Exception as e:
            print(f"Simulation FAILED: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "test_oauth@example.com"
    name = sys.argv[2] if len(sys.argv) > 2 else "Test User"
    asyncio.run(simulate_sync(email, name))
