import asyncio
from app.db.session import SessionLocal, engine
from app.db.models import Base, User, Wallet, SMPPAccount
from app.core import security

async def init_db():
    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
    
    async with SessionLocal() as db:
        # 1. Create Default Admin User
        admin_email = "admin@nexra.com"
        result = await db.get(User, 1) # Simple check if ID 1 exists
        if not result:
            admin_user = User(
                email=admin_email,
                hashed_password=security.get_password_hash("NexraAdmin2026!"),
                full_name="NEXRA Admin",
                is_active=True,
                is_superuser=True,
                api_key=security.generate_api_key()
            )
            db.add(admin_user)
            await db.flush()
            
            # Create Wallet
            wallet = Wallet(user_id=admin_user.id, balance=1000.0)
            db.add(wallet)
            
            print(f"Created admin user: {admin_email}")
            print(f"Admin API Key: {admin_user.api_key}")
        
        # 2. Create MNO Accounts (Seed)
        mno_data = [
            {
                "provider_name": "MTN Ghana",
                "host": "127.0.0.1",
                "port": 2775,
                "system_id": "nexra_mtn",
                "password": "mtn_password",
                "system_type": "VMA"
            },
            {
                "provider_name": "Vodafone Ghana",
                "host": "127.0.0.1",
                "port": 2776,
                "system_id": "nexra_vod",
                "password": "vod_password",
                "system_type": "VMA"
            }
        ]
        
        for mno in mno_data:
            # Check if exists
            import sqlalchemy as sa
            exists = await db.execute(sa.select(sa.exists().where(SMPPAccount.provider_name == mno["provider_name"])))
            if not exists.scalar():
                db.add(SMPPAccount(**mno))
                print(f"Added MNO Account: {mno['provider_name']}")
        
        await db.commit()

if __name__ == "__main__":
    asyncio.run(init_db())
