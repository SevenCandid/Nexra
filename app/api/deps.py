from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.db.models import User, Organization, UserRole
from app.core.config import settings
from app.core import security

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_STR}/auth/login"
)

api_key_header = APIKeyHeader(name="X-API-KEY", auto_error=False)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Could not validate credentials",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    result = await db.execute(
        select(User)
        .options(selectinload(User.organization).selectinload(Organization.plan))
        .where(User.id == int(user_id))
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_permission(permission: str):
    async def _require_permission(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role == UserRole.SUPERADMIN:
            return current_user
        if current_user.role == UserRole.STAFF:
            perms = current_user.permissions or {}
            if perms.get(permission) is True:
                return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing permission: {permission}",
        )
    return _require_permission

async def get_current_organization(
    current_user: User = Depends(get_current_active_user),
) -> Organization:
    return current_user.organization

async def get_user_by_api_key(
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(api_key_header)
) -> User:
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Key missing",
        )
    
    result = await db.execute(select(User).where(User.api_key == api_key))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or inactive API Key",
        )
    return user

async def get_current_active_superadmin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

async def get_current_active_platform_manager(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Allows Superadmins OR Staff with manage_platform permission."""
    if current_user.role == UserRole.SUPERADMIN:
        return current_user
    
    if current_user.role == UserRole.STAFF:
        perms = current_user.permissions or {}
        if perms.get("manage_platform") is True:
            return current_user
            
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to manage the platform"
    )

async def log_admin_action(
    db: AsyncSession, 
    admin: User, 
    action: str, 
    target_type: str, 
    target_id: Optional[str] = None, 
    details: Optional[dict] = None
):
    """Utility to record administrative actions in the audit log."""
    from app.db.models import AdminAuditLog
    log = AdminAuditLog(
        admin_id=admin.id,
        admin_email=admin.email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details
    )
    db.add(log)
    await db.flush()
