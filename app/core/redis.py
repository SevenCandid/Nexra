import redis.asyncio as redis
from app.core.config import settings

redis_client = None

if settings.REDIS_URL:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
elif settings.REDIS_HOST and settings.REDIS_PORT:
    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        decode_responses=True
    )

async def get_redis():
    yield redis_client
