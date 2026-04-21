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
    # Startup: Initialize gateways and start workers
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
app.add_middleware(SlowAPIMiddleware)

@app.get("/")
async def root():
    return {"message": "NEXRA Messaging API is running"}

# Set up CORS - Explicitly list origins when using allow_credentials=True
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_STR)

# Serve the dashboard as static files
app.mount("/nexra-dashboard", StaticFiles(directory="nexra-dashboard"), name="nexra-dashboard")
# For demonstration purposes, I'll include the example router directly if not in api_router
# Usually api_router would include it.
# Trigger Reload
