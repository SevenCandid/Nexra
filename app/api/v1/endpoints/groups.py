from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from pydantic import BaseModel
from app.api import deps
from app.db.database import get_db
from app.db.models import User, ContactGroup, Contact, contact_group_association
from app.schemas.schemas import ContactGroupCreate, ContactGroupResponse, ContactResponse

router = APIRouter()

@router.get("", response_model=List[ContactGroupResponse])
async def get_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """List all contact groups with counts."""
    stmt = (
        select(
            ContactGroup,
            func.count(contact_group_association.c.contact_id).label("contact_count")
        )
        .outerjoin(contact_group_association, ContactGroup.id == contact_group_association.c.group_id)
        .where(ContactGroup.organization_id == current_user.organization_id)
        .group_by(ContactGroup.id)
    )
    result = await db.execute(stmt)
    groups = []
    for row in result:
        group = row.ContactGroup
        group.contact_count = row.contact_count
        groups.append(group)
    return groups

@router.post("", response_model=ContactGroupResponse)
async def create_group(
    group_in: ContactGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Create a new contact group."""
    db_obj = ContactGroup(
        name=group_in.name,
        description=group_in.description,
        organization_id=current_user.organization_id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    db_obj.contact_count = 0
    return db_obj

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Delete a contact group."""
    stmt = select(ContactGroup).where(
        ContactGroup.id == group_id,
        ContactGroup.organization_id == current_user.organization_id
    )
    result = await db.execute(stmt)
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Group not found")
    await db.delete(db_obj)
    await db.commit()
    return None

@router.get("/{group_id}/contacts", response_model=List[ContactResponse])
async def get_group_contacts(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Get all contacts in a specific group."""
    group_stmt = select(ContactGroup).where(
        ContactGroup.id == group_id,
        ContactGroup.organization_id == current_user.organization_id
    )
    group = (await db.execute(group_stmt)).scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    stmt = (
        select(Contact)
        .join(contact_group_association, Contact.id == contact_group_association.c.contact_id)
        .where(contact_group_association.c.group_id == group_id)
        .where(Contact.organization_id == current_user.organization_id)
    )
    result = await db.execute(stmt)
    return result.scalars().all()

class BulkAddRequest(BaseModel):
    contact_ids: List[int]

# IMPORTANT: /bulk must be declared BEFORE /{contact_id} to avoid FastAPI
# matching "bulk" as an integer contact_id path parameter.
@router.post("/{group_id}/contacts/bulk", status_code=status.HTTP_200_OK)
async def bulk_add_contacts_to_group(
    group_id: int,
    payload: BulkAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Bulk add multiple contacts to a group, skipping duplicates."""
    group_stmt = select(ContactGroup).where(
        ContactGroup.id == group_id,
        ContactGroup.organization_id == current_user.organization_id
    )
    group = (await db.execute(group_stmt)).scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    existing_stmt = select(contact_group_association.c.contact_id).where(
        contact_group_association.c.group_id == group_id
    )
    existing_ids = {row[0] for row in (await db.execute(existing_stmt)).all()}

    added = 0
    for contact_id in payload.contact_ids:
        if contact_id not in existing_ids:
            await db.execute(
                contact_group_association.insert().values(contact_id=contact_id, group_id=group_id)
            )
            existing_ids.add(contact_id)
            added += 1

    await db.commit()
    return {"added": added, "skipped": len(payload.contact_ids) - added}

@router.post("/{group_id}/contacts/{contact_id}", status_code=status.HTTP_200_OK)
async def add_contact_to_group(
    group_id: int,
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Add a single contact to a group."""
    group_stmt = select(ContactGroup).where(
        ContactGroup.id == group_id,
        ContactGroup.organization_id == current_user.organization_id
    )
    group = (await db.execute(group_stmt)).scalar_one_or_none()
    contact_stmt = select(Contact).where(
        Contact.id == contact_id,
        Contact.organization_id == current_user.organization_id
    )
    contact = (await db.execute(contact_stmt)).scalar_one_or_none()
    if not group or not contact:
        raise HTTPException(status_code=404, detail="Group or Contact not found")
    assoc_stmt = select(contact_group_association).where(
        contact_group_association.c.contact_id == contact_id,
        contact_group_association.c.group_id == group_id
    )
    existing = (await db.execute(assoc_stmt)).first()
    if existing:
        return {"message": "Contact already in group"}
    await db.execute(contact_group_association.insert().values(contact_id=contact_id, group_id=group_id))
    await db.commit()
    return {"message": "Contact added to group"}

@router.delete("/{group_id}/contacts/{contact_id}", status_code=status.HTTP_200_OK)
async def remove_contact_from_group(
    group_id: int,
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Remove a contact from a group."""
    group_stmt = select(ContactGroup).where(
        ContactGroup.id == group_id,
        ContactGroup.organization_id == current_user.organization_id
    )
    group = (await db.execute(group_stmt)).scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    await db.execute(
        delete(contact_group_association).where(
            contact_group_association.c.contact_id == contact_id,
            contact_group_association.c.group_id == group_id
        )
    )
    await db.commit()
    return {"message": "Contact removed from group"}
