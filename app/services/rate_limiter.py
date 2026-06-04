import asyncio
import time
from app.core.redis import redis_client
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Sliding window rate limiter using Redis.
    Ensures organizations and MNO routes don't exceed their TPS limits.
    """

    _redis_disabled = False
    _redis_warning_emitted = False

    @staticmethod
    async def is_allowed(key: str, limit: int, period: int = 1) -> bool:
        """
        Check if an action is allowed based on the limit and period.
        - key: Unique identifier (e.g., "org:123" or "mno:mtn")
        - limit: Max allowed actions in the period
        - period: Time window in seconds
        """
        now = time.time()
        if redis_client is None or RateLimiter._redis_disabled:
            if not RateLimiter._redis_warning_emitted:
                logger.warning("RateLimiter: Redis is not configured or disabled, bypassing limit check.")
                RateLimiter._redis_warning_emitted = True
            return True
        try:
            pipeline = redis_client.pipeline()
            
            # Remove old entries outside the window
            pipeline.zremrangebyscore(key, 0, now - period)
            # Count current entries
            pipeline.zcard(key)
            # Add current entry
            pipeline.zadd(key, {str(now): now})
            # Set expiration for the key
            pipeline.expire(key, period + 1)
            
            results = await pipeline.execute()
            current_count = results[1]
            
            return current_count < limit
        except Exception as e:
            # Fallback: If Redis is down, allow the action but log a warning
            logger.warning(f"RateLimiter: Redis failed, bypassing limit check: {e}")
            RateLimiter._redis_disabled = True
            return True

    @staticmethod
    async def wait_for_slot(key: str, limit: int, period: int = 1, timeout: int = 10):
        """Poll until a slot is available or timeout is reached."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if await RateLimiter.is_allowed(key, limit, period):
                return True
            await asyncio.sleep(0.1)
        return False
