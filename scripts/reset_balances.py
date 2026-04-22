import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import update
from app.core.config import settings
from app.db.models import Wallet

async def reset_balances():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        print("Resetting all wallet balances to 0.00...")
        
        # Reset all wallets to zero
        await session.execute(
            update(Wallet).values(
                balance=0.0,
                subscription_credits=0.0,
                payg_credits=0.0
            )
        )
        
        await session.commit()
    
    print("All balances reset successfully.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_balances())
