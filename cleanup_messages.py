import asyncio
from sqlalchemy import delete, select
from app.db.database import SessionLocal
from app.db.models import SMSMessage, Campaign, CampaignStatus, MessageStatus

async def cleanup_orphaned_messages():
    """
    Deletes all PENDING messages that belong to campaigns 
    that are still in DRAFT or SCHEDULED status and haven't actually started sending.
    This cleans up the MESSAGES page.
    """
    async with SessionLocal() as db:
        # Find campaign IDs that are DRAFT or SCHEDULED
        stmt = select(Campaign.id).where(Campaign.status.in_([CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]))
        result = await db.execute(stmt)
        draft_campaign_ids = result.scalars().all()
        
        if not draft_campaign_ids:
            print("No draft/scheduled campaigns found. Nothing to clean.")
            return

        # Delete PENDING messages for those campaigns
        delete_stmt = delete(SMSMessage).where(
            SMSMessage.campaign_id.in_(draft_campaign_ids),
            SMSMessage.status == MessageStatus.PENDING
        )
        
        del_result = await db.execute(delete_stmt)
        await db.commit()
        
        print(f"Cleaned up {del_result.rowcount} orphaned pending messages.")

if __name__ == "__main__":
    asyncio.run(cleanup_orphaned_messages())
