"""
Audit logging service for admin actions.
"""
from datetime import datetime
from app.db.models import AdminAuditLog, User
from sqlalchemy.ext.asyncio import AsyncSession


async def log_action(
    db: AsyncSession,
    admin: User,
    action: str,
    target_type: str,
    target_id: int | str | None = None,
    details: dict | None = None
) -> None:
    """
    Create an immutable audit log entry for any admin action.
    Silently fails to avoid disrupting primary operations.
    """
    try:
        entry = AdminAuditLog(
            admin_id=admin.id,
            admin_email=admin.email,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details=details or {},
            created_at=datetime.utcnow()
        )
        db.add(entry)
        await db.flush()
    except Exception as e:
        # Never let audit logging break the primary operation
        import logging
        logging.getLogger("uvicorn.error").warning(f"Audit log failed: {e}")
