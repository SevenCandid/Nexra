import asyncio
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import AsyncSessionLocal
from app.db.models import NetworkPricing, Organization, Wallet
from sqlalchemy.future import select

async def seed_billing():
    async with AsyncSessionLocal() as db:
        # 1. Seed Network Pricing
        networks = [
            {"name": "MTN Ghana", "cost": 0.0250},
            {"name": "Telecel Ghana", "cost": 0.0240},
            {"name": "AirtelTigo Ghana", "cost": 0.0230},
            {"name": "Expresso Ghana", "cost": 0.0220},
            {"name": "International", "cost": 0.1500},
        ]
        
        for net in networks:
            result = await db.execute(select(NetworkPricing).where(NetworkPricing.network_name == net["name"]))
            existing = result.scalar_one_or_none()
            if not existing:
                pricing = NetworkPricing(
                    network_name=net["name"],
                    cost_per_sms=Decimal(str(net["cost"])),
                    currency="GHS",
                    is_active=True
                )
                db.add(pricing)
                print(f"Added pricing for {net['name']}")
        
        # 2. Ensure Wallets exist for organizations
        result = await db.execute(select(Organization))
        orgs = result.scalars().all()
        
        for org in orgs:
            result = await db.execute(select(Wallet).where(Wallet.organization_id == org.id))
            wallet = result.scalar_one_or_none()
            if not wallet:
                wallet = Wallet(
                    organization_id=org.id,
                    balance=Decimal("10.00"), 
                    currency="GHS",
                    payg_credits=Decimal("10.00")
                )
                db.add(wallet)
                print(f"Initialized wallet for organization: {org.name}")
        
        await db.commit()
        print("Billing seed completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_billing())
