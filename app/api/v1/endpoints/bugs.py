from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.api import deps
from app.db.database import get_db
from app.db.models import BugReport, User
from app.schemas.schemas import BugReportCreate, BugReportOut, BugReportUpdate

router = APIRouter()

@router.post("/", response_model=BugReportOut)
async def submit_bug_report(
    bug_in: BugReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Submit a new bug report.
    """
    new_bug = BugReport(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        subject=bug_in.subject,
        description=bug_in.description
    )
    db.add(new_bug)
    await db.commit()
    await db.refresh(new_bug)
    return new_bug

@router.get("/", response_model=List[BugReportOut])
async def list_bug_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_platform_manager)
):
    """
    Superadmin only: List all bug reports.
    """
    result = await db.execute(select(BugReport).order_by(desc(BugReport.created_at)))
    bugs = result.scalars().all()
    return bugs

@router.patch("/{bug_id}", response_model=BugReportOut)
async def update_bug_report(
    bug_id: int,
    bug_in: BugReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_platform_manager)
):
    """
    Superadmin only: Update the status of a bug report.
    """
    result = await db.execute(select(BugReport).where(BugReport.id == bug_id))
    bug = result.scalar_one_or_none()
    
    if not bug:
        raise HTTPException(status_code=404, detail="Bug report not found")
        
    bug.status = bug_in.status
    await db.commit()
    await db.refresh(bug)
    
    # Optional: Log this action using deps.log_admin_action if we wanted to
    return bug
