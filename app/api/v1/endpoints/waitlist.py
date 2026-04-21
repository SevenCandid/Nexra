from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.database import get_db
from app.schemas.schemas import WaitlistCreate, WaitlistResponse
from app.db.models import Waitlist
from datetime import datetime
import re

router = APIRouter()

def is_valid_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

@router.post("/waitlist", response_model=WaitlistResponse)
async def join_waitlist(
    waitlist_data: WaitlistCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Add email to waitlist
    """
    # Validate email
    if not is_valid_email(waitlist_data.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Check if email already exists
    result = await db.execute(select(Waitlist).filter(Waitlist.email == waitlist_data.email.lower()))
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered on waitlist")
    
    # Get current position (count + 1)
    result = await db.execute(select(func.count()).select_from(Waitlist))
    count = result.scalar() or 0
    position = count + 1
    
    # Create waitlist entry
    waitlist_entry = Waitlist(
        email=waitlist_data.email.lower(),
        name=waitlist_data.name,
        company=waitlist_data.company,
        referral_source=waitlist_data.referral_source,
        position=position,
        signup_date=datetime.utcnow()
    )
    
    db.add(waitlist_entry)
    await db.commit()
    await db.refresh(waitlist_entry)
    
    return waitlist_entry


@router.get("/waitlist/count")
async def get_waitlist_count(db: AsyncSession = Depends(get_db)):
    """
    Get total waitlist count
    """
    result = await db.execute(select(func.count()).select_from(Waitlist))
    count = result.scalar() or 0
    return {"count": count}

@router.get("/waitlist", response_model=list[WaitlistResponse])
async def get_waitlist(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Get waitlist entries
    """
    result = await db.execute(select(Waitlist).offset(skip).limit(limit).order_by(Waitlist.position))
    waitlist_entries = result.scalars().all()
    return waitlist_entries
