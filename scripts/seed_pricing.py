import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.models import NetworkPricing

async def seed_pricing():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    networks = [
        {"name": "MTN Ghana", "rate": 0.04},
        {"name": "Telecel (Vodafone)", "rate": 0.04},
        {"name": "AirtelTigo", "rate": 0.04},
        {"name": "Other Networks", "rate": 0.04}
    ]
    
    async with AsyncSessionLocal() as session:
        print("Seeding Network Pricing...")
        for net in networks:
            # Check if exists
            from sqlalchemy import select
            result = await session.execute(select(NetworkPricing).where(NetworkPricing.network_name == net["name"]))
            existing = result.scalar_one_or_none()
            
            if not existing:
                pricing = NetworkPricing(
                    network_name=net["name"],
                    cost_per_sms=net["rate"],
                    currency="GHS",
                    is_active=True
                )
                session.add(pricing)
                print(f"Added {net['name']} at {net['rate']} GHS")
            else:
                existing.cost_per_sms = net["rate"]
                print(f"Updated {net['name']} to {net['rate']} GHS")
        
        await session.commit()
    
    print("Pricing seeded successfully.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_pricing())
