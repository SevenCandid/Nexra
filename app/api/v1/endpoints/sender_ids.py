from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.core.config import settings
from app.db.database import get_db
from app.db.models import User, Organization, SenderID, SenderIDStatus, Notification
from app.schemas.schemas import SenderIDRequest, SenderIDResponse, SenderIDUpdate
from app.services.audit import log_action
from app.services.email_service import send_sender_id_status_email

router = APIRouter()
UPLOAD_ROOT = Path("uploads") / "sender-id-verifications"


def _verification_link(sender_id_id: int) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/#/sender-ids/verify/{sender_id_id}"


def _safe_org(user: User) -> dict:
    org = getattr(user, "organization", None)
    plan = org.__dict__.get("plan") if org else None
    return {
        "organization_id": org.id if org else user.organization_id,
        "name": org.name if org else None,
        "slug": org.slug if org else None,
        "plan_name": plan.name if plan else None,
        "plan_slug": plan.slug if plan else None,
    }


def _build_application_snapshot(user: User, sender_in: SenderIDRequest) -> dict:
    return {
        "requester": {
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "role": user.role,
        },
        "organization": _safe_org(user),
        "request": {
            "sender_id": sender_in.sender_id,
            "company_name": sender_in.company_name,
            "username": sender_in.username,
            "use_case": sender_in.use_case,
            "website_or_social": sender_in.website_or_social,
            "official_email": str(sender_in.official_email) if sender_in.official_email else None,
            "registration_certificate": sender_in.registration_certificate,
            "authorization_letter": sender_in.authorization_letter,
        },
    }


def _build_application_summary(snapshot: dict) -> str:
    requester = snapshot.get("requester", {})
    org = snapshot.get("organization", {})
    req = snapshot.get("request", {})
    return "\n".join(
        [
            f"Requester: {requester.get('full_name') or 'Unknown'} ({requester.get('email') or 'no email'})",
            f"Phone: {requester.get('phone_number') or 'Not provided'}",
            f"Organization: {org.get('name') or 'Unknown'}",
            f"Plan: {org.get('plan_name') or 'Unassigned'}",
            f"Sender ID: {req.get('sender_id') or 'Unknown'}",
            f"Company/Username: {req.get('company_name') or req.get('username') or 'Not provided'}",
            f"Use Case: {req.get('use_case') or 'Not provided'}",
            f"Official Email: {req.get('official_email') or 'Not provided'}",
            f"Website/Social: {req.get('website_or_social') or 'Not provided'}",
        ]
    )


def _summarize_snapshot(snapshot: dict) -> str:
    summary = _build_application_summary(snapshot)
    return summary.replace("\n", " | ")


async def _save_upload(sender_id_id: int, upload: UploadFile) -> str:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    request_dir = UPLOAD_ROOT / str(sender_id_id)
    request_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(upload.filename or "").suffix.lower()
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    dest = request_dir / safe_name
    content = await upload.read()
    dest.write_bytes(content)
    return str(dest)


