import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, or_, and_
from app.db.database import SessionLocal
from app.db.models import SMSMessage, MessageStatus
from app.core.queue import enqueue_sms

logger = logging.getLogger(__name__)

class RetryWorker:
    """
    Background worker that periodically checks for failed messages
    and attempts to resend them using exponential backoff.
    """

    def __init__(self, interval: int = 60, max_retries: int = 3):
        self.interval = interval
        self.max_retries = max_retries
        self.is_running = False

    async def start(self):
        self.is_running = True
        logger.info("Starting SMS Retry Worker...")
        while self.is_running:
            try:
                await self.process_retries()
            except Exception as e:
                logger.error(f"Error in Retry Worker: {str(e)}")
            
            await asyncio.sleep(self.interval)

    async def stop(self):
        self.is_running = False
        logger.info("Stopping SMS Retry Worker...")

    async def process_retries(self):
        """Fetch and process messages eligible for retry."""
        async with SessionLocal() as db:
            now = datetime.utcnow()
            stmt = select(SMSMessage).where(
                or_(
                    SMSMessage.status.in_([MessageStatus.FAILED, MessageStatus.NOT_DELIVERED]),
                    and_(
                        SMSMessage.status == MessageStatus.PENDING,
                        SMSMessage.next_retry_at.isnot(None)
                    )
                ),
                SMSMessage.retry_count < self.max_retries,
                SMSMessage.next_retry_at <= now
            )
            result = await db.execute(stmt)
            messages = result.scalars().all()

            if not messages:
                return

            logger.info(f"Retrying {len(messages)} messages...")

            for msg in messages:
                await self.retry_message(db, msg)
            
            await db.commit()

    async def retry_message(self, db, msg: SMSMessage):
        """Attempt to resend a single message."""
        try:
            msg.retry_count += 1
            logger.info(f"Retry attempt {msg.retry_count} for msg_id={msg.id}")

            # Schedule the next retry before handing the message back to the normal
            # SMS worker. That worker handles billing, provider submission, and DLR refunds.
            self.schedule_next_retry(msg)
            await db.commit()
            await enqueue_sms(msg.id)
            logger.info(f"Re-enqueued msg_id={msg.id} for resend")
        except Exception as e:
            logger.error(f"Failed to retry msg_id={msg.id}: {str(e)}")
            self.schedule_next_retry(msg)

    def schedule_next_retry(self, msg: SMSMessage):
        """Calculate next retry time with exponential backoff."""
        # Intervals: 1min, 5min, 15min, 1hr
        intervals = [1, 5, 15, 60, 240] 
        idx = min(msg.retry_count - 1, len(intervals) - 1)
        delay = intervals[idx]
        
        msg.next_retry_at = datetime.utcnow() + timedelta(minutes=delay)
        logger.info(f"Scheduled next retry for msg_id={msg.id} at {msg.next_retry_at}")

# Global instance
retry_worker = RetryWorker()
