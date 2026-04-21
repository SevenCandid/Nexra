import random
import string
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.db.models import User, StaffInvite, UserRole
from app.db.database import get_db
from app.schemas.schemas import StaffInviteResponse

router = APIRouter()

def generate_staff_id() -> str:
    """Generate a random 7-character staff ID starting with NEX-"""
    # NEX- (4 chars) + 3 random digits/chars = 7 chars
    suffix = ''.join(random.choices(string.digits, k=3))
    return f"NEX-{suffix}"

@router.post("/invites", response_model=StaffInviteResponse)
async def create_staff_invite(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Generate a new unique Staff ID for invitation.
    Only Superadmin can generate these.
    """
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the platform Superadmin can generate staff invitations."
        )

    # Try to generate a unique ID
    for _ in range(10): # retry a few times if collision
        staff_id = generate_staff_id()
        result = await db.execute(select(StaffInvite).where(StaffInvite.staff_id == staff_id))
        if not result.scalar_one_or_none():
            break
    else:
        raise HTTPException(status_code=500, detail="Failed to generate a unique Staff ID. Try again.")

    invite = StaffInvite(
        staff_id=staff_id,
        is_used=False,
        created_at=datetime.utcnow()
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return invite

@router.get("/invites", response_model=List[StaffInviteResponse])
async def list_staff_invites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List all staff invitation IDs and their status.
    Only Superadmin can view this list.
    """
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    result = await db.execute(select(StaffInvite).order_by(StaffInvite.created_at.desc()))
    return result.scalars().all()
