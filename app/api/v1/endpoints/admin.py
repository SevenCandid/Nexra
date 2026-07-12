from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
import io
import csv
from app.api import deps
from app.db.database import get_db
from app.db.models import (
    User, SMSMessage, AdminAuditLog, SystemAnnouncement, 
    Organization, SMPPAccount
)
from datetime import datetime
from typing import List, Optional

router = APIRouter()

PRIORITY_ORDER = {
    "critical": 4,
    "high": 3,
    "normal": 2,
    "low": 1,
}


def _normalize_priority(value: Optional[str]) -> str:
    normalized = (value or "normal").strip().lower()
    return normalized if normalized in PRIORITY_ORDER else "normal"


def _sort_announcements(announcements):
    return sorted(
        announcements,
        key=lambda ann: (
            PRIORITY_ORDER.get(_normalize_priority(getattr(ann, "priority", None)), 2),
            getattr(ann, "created_at", datetime.utcnow()),
        ),
        reverse=True,
    )

# --- USERS ---

@router.get("/users")
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superadmin)
):
    """Get all registered users for superadmin."""
    query = select(User).options(selectinload(User.organization)).order_by(User.id.desc())
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone_number": u.phone_number,
            "role": u.role,
            "is_active": u.is_active,
            "organization_name": u.organization.name if u.organization else "N/A"
        }
        for u in users
    ]

@router.get("/users/export")
async def export_users(
    include_id: bool = True,
    include_name: bool = True,
    include_email: bool = True,
    include_phone: bool = True,
    include_role: bool = True,
    include_organization: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superadmin)
):
    """Export users to CSV."""
    query = select(User).options(selectinload(User.organization)).order_by(User.id.desc())
    result = await db.execute(query)
    users = result.scalars().all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = []
    if include_id: headers.append("ID")
    if include_name: headers.append("Name")
    if include_email: headers.append("Email")
    if include_phone: headers.append("Phone")
    if include_role: headers.append("Role")
    if include_organization: headers.append("Organization")
    
    writer.writerow(headers)
    
    for u in users:
        row = []
        if include_id: row.append(u.id)
        if include_name: row.append(u.full_name or "")
        if include_email: row.append(u.email or "")
        if include_phone: row.append(u.phone_number or "")
        if include_role: row.append(u.role)
        if include_organization: row.append(u.organization.name if u.organization else "N/A")
        writer.writerow(row)
        
    filename = f"nexra_users_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- AUDIT LOGS ---

@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 50,
    skip: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superadmin)
):
    """Get all administrative audit logs."""
    query = select(AdminAuditLog).order_by(desc(AdminAuditLog.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

# --- GLOBAL MESSAGE SEARCH ---

@router.get("/messages/search")
async def search_messages(
    q: str = Query(..., min_length=3),
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superadmin)
):
    """Global search for messages by recipient, sender, or content."""
    query = select(SMSMessage).where(
        or_(
            SMSMessage.recipient.ilike(f"%{q}%"),
            SMSMessage.sender.ilike(f"%{q}%"),
            SMSMessage.content.ilike(f"%{q}%"),
            SMSMessage.provider_msg_id.ilike(f"%{q}%")
        )
    ).order_by(desc(SMSMessage.created_at)).limit(limit)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    # Enrich with organization name
    enriched = []
    for msg in messages:
        org_result = await db.execute(select(Organization.name).where(Organization.id == msg.organization_id))
        org_name = org_result.scalar() or "Unknown"
        
        msg_dict = {
            "id": msg.id,
            "sender": msg.sender,
            "recipient": msg.recipient,
            "content": msg.content,
            "status": msg.status,
            "created_at": msg.created_at,
            "provider_name": msg.provider_name,
            "organization_name": org_name
        }
        enriched.append(msg_dict)
        
    return enriched

# --- SYSTEM HEALTH ---

@router.get("/system/health")
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superadmin)
):
    """Deep health check of platform components."""
    health = {
        "database": "up",
        "gateways": [],
        "timestamp": datetime.utcnow()
    }
    
    # Check SMPP Gateways
    result = await db.execute(select(SMPPAccount))
    accounts = result.scalars().all()
    for acc in accounts:
        health["gateways"].append({
            "id": acc.id,
            "name": acc.provider_name,
            "status": "active" if acc.is_active else "disabled",
            "is_active": acc.is_active,
            "host": acc.host
        })
        
    return health

# --- ANNOUNCEMENTS ---

@router.get("/announcements")
async def get_announcements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superadmin)
):
    """List all announcements for admin management."""
    query = select(SystemAnnouncement).order_by(desc(SystemAnnouncement.created_at))
    result = await db.execute(query)
    return _sort_announcements(result.scalars().all())

@router.post("/announcements")
async def create_announcement(
    title: str,
    content: str,
    type: str = "info",
    priority: str = "normal",
    target_user_ids: Optional[str] = None,
    expires_at: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superadmin)
):
    """Create an announcement for all users or selected users."""
    normalized_priority = _normalize_priority(priority)
    parsed_target_user_ids = None
    if target_user_ids:
        parsed_target_user_ids = [
            int(user_id.strip())
            for user_id in target_user_ids.split(",")
            if user_id.strip().isdigit()
        ]
        if not parsed_target_user_ids:
            parsed_target_user_ids = None

    announcement = SystemAnnouncement(
        title=title,
        content=content,
        type=type,
        priority=normalized_priority,
        target_user_ids=parsed_target_user_ids,
        expires_at=expires_at,
        created_by=current_user.id
    )
    db.add(announcement)
    await deps.log_admin_action(
        db, current_user, "create_announcement", "announcement", 
        title, {"type": type, "priority": normalized_priority}
    )
    await db.commit()
    return announcement

# --- GATEWAY CONTROL ---

@router.post("/gateways/{gateway_id}/toggle")
async def toggle_gateway(
    gateway_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_superadmin)
):
    """Enable or disable an SMPP Gateway."""
    result = await db.execute(select(SMPPAccount).where(SMPPAccount.id == gateway_id))
    gateway = result.scalar_one_or_none()
    
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway not found")
        
    gateway.is_active = not gateway.is_active
    
    await deps.log_admin_action(
        db, current_user, "toggle_gateway", "smpp_account", 
        gateway.provider_name, {"is_active": gateway.is_active}
    )
    
    await db.commit()
    return {"status": "success", "is_active": gateway.is_active}

@router.get("/announcements/active")
async def get_active_announcements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Public endpoint for users to see current announcements."""
    now = datetime.utcnow()
    query = select(SystemAnnouncement).where(
        SystemAnnouncement.is_active == True,
        or_(SystemAnnouncement.expires_at == None, SystemAnnouncement.expires_at > now)
    ).order_by(desc(SystemAnnouncement.created_at))
    
    result = await db.execute(query)
    announcements = _sort_announcements(result.scalars().all())
    visible = []
    for announcement in announcements:
        target_user_ids = announcement.target_user_ids or []
        if not target_user_ids or current_user.id in target_user_ids:
            visible.append(announcement)
    return visible
