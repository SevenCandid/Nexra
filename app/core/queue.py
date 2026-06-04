# from rq import Queue, Retry
# from app.core.redis import redis_client
import logging
logger = logging.getLogger(__name__)

# Define mock queues for windows local development
# sms_queue = Queue("sms_high_priority", connection=redis_client)
# batch_queue = Queue("sms_batch", connection=redis_client)
# dlq_queue = Queue("failed", connection=redis_client)
# dlr_queue = Queue("dlr_processing", connection=redis_client)

# Retry strategy: 1m, 5m, 15m
# default_retry = Retry(max=3, interval=[60, 300, 900])

async def enqueue_sms(sms_id: int):
    """Mock Enqueue a single SMS for processing asynchronously."""
    logger.info(f"[MOCK QUEUE] Processing SMS {sms_id} in background task...")
    from app.workers.sms_worker import _async_process_sms
    import asyncio
    
    # Run the worker process cleanly in the background
    asyncio.ensure_future(_async_process_sms(sms_id))

async def enqueue_batch(campaign_id: int):
    """Enqueue a campaign batch for processing."""
    logger.info(f"[MOCK QUEUE] Processing Batch {campaign_id} in background task...")
    from app.workers.sms_worker import process_campaign_batch
    import asyncio
    
    # Run the worker process cleanly in the background
    asyncio.ensure_future(process_campaign_batch(campaign_id))

async def enqueue_dlr(dlr_data: dict):
    """Mock Enqueue a delivery report for processing."""
    from app.workers.dlr_worker import process_delivery_report
    import asyncio

    logger.info(f"[MOCK QUEUE] Processing DLR {dlr_data} in background task...")
    asyncio.create_task(asyncio.to_thread(process_delivery_report, dlr_data))

