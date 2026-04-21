from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.api import deps
from app.db.database import get_db
from app.db.models import User, MessageTemplate
from app.schemas.schemas import MessageTemplateCreate, MessageTemplateResponse

router = APIRouter()

@router.get("", response_model=List[MessageTemplateResponse])
async def get_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """List all templates for the current organization."""
    stmt = select(MessageTemplate).where(MessageTemplate.organization_id == current_user.organization_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=MessageTemplateResponse)
async def create_template(
    template_in: MessageTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Create a new message template."""
    db_obj = MessageTemplate(
        title=template_in.title,
        content=template_in.content,
        organization_id=current_user.organization_id,
        user_id=current_user.id
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """Delete a template."""
    stmt = select(MessageTemplate).where(
        MessageTemplate.id == template_id, 
        MessageTemplate.organization_id == current_user.organization_id
    )
    result = await db.execute(stmt)
    db_obj = result.scalar_one_or_none()
    
    if not db_obj:
        raise HTTPException(status_code=404, detail="Template not found")
        
    await db.delete(db_obj)
    await db.commit()
    return None
