import asyncio
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1 import api_router
from app.workers.retry_worker import retry_worker
from app.workers.campaign_worker import campaign_worker
from app.workers.resolve_worker import auto_resolve_loop
from app.services.gateway_manager import gateway_manager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


def log_redis_configuration() -> None:
    """
    Emit a startup warning when Redis is missing or still points at localhost.

    This makes Render misconfiguration obvious in the boot logs instead of only
    surfacing later as a rate-limiter fallback.
    """
    if settings.REDIS_URL:
        if any(host in settings.REDIS_URL for host in ("localhost", "127.0.0.1", "::1")):
            logger.warning(
                "Redis is configured to a local address via REDIS_URL=%s. "
                "On Render this will fail unless Redis is running on the same host.",
                settings.REDIS_URL,
            )
        else:
            logger.info("Redis is configured via REDIS_URL.")
        return

    if settings.REDIS_HOST:
        if settings.REDIS_HOST in {"localhost", "127.0.0.1", "::1"}:
            logger.warning(
                "Redis is configured to %s:%s. On Render this will fail unless Redis is local; "
                "set REDIS_URL to your managed Redis instance or clear REDIS_HOST/REDIS_PORT.",
                settings.REDIS_HOST,
                settings.REDIS_PORT,
            )
        else:
            logger.info(
                "Redis is configured via REDIS_HOST/REDIS_PORT (%s:%s).",
                settings.REDIS_HOST,
                settings.REDIS_PORT,
            )
        return

    logger.warning(
        "Redis is not configured. Rate limiting will bypass checks, and worker startup may "
        "need Redis if background queues are enabled."
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables and workers
    from app.db.models import Base
    from app.db.database import engine, AsyncSessionLocal
    from app.services.billing_service import BillingService
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await BillingService.ensure_pricing_catalog(db)
        
        # Automatically sync existing users to admin contacts on startup
        try:
            from app.api.v1.endpoints.auth import sync_user_to_admin_contacts
            from app.db.models import User
            from sqlalchemy import select
            
            stmt = select(User).where(User.phone_number.is_not(None))
            users = (await db.execute(stmt)).scalars().all()
            for user in users:
                await sync_user_to_admin_contacts(db, user)
            await db.commit()
            logger.info("Successfully synced existing users to admin contacts.")
        except Exception as e:
            logger.error(f"Failed to sync users on startup: {e}")

    log_redis_configuration()
    await gateway_manager.initialize_from_db()
    asyncio.create_task(retry_worker.start())
    asyncio.create_task(campaign_worker.start())
    asyncio.create_task(auto_resolve_loop())
    yield
    # Shutdown: Stop workers
    await retry_worker.stop()
    await campaign_worker.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_STR}/openapi.json",
    lifespan=lifespan
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# IMPORTANT: In Starlette, middleware added LAST wraps OUTERMOST (runs first).
# So CORS must be added AFTER SlowAPI to ensure it fires before rate-limit rejections.
app.add_middleware(SlowAPIMiddleware)

origins = [
    "http://localhost:8080",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:3000",
    "https://nexrasms.netlify.app",
]

# Add the configured frontend URL if it's not already there
if settings.FRONTEND_URL and settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)
    # Also add version with trailing slash just in case
    if not settings.FRONTEND_URL.endswith("/"):
        origins.append(f"{settings.FRONTEND_URL}/")

# Add CORS last so it is the outermost middleware (runs first on every request)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(api_router, prefix=settings.API_STR)

# Health check
@app.get("/")
async def root():
    return {"message": "NEXRA Messaging API is running", "status": "ok"}

# Serve the dashboard as static files
app.mount("/nexra-dashboard", StaticFiles(directory="nexra-dashboard", html=True), name="nexra-dashboard")
