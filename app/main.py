import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1 import api_router
from app.workers.retry_worker import retry_worker
from app.workers.campaign_worker import campaign_worker
from app.services.gateway_manager import gateway_manager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables and workers
    from app.db.models import Base
    from app.db.database import engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    await gateway_manager.initialize_from_db()
    asyncio.create_task(retry_worker.start())
    asyncio.create_task(campaign_worker.start())
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
