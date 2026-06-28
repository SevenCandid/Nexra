from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.api import deps
from app.db.database import get_db
from app.db.models import User, Campaign, Contact, ContactGroup

router = APIRouter()

@router.get("")
async def global_search(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Search across campaigns, contacts, and segments for the organization.
    Returns max 5 of each.
    """
    org_id = current_user.organization_id
    search_term = f"%{q}%"

    # 1. Search Campaigns
    campaigns_stmt = (
        select(Campaign)
        .where(
                Campaign.organization_id == org_id,
                or_(
                    Campaign.name.ilike(search_term),
                    Campaign.template.ilike(search_term)
                )
            )
        .order_by(Campaign.created_at.desc())
        .limit(5)
    )
    campaigns_result = await db.execute(campaigns_stmt)
    campaigns = campaigns_result.scalars().all()

    # 2. Search Contacts
    contacts_stmt = (
        select(Contact)
        .where(
            Contact.organization_id == org_id,
            or_(
                Contact.first_name.ilike(search_term),
                Contact.last_name.ilike(search_term),
                Contact.phone_number.ilike(search_term)
            )
        )
        .order_by(Contact.created_at.desc())
        .limit(5)
    )
    contacts_result = await db.execute(contacts_stmt)
    contacts = contacts_result.scalars().all()

    # 3. Search Segments (Groups)
    groups_stmt = (
        select(ContactGroup)
        .where(
            ContactGroup.organization_id == org_id,
            or_(
                ContactGroup.name.ilike(search_term),
                ContactGroup.description.ilike(search_term)
            )
        )
        .order_by(ContactGroup.created_at.desc())
        .limit(5)
    )
    groups_result = await db.execute(groups_stmt)
    groups = groups_result.scalars().all()

    return {
        "campaigns": [
            {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "type": "campaign"
            } for c in campaigns
        ],
        "contacts": [
            {
                "id": c.id,
                "name": f"{c.first_name or ''} {c.last_name or ''}".strip() or c.phone_number,
                "phone_number": c.phone_number,
                "type": "contact"
            } for c in contacts
        ],
        "segments": [
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "type": "segment"
            } for g in groups
        ]
    }
