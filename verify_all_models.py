import asyncio
from sqlalchemy import text, select
from app.db.database import SessionLocal
from app.db.models import Campaign, SMSMessage

async def verify_models():
    async with SessionLocal() as db:
        print("Checking Campaign model...")
        try:
            await db.execute(select(Campaign).limit(1))
            print("Campaign model OK.")
        except Exception as e:
            print(f"Campaign model FAILED: {e}")

        print("\nChecking SMSMessage model...")
        try:
            await db.execute(select(SMSMessage).limit(1))
            print("SMSMessage model OK.")
        except Exception as e:
            print(f"SMSMessage model FAILED: {e}")
            
        # List all columns for campaigns
        print("\nCampaign columns in DB:")
        res = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns'"))
        print([r[0] for r in res.all()])
        
        # List all columns for sms_messages
        print("\nSMSMessage columns in DB:")
        res = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'sms_messages'"))
        print([r[0] for r in res.all()])

if __name__ == "__main__":
    asyncio.run(verify_models())