@router.post("", response_model=SenderIDResponse)
async def request_sender_id(
    sender_in: SenderIDRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Request a new Sender ID for approval.
    """
    query = select(SenderID).where(
        SenderID.sender_id == sender_in.sender_id,
        SenderID.organization_id == current_user.organization_id,
    )
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Sender ID already requested or exists.")

    db_obj = SenderID(
        sender_id=sender_in.sender_id,
        company_name=sender_in.company_name,
        username=sender_in.username,
        use_case=sender_in.use_case,
        website_or_social=sender_in.website_or_social,
        official_email=str(sender_in.official_email) if sender_in.official_email else None,
        registration_certificate=sender_in.registration_certificate,
        authorization_letter=sender_in.authorization_letter,
        application_snapshot=_build_application_snapshot(current_user, sender_in),
        status=SenderIDStatus.PENDING.value,
        organization_id=current_user.organization_id,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


from pydantic import BaseModel
class AdminSenderIDAdd(BaseModel):
    sender_id: str

@router.post("/admin-add", response_model=SenderIDResponse)
async def admin_add_sender_id(
    sender_in: AdminSenderIDAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Instantly add an approved Sender ID (SuperAdmin only).
    """
    from app.db.models import UserRole
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only admins can perform this action.")

    query = select(SenderID).where(
        SenderID.sender_id == sender_in.sender_id,
        SenderID.organization_id == current_user.organization_id,
    )
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Sender ID already exists.")

    db_obj = SenderID(
        sender_id=sender_in.sender_id,
        status=SenderIDStatus.APPROVED.value,
        organization_id=current_user.organization_id,
        purpose="Manually added by Admin",
        requested_by=current_user.id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj



@router.get("", response_model=List[SenderIDResponse])
async def list_sender_ids(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    List all Sender IDs for the user's organization.
    """
    query = (
        select(SenderID)
        .where(SenderID.organization_id == current_user.organization_id)
        .order_by(SenderID.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/admin/pending", response_model=List[SenderIDResponse])
async def list_pending_sender_ids(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_sender_ids")),
):
    """
    Staff/Admin view: List all pending Sender ID requests.
    """
    query = (
        select(SenderID, Organization.name.label("organization_name"))
        .join(Organization)
        .where(SenderID.status == SenderIDStatus.PENDING.value)
        .order_by(SenderID.created_at.asc())
    )
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
    admin: User = Depends(deps.require_permission("manage_sender_ids")),
):
    """
    Staff/Admin view: List all Sender ID requests (history).
    """
    query = (
        select(SenderID, Organization.name.label("organization_name"))
        .join(Organization)
        .order_by(SenderID.created_at.desc())
    )
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
    admin: User = Depends(deps.require_permission("manage_sender_ids")),
):
    """
    Staff/Admin action: Approve, request verification, or reject a Sender ID.
    Also triggers an in-app notification and optionally an email.
    """
    valid_statuses = {
        SenderIDStatus.PENDING.value,
        SenderIDStatus.NEED_VERIFICATION.value,
        SenderIDStatus.APPROVED.value,
        SenderIDStatus.REJECTED.value,
    }
    if update_in.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid sender ID status.")

    query = select(SenderID).where(SenderID.id == id)
    result = await db.execute(query)
    db_obj = result.scalar_one_or_none()

    if not db_obj:
        raise HTTPException(status_code=404, detail="Sender ID request not found.")

    db_obj.status = update_in.status
    db_obj.admin_comment = update_in.admin_comment
    db_obj.updated_at = datetime.utcnow()

    link = "#/sender-ids"
    if update_in.status == SenderIDStatus.NEED_VERIFICATION.value:
        link = f"#/sender-ids/verify/{db_obj.id}"

    label_map = {
        SenderIDStatus.APPROVED.value: ("Approved", "approved", "success"),
        SenderIDStatus.NEED_VERIFICATION.value: ("Need Verification", "needs verification", "warning"),
        SenderIDStatus.REJECTED.value: ("Rejected", "rejected", "error"),
        SenderIDStatus.PENDING.value: ("Pending", "pending review", "info"),
    }
    title_label, message_label, notif_type = label_map.get(update_in.status, (update_in.status, update_in.status, "info"))
    snapshot = db_obj.application_snapshot or {}
    summary_text = _summarize_snapshot(snapshot) if snapshot else ""

    org_users_result = await db.execute(
        select(User).where(User.organization_id == db_obj.organization_id, User.is_active == True)
    )
    org_users = org_users_result.scalars().all()

    for org_user in org_users:
        comment_text = f" Admin comment: {update_in.admin_comment}" if update_in.admin_comment else ""
        summary_text_part = f" Summary: {summary_text}" if summary_text else ""
        notification = Notification(
            title=f"Sender ID '{db_obj.sender_id}' {title_label.lower()}",
            message=(
                f"Your Sender ID request for '{db_obj.sender_id}' has been {message_label}."
                f"{comment_text}{summary_text_part}"
            ),
            type=notif_type,
            user_id=org_user.id,
            organization_id=db_obj.organization_id,
            link=link,
        )
        db.add(notification)

    await log_action(
        db,
        admin,
        action=f"{update_in.status}_sender_id",
        target_type="sender_id",
        target_id=db_obj.id,
        details={
            "sender_id": db_obj.sender_id,
            "comment": update_in.admin_comment,
            "application_snapshot": snapshot,
        },
    )

    await db.commit()
    await db.refresh(db_obj)

    verification_url = _verification_link(db_obj.id) if update_in.status == SenderIDStatus.NEED_VERIFICATION.value else None

    for org_user in org_users:
        await send_sender_id_status_email(
            to_email=org_user.email,
            sender_id=db_obj.sender_id,
            status=update_in.status,
            comment=update_in.admin_comment,
            verification_url=verification_url,
        )

    return db_obj


@router.post("/{id}/verification", response_model=SenderIDResponse)
async def submit_sender_id_verification(
    id: int,
    company_name: str = Form(...),
    username: str = Form(...),
    use_case: str = Form(...),
    website_or_social: Optional[str] = Form(None),
    official_email: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    registration_certificate: Optional[UploadFile] = File(None),
    authorization_letter: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Submit supporting verification documents for a Sender ID that needs review.
    """
    query = select(SenderID).where(
        SenderID.id == id,
        SenderID.organization_id == current_user.organization_id,
    )
    result = await db.execute(query)
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Sender ID request not found.")

    if db_obj.status != SenderIDStatus.NEED_VERIFICATION.value:
        raise HTTPException(
            status_code=400,
            detail="Verification documents can only be submitted after a request is marked as need verification.",
        )

    payload = {
        "company_name": company_name,
        "username": username,
        "use_case": use_case,
        "website_or_social": website_or_social,
        "official_email": official_email,
        "notes": notes,
        "submitted_at": datetime.utcnow().isoformat(),
    }

    if registration_certificate:
        payload["registration_certificate_file"] = await _save_upload(id, registration_certificate)
    if authorization_letter:
        payload["authorization_letter_file"] = await _save_upload(id, authorization_letter)

    db_obj.company_name = company_name
    db_obj.username = username
    db_obj.use_case = use_case
    db_obj.website_or_social = website_or_social
    db_obj.official_email = official_email
    db_obj.verification_payload = payload
    db_obj.verification_submitted_at = datetime.utcnow()
    db_obj.registration_certificate = payload.get("registration_certificate_file") or db_obj.registration_certificate
    db_obj.authorization_letter = payload.get("authorization_letter_file") or db_obj.authorization_letter
    db_obj.updated_at = datetime.utcnow()

    org_users_result = await db.execute(
        select(User).where(User.organization_id == db_obj.organization_id, User.is_active == True)
    )
    for org_user in org_users_result.scalars().all():
        db.add(
            Notification(
                title=f"Verification submitted for '{db_obj.sender_id}'",
                message=f"Verification documents were submitted for '{db_obj.sender_id}'.",
                type="info",
                user_id=org_user.id,
                organization_id=db_obj.organization_id,
                link="#/sender-ids",
            )
        )

    await log_action(
        db,
        current_user,
        action="submit_sender_id_verification",
        target_type="sender_id",
        target_id=db_obj.id,
        details={"sender_id": db_obj.sender_id, "payload": payload},
    )

    await db.commit()
    await db.refresh(db_obj)
    return db_obj
