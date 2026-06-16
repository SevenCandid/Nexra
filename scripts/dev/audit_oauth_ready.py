
import asyncio
from sqlalchemy import select, func
from app.db.database import SessionLocal
from app.db.models import User, Organization, SubscriptionPlan, Wallet

async def audit_oauth():
    async with SessionLocal() as db:
        print("--- Subscription Plans ---")
        plans = await db.execute(select(SubscriptionPlan))
        for p in plans.scalars().all():
            print(f"Plan: {p.name} (Slug: {p.slug}, ID: {p.id})")
        
        print("\n--- Organizations ---")
        orgs = await db.execute(select(Organization).limit(10))
        for o in orgs.scalars().all():
            print(f"Org: {o.name} (Slug: {o.slug}, ID: {o.id})")
            
        print("\n--- Users (Last 5) ---")
        users = await db.execute(select(User).order_by(User.id.desc()).limit(5))
        for u in users.scalars().all():
            print(f"User: {u.email} (Org ID: {u.organization_id}, Role: {u.role})")

if __name__ == "__main__":
    asyncio.run(audit_oauth())
