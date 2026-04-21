"""
Quick setup script to create database tables and seed initial data.
Run this before starting the server for the first time.
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.db.models import Base
from app.seed_billing_data import seed_network_pricing, seed_subscription_plans

async def init_db():
    """Initialize database tables."""
    print("[*] Creating database tables...")
    
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)
    
    async with engine.begin() as conn:
        # Drop all tables to ensure a clean sync
        print("[*] Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        
        # Create all tables
        print("[*] Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
    
    print("[+] Database tables created successfully!")
    
    # Seed initial data
    print("\n[*] Seeding initial data...")
    await seed_network_pricing()
    await seed_subscription_plans()
    
    print("\n[+] Setup complete! You can now start the server.")
    print("    Run: uvicorn app.main:app --reload")

if __name__ == "__main__":
    asyncio.run(init_db())
