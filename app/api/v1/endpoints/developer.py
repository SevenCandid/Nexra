import secrets
import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.db.database import get_db
from app.db.models import User, APIKey
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class APIKeyCreate(BaseModel):
    name: str

class APIKeyResponse(BaseModel):
    id: int
    name: str
    key_prefix: str
    created_at: datetime
    last_used_at: datetime | None
    is_active: bool

    class Config:
        from_attributes = True

class APIKeyFullResponse(APIKeyResponse):
    api_key: str # Only returned once upon creation

@router.get("/api-keys", response_model=List[APIKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """List all API keys for the current user's organization."""
    stmt = select(APIKey).where(
        APIKey.organization_id == current_user.organization_id
    ).order_by(APIKey.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/api-keys", response_model=APIKeyFullResponse)
async def create_api_key(
    payload: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Generate a new API key."""
    # Generate a secure key
    raw_key = f"nx_{secrets.token_urlsafe(32)}"
    key_prefix = raw_key[:12] # nx_ + first 9 chars
    hashed_key = hashlib.sha256(raw_key.encode()).hexdigest()
    
    new_key = APIKey(
        name=payload.name,
        key_prefix=key_prefix,
        hashed_key=hashed_key,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    
    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)
    
    # Manually build response to include the raw key (once)
    return APIKeyFullResponse(
        id=new_key.id,
        name=new_key.name,
        key_prefix=new_key.key_prefix,
        created_at=new_key.created_at,
        last_used_at=new_key.last_used_at,
        is_active=new_key.is_active,
        api_key=raw_key
    )

@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Revoke (delete) an API key."""
    stmt = select(APIKey).where(
        APIKey.id == key_id,
        APIKey.organization_id == current_user.organization_id
    )
    result = await db.execute(stmt)
    db_key = result.scalar_one_or_none()
    
    if not db_key:
        raise HTTPException(status_code=404, detail="API Key not found")
        
    await db.delete(db_key)
    await db.commit()
    return None

# --- WEBHOOKS ---

from app.db.models import WebhookSubscription

class WebhookCreate(BaseModel):
    url: str
    events: List[str] = ["message.sent", "message.delivered", "message.failed"]

class WebhookResponse(BaseModel):
    id: int
    url: str
    events: List[str]
    secret: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/webhooks", response_model=List[WebhookResponse])
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """List all webhooks for the current user's organization."""
    stmt = select(WebhookSubscription).where(
        WebhookSubscription.organization_id == current_user.organization_id
    ).order_by(WebhookSubscription.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/webhooks", response_model=WebhookResponse)
async def create_webhook(
    payload: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Register a new webhook subscription."""
    # Generate a signing secret
    secret = secrets.token_urlsafe(32)
    
    new_sub = WebhookSubscription(
        url=payload.url,
        events=payload.events,
        secret=secret,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    
    db.add(new_sub)
    try:
        await db.commit()
        await db.refresh(new_sub)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Webhook for this URL already exists")
    
    return new_sub

@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Delete a webhook subscription."""
    stmt = select(WebhookSubscription).where(
        WebhookSubscription.id == webhook_id,
        WebhookSubscription.organization_id == current_user.organization_id
    )
    result = await db.execute(stmt)
    db_sub = result.scalar_one_or_none()
    
    if not db_sub:
        raise HTTPException(status_code=404, detail="Webhook not found")
        
    await db.delete(db_sub)
    await db.commit()
    return None
