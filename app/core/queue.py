# from rq import Queue, Retry
# from app.core.redis import redis_client
import logging
import asyncio

logger = logging.getLogger(__name__)

# Define mock queues for windows local development
# sms_queue = Queue("sms_high_priority", connection=redis_client)
# batch_queue = Queue("sms_batch", connection=redis_client)
# dlq_queue = Queue("failed", connection=redis_client)
# dlr_queue = Queue("dlr_processing", connection=redis_client)

# Internal memory queue for single-process async task execution
_sms_task_queue = asyncio.Queue()
_worker_started = False

async def _sms_worker_loop():
    logger.info("[SMS-QUEUE] Background worker loop started.")
    from app.workers.sms_worker import _async_process_sms
    while True:
        try:
            sms_id = await _sms_task_queue.get()
            try:
                await _async_process_sms(sms_id)
            except Exception as ex:
                logger.error(f"[SMS-QUEUE] Error processing SMS {sms_id}: {ex}", exc_info=True)
            finally:
                _sms_task_queue.task_done()
            
            # Stagger enqueued messages slightly to avoid database connection pool spikes and rate-limit triggers.
            # 0.2s pause gives an even send rate of 5 TPS.
            await asyncio.sleep(0.2)
        except Exception as e:
            logger.error(f"[SMS-QUEUE] Worker loop error: {e}", exc_info=True)
            await asyncio.sleep(1.0)

async def enqueue_sms(sms_id: int):
    """Enqueue a single SMS into the background worker queue."""
    global _worker_started
    if not _worker_started:
        _worker_started = True
        asyncio.create_task(_sms_worker_loop())
    
    await _sms_task_queue.put(sms_id)
    logger.info(f"[SMS-QUEUE] Enqueued SMS {sms_id}. Queue size: {_sms_task_queue.qsize()}")

async def enqueue_batch(campaign_id: int):
    """Enqueue a campaign batch for processing."""
    logger.info(f"[MOCK QUEUE] Processing Batch {campaign_id} in background task...")
    from app.workers.sms_worker import process_campaign_batch
    
    # Run the batch enqueuer process in the background
    asyncio.create_task(process_campaign_batch(campaign_id))

async def enqueue_dlr(dlr_data: dict):
    """Enqueue a delivery report for async processing.
    
    IMPORTANT: We call _async_process_dlr directly (not the sync wrapper)
    because we're already inside the async event loop. Using asyncio.to_thread
    with the sync wrapper (which calls asyncio.run) would deadlock.
    """
    from app.workers.dlr_worker import _async_process_dlr

    logger.info(f"[MOCK QUEUE] Processing DLR {dlr_data} in background task...")
    asyncio.create_task(_async_process_dlr(dlr_data))
