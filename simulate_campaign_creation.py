
import asyncio
import traceback
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Campaign, CampaignStatus, SenderID, SenderIDStatus, User, Organization
from app.schemas.schemas import CampaignCreate

async def simulate_create_campaign():
    async with SessionLocal() as db:
        try:
            # 1. Mock inputs
            # We'll try to find a real user and org first
            user_res = await db.execute(select(User).limit(1))
            user = user_res.scalar_one_or_none()
            if not user:
                print("No user found in DB, skipping simulation.")
                return
                
            print(f"Simulating for user: {user.email} (Org ID: {user.organization_id})")
            
            # Find an approved sender ID for this org
            sid_res = await db.execute(select(SenderID).where(
                SenderID.organization_id == user.organization_id,
                SenderID.status == SenderIDStatus.APPROVED
            ))
            sid = sid_res.scalar_one_or_none()
            
            if not sid:
                print(f"No approved Sender ID found for org {user.organization_id}")
                # We can't proceed with full validation if no sid exists, 
                # but we can try the Campaign creation part with a dummy sid.
                sid_name = "NEXRA"
            else:
                sid_name = sid.sender_id
                print(f"Using approved SID: {sid_name}")

            # 2. Campaign Creation Logic
            print("Step: Creating Campaign object...")
            campaign_in = CampaignCreate(
                name="Test Campaign Simulation",
                sender=sid_name,
                template="Hello simulation",
                contact_ids=[1, 2, 3] # Dummy IDs
            )
            
            db_obj = Campaign(
                name=campaign_in.name,
                sender=campaign_in.sender,
                template=campaign_in.template,
                scheduled_at=campaign_in.scheduled_at,
                organization_id=user.organization_id,
                user_id=user.id,
                contact_ids=campaign_in.contact_ids,
                status=CampaignStatus.DRAFT
            )
            print("Successfully instantiated Campaign object.")
            
            db.add(db_obj)
            print("Step: Committing to DB...")
            await db.commit()
            print("Successfully committed.")
            
            await db.refresh(db_obj)
            print(f"Successfully refreshed. ID: {db_obj.id}")
            
        except Exception as e:
            print("\n!!! SIMULATION FAILED !!!")
            print(f"Error: {type(e).__name__}: {str(e)}")
            traceback.print_exc()
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(simulate_create_campaign())
