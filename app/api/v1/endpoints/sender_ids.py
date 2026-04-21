from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import User, Organization, SenderID, SenderIDStatus, Notification
from app.db.database import get_db
from app.api import deps
from app.schemas.schemas import SenderIDRequest, SenderIDResponse, SenderIDUpdate
from app.services.audit import log_action
from app.services.email_service import send_sender_id_status_email
from typing import List
from datetime import datetime
import asyncio

router = APIRouter()

@router.post("", response_model=SenderIDResponse)
async def request_sender_id(
    sender_in: SenderIDRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Request a new Sender ID for approval.
    """
    query = select(SenderID).where(
        SenderID.sender_id == sender_in.sender_id,
        SenderID.organization_id == current_user.organization_id
    )
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Sender ID already requested or exists.")

    db_obj = SenderID(
        sender_id=sender_in.sender_id,
        status=SenderIDStatus.PENDING,
        organization_id=current_user.organization_id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("", response_model=List[SenderIDResponse])
async def list_sender_ids(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    List all Sender IDs for the user's organization.
    """
    query = select(SenderID).where(SenderID.organization_id == current_user.organization_id)
    result = await db.execute(query)
    return result.scalars().all()

# --- ADMIN ENDPOINTS ---

@router.get("/admin/pending", response_model=List[SenderIDResponse])
async def list_pending_sender_ids(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_sender_ids"))
):
    """
    Staff/Admin view: List all pending Sender ID requests.
    """
    query = select(SenderID, Organization.name.label("organization_name")).join(Organization).where(SenderID.status == SenderIDStatus.PENDING)
    result = await db.execute(query)
    
    output = []
    for row in result.all():
        obj = row[0]
        obj.organization_name = row[1]
        output.append(obj)
    return output

@router.get("/admin/history", response_model=List[SenderIDResponse])
async def list_all_sender_ids(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_sender_ids"))
):
    """
    Staff/Admin view: List all Sender ID requests (history).
    """
    query = select(SenderID, Organization.name.label("organization_name")).join(Organization).order_by(SenderID.created_at.desc())
    result = await db.execute(query)
    
    output = []
    for row in result.all():
        obj = row[0]
        obj.organization_name = row[1]
        output.append(obj)
    return output

@router.patch("/{id}/status", response_model=SenderIDResponse)
async def update_sender_id_status(
    id: int,
    update_in: SenderIDUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_sender_ids"))
):
    """
    Staff/Admin action: Approve or Reject a Sender ID.
    Also triggers an in-app notification and optionally an email.
    """
    query = select(SenderID).where(SenderID.id == id)
    result = await db.execute(query)
    db_obj = result.scalar_one_or_none()
    
    if not db_obj:
        raise HTTPException(status_code=404, detail="Sender ID request not found.")

    old_status = db_obj.status
    db_obj.status = update_in.status
    db_obj.admin_comment = update_in.admin_comment
    db_obj.updated_at = datetime.utcnow()

    # Create in-app notification for the org's users
    status_label = "approved ✅" if update_in.status == "approved" else "rejected ❌"
    notif_type = "success" if update_in.status == "approved" else "error"
    
    # Fetch org users to notify
    org_users_result = await db.execute(
        select(User).where(User.organization_id == db_obj.organization_id, User.is_active == True)
    )
    org_users = org_users_result.scalars().all()

    for org_user in org_users:
        comment_text = f" Admin comment: {update_in.admin_comment}" if update_in.admin_comment else ""
        notification = Notification(
            title=f"Sender ID '{db_obj.sender_id}' {status_label}",
            message=f"Your Sender ID request for '{db_obj.sender_id}' has been {update_in.status}.{comment_text}",
            type=notif_type,
            user_id=org_user.id,
            organization_id=db_obj.organization_id,
            link="/sender-ids"
        )
        db.add(notification)

    # Audit log
    await log_action(
        db, admin,
        action=f"{update_in.status}_sender_id",
        target_type="sender_id",
        target_id=db_obj.id,
        details={"sender_id": db_obj.sender_id, "comment": update_in.admin_comment}
    )

    await db.commit()
    await db.refresh(db_obj)

    # Fire-and-forget email notifications to all org users
    for org_user in org_users:
        asyncio.create_task(send_sender_id_status_email(
            to_email=org_user.email,
            sender_id=db_obj.sender_id,
            status=update_in.status,
            comment=update_in.admin_comment
        ))

    return db_obj
