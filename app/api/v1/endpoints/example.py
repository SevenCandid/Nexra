from fastapi import APIRouter, Depends
from app.api import deps
from app.db.models import Organization, User
from app.schemas.schemas import SMSResponse
from typing import List

router = APIRouter()

@router.get("/organization/stats")
async def get_org_stats(
    current_user: User = Depends(deps.get_current_active_user),
    org: Organization = Depends(deps.get_current_organization)
):
    """
    Example of a route protected by JWT and scoped to an organization.
    """
    return {
        "organization": org.name,
        "organization_id": org.id,
        "user": current_user.full_name,
        "stats": {
            "total_messages": len(org.messages),
            "balance": float(org.wallet.balance) if org.wallet else 0,
            "active_users": len(org.users)
        }
    }
