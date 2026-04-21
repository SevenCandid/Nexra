import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from app.db.database import SessionLocal
from app.db.models import Campaign, CampaignStatus
from app.core.queue import enqueue_batch

logger = logging.getLogger(__name__)

class CampaignWorker:
    """
    Background worker that checks for SCHEDULED campaigns 
    and triggers their broadcast when the time comes.
    """

    def __init__(self, interval: int = 60):
        self.interval = interval
        self.is_running = False

    async def start(self):
        self.is_running = True
        logger.info("Starting Campaign Scheduler Worker...")
        while self.is_running:
            try:
                await self.process_scheduled_campaigns()
            except Exception as e:
                logger.error(f"Error in Campaign Worker: {str(e)}")
            
            await asyncio.sleep(self.interval)

    async def stop(self):
        self.is_running = False
        logger.info("Stopping Campaign Scheduler Worker...")

    async def process_scheduled_campaigns(self):
        """Fetch and process campaigns eligible for broadcast."""
        async with SessionLocal() as db:
            now = datetime.utcnow()
            stmt = select(Campaign).where(
                Campaign.status == CampaignStatus.SCHEDULED.value,
                Campaign.scheduled_at <= now
            )
            result = await db.execute(stmt)
            campaigns = result.scalars().all()

            if not campaigns:
                return

            logger.info(f"Triggering {len(campaigns)} scheduled campaigns...")

            for campaign in campaigns:
                campaign.status = CampaignStatus.SENDING
                await db.commit()
                await enqueue_batch(campaign.id)
                logger.info(f"Campaign {campaign.id} moved to SENDING and enqueued")

# Global instance
campaign_worker = CampaignWorker()
