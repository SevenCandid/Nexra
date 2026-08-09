from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.api import deps
from app.db.models import User, Organization, UserRole
from app.db.database import get_db
from app.services.audit import log_action
from pydantic import BaseModel

class StatusUpdate(BaseModel):
    is_active: bool

class PermissionsUpdate(BaseModel):
    permissions: dict

class PaginatedUsers(BaseModel):
    items: list
    total: int

class PaginatedOrgs(BaseModel):
    items: list
    total: int

router = APIRouter()

async def check_superadmin(current_user: User = Depends(deps.get_current_active_user)):
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Platform Superadmin only"
        )
    return current_user

@router.get("/users")
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_platform")),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200)
):
    """List all users across all organizations with pagination."""
    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar()

    result = await db.execute(
        select(User).order_by(User.id.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return {"items": users, "total": total}

@router.patch("/users/{user_id}")
async def update_user_status(
    user_id: int,
    payload: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_platform"))
):
    """Toggle user active status."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = payload.is_active
    await log_action(db, admin, action="update_user_status", target_type="user",
                     target_id=user_id, details={"is_active": payload.is_active, "email": user.email})
    await db.commit()
    return {"status": "success", "user_id": user_id, "is_active": payload.is_active}

@router.patch("/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: int,
    payload: PermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_superadmin)
):
    """Superadmin action: Delegate specific permissions to a staff member."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role != UserRole.STAFF:
        raise HTTPException(status_code=400, detail="Can only delegate permissions to staff members")
    
    user.permissions = payload.permissions
    await log_action(db, admin, action="delegate_permissions", target_type="user",
                     target_id=user_id, details={"permissions": payload.permissions, "email": user.email})
    await db.commit()
    return {"status": "success", "user_id": user_id, "permissions": user.permissions}

@router.post("/users/{user_id}/promote")
async def promote_user_to_superadmin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(check_superadmin)
):
    """Superadmin: Promote a staff or user account to Superadmin."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot promote yourself (already superadmin)")
    if user.role == UserRole.SUPERADMIN:
        raise HTTPException(status_code=400, detail="User is already a Superadmin")

    old_role = user.role
    user.role = UserRole.SUPERADMIN
    user.permissions = {}  # Superadmins bypass permission checks
    await log_action(db, admin, action="promote_to_superadmin", target_type="user",
                     target_id=user_id, details={"email": user.email, "old_role": old_role})
    await db.commit()
    return {"status": "success", "user_id": user_id, "new_role": "superadmin", "email": user.email}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_platform"))
):
    """Delete a user account."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own master account")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    email = user.email
    await log_action(db, admin, action="delete_user", target_type="user",
                     target_id=user_id, details={"email": email})

    from app.services.user_deletion import delete_user_and_dependencies

    await delete_user_and_dependencies(db, user_id)
    await db.commit()
    return {"status": "success", "message": "User deleted"}


@router.get("/organizations")
async def list_all_organizations(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_platform")),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200)
):
    """List all organizations with pagination."""
    count_result = await db.execute(select(func.count(Organization.id)))
    total = count_result.scalar()

    result = await db.execute(
        select(Organization)
        .options(selectinload(Organization.plan))
        .order_by(Organization.created_at.desc())
        .offset(skip).limit(limit)
    )
    
    orgs = result.scalars().all()
    items = []
    for org in orgs:
        items.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "is_active": org.is_active,
            "created_at": org.created_at,
            "plan_name": org.plan.name if org.plan else "N/A",
            "plan_slug": org.plan.slug if org.plan else "payg"
        })
        
    return {"items": items, "total": total}

@router.patch("/organizations/{org_id}")
async def update_organization_status(
    org_id: int,
    payload: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_platform"))
):
    """Toggle organization active status."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org.is_active = payload.is_active
    await log_action(db, admin, action="update_org_status", target_type="organization",
                     target_id=org_id, details={"is_active": payload.is_active, "name": org.name})
    await db.commit()
    return {"status": "success", "org_id": org_id, "is_active": payload.is_active}

@router.delete("/organizations/{org_id}")
async def delete_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(deps.require_permission("manage_platform"))
):
    """Delete an organization and its data."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if org.id == admin.organization_id:
        raise HTTPException(status_code=400, detail="Cannot delete the platform default organization")

    await log_action(db, admin, action="delete_organization", target_type="organization",
                     target_id=org_id, details={"name": org.name})
    await db.delete(org)
    await db.commit()
    return {"status": "success", "message": "Organization deleted"}
