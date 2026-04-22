import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import delete
from app.core.config import settings
from app.db.models import SMSMessage, Campaign, BillingLedger, Contact, Notification, DeliveryReportLog

async def purge_data():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        print("Purging test data for production...")
        
        # Order matters for foreign keys
        await session.execute(delete(DeliveryReportLog))
        await session.execute(delete(SMSMessage))
        await session.execute(delete(Campaign))
        await session.execute(delete(Contact))
        await session.execute(delete(BillingLedger))
        await session.execute(delete(Notification))
        
        await session.commit()
    
    print("Purge complete. Your database is now production-ready.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(purge_data())
