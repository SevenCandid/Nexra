import asyncio
import time
from app.core.redis import redis_client

class RateLimiter:
    """
    Sliding window rate limiter using Redis.
    Ensures organizations and MNO routes don't exceed their TPS limits.
    """

    @staticmethod
    async def is_allowed(key: str, limit: int, period: int = 1) -> bool:
        """
        Check if an action is allowed based on the limit and period.
        - key: Unique identifier (e.g., "org:123" or "mno:mtn")
        - limit: Max allowed actions in the period
        - period: Time window in seconds
        """
        now = time.time()
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

    @staticmethod
    async def wait_for_slot(key: str, limit: int, period: int = 1, timeout: int = 10):
        """Poll until a slot is available or timeout is reached."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if await RateLimiter.is_allowed(key, limit, period):
                return True
            await asyncio.sleep(0.1)
        return False
