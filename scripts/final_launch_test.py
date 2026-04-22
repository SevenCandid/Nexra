import asyncio
import sys
import os
from sqlalchemy import select
from datetime import datetime

# Add the root directory to sys.path to allow imports
sys.path.append(os.getcwd())

from app.db.database import SessionLocal
from app.db.models import User, Organization, Campaign, SMSMessage, MessageStatus, CampaignStatus
from app.workers.sms_worker import _async_process_sms

async def run_final_test():
    async with SessionLocal() as db:
        # 1. Get the main user
        result = await db.execute(select(User).where(User.email == "frankbediako38@gmail.com"))
        user = result.scalar_one_or_none()
        
        if not user:
            print("[ERROR] User not found. Please make sure you have logged in once.")
            return

        print(f"[OK] Found user: {user.email}")

        # 2. Create a Test Campaign
        test_campaign = Campaign(
            name=f"Final Launch Test {datetime.now().strftime('%H:%M')}",
            sender="Arkesel",
            template="Hello NEXRA! Your production system is officially ready. Status flow test.",
            organization_id=user.organization_id,
            user_id=user.id,
            status=CampaignStatus.SENDING,
            total_recipients=1,
            contact_ids=[0] # Dummy
        )
        db.add(test_campaign)
        await db.commit()
        await db.refresh(test_campaign)
        
        print(f"[CAMPAIGN] Created: '{test_campaign.name}' (Status: {test_campaign.status})")

        # 3. Create the Message (PENDING)
        msg = SMSMessage(
            sender=test_campaign.sender,
            recipient="233241234567",
            content=test_campaign.template,
            status=MessageStatus.PENDING,
            provider_name="Arkesel", # Fixed: Required column
            user_id=user.id,
            organization_id=user.organization_id,
            campaign_id=test_campaign.id
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        
        print(f"[MESSAGE] Created: (Status: {msg.status})")

        # 4. Simulate the Worker
        print("\n[WORKER] Processing SMS...")
        # Step 1: Processing
        await _async_process_sms(msg.id)
        
        # Check new status
        await db.refresh(msg)
        print(f"[STATUS UPDATE] Message Status is now -> {msg.status.upper()}")
        
        # Step 2: Campaign Update
        await db.refresh(test_campaign)
        print(f"[STATUS UPDATE] Campaign Status is now -> {test_campaign.status.upper()}")

        print("\n[SUCCESS] Test Complete! Check your Dashboard now to see the unified labels.")

if __name__ == "__main__":
    asyncio.run(run_final_test())
