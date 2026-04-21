from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.db.database import get_db
from app.db.models import User, SMSMessage, MessageStatus, Wallet
from app.schemas.schemas import SMSCreate, SMSResponse
from app.services.gateway_manager import gateway_manager
from app.core.phone_utils import normalize_phone_number, validate_ghana_number
from app.core.queue import enqueue_sms
from sqlalchemy.future import select
from datetime import datetime, timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/send", response_model=SMSResponse)
async def send_sms(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_user_by_api_key),
    sms_in: SMSCreate
):
    """
    Production-ready SMS submission endpoint.
    - Checks user balance/credits.
    - Routes to the correct MNO via GatewayManager.
    - Logs message to DB.
    - Handles asynchronous SMPP submission.
    """
    # 0. Normalize and Validate Phone Number
    normalized_recipient = normalize_phone_number(sms_in.recipient)
    if not validate_ghana_number(normalized_recipient):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Ghana phone number: {sms_in.recipient}"
        )
    
    # 1. Check Wallet Balance (Basic assumption: 1 credit per SMS)
    result = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = result.scalar_one_or_none()
    
    if not wallet or wallet.balance < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please top up your wallet."
        )

    # 2. Determine Route
    provider_name = await gateway_manager.route_message(normalized_recipient)
    
    # 2.5 Check Gateway Availability
    if not gateway_manager.is_provider_ready(provider_name):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Gateway for {provider_name} is currently offline. Please try again later."
        )

    # 3. Create DB Record (Pending)
    db_obj = SMSMessage(
        sender=sms_in.sender,
        recipient=normalized_recipient,
        content=sms_in.message,
        status=MessageStatus.PENDING,
        provider_name=provider_name,
        user_id=current_user.id,
        organization_id=current_user.organization_id # Ensure org_id is always set
    )
    db.add(db_obj)
    await db.flush() # Get the ID before commit

    # 4. Enqueue for Async Processing
    try:
        await enqueue_sms(db_obj.id)
        # We don't deduct balance here yet, or we could do it as 'reserved' 
        # In this implementation, let's deduct immediately to prevent overspending
        wallet.balance -= 1
        logger.info(f"Enqueued msg_id={db_obj.id} for processing")
    except Exception as e:
        db_obj.status = MessageStatus.FAILED
        logger.error(f"Failed to enqueue SMS: {str(e)}")
        # In production, maybe keep it PENDING and let a cleanup task find it

    await db.commit()
    await db.refresh(db_obj)
    
    return db_obj

@router.get("/status/{message_id}", response_model=SMSResponse)
async def get_sms_status(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_user_by_api_key)
):
    result = await db.execute(
        select(SMSMessage).where(SMSMessage.id == message_id, SMSMessage.user_id == current_user.id)
    )
    sms = result.scalar_one_or_none()
    if not sms:
        raise HTTPException(status_code=404, detail="Message not found")
    return sms

@router.post("/quick-send", response_model=SMSResponse)
async def quick_send_sms(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
    sms_in: SMSCreate
):
    """
    Simplified SMS sending for the dashboard 'Quick Send' feature.
    Uses session-based auth instead of API keys.
    """
    normalized_recipient = normalize_phone_number(sms_in.recipient)
    if not validate_ghana_number(normalized_recipient):
        raise HTTPException(status_code=400, detail=f"Invalid number: {sms_in.recipient}")
    
    # Check balance
    result = await db.execute(select(Wallet).where(Wallet.organization_id == current_user.organization_id))
    wallet = result.scalar_one_or_none()
    
    if not wallet or wallet.balance < 1:
        raise HTTPException(status_code=402, detail="Insufficient credits.")

    # Determine Provider
    provider_name = await gateway_manager.route_message(normalized_recipient)
    
    # Log PENDING message
    db_obj = SMSMessage(
        sender=sms_in.sender,
        recipient=normalized_recipient,
        content=sms_in.message,
        status=MessageStatus.PENDING,
        provider_name=provider_name,
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    db.add(db_obj)
    await db.flush()

    # Enqueue and deduct
    try:
        await enqueue_sms(db_obj.id)
        wallet.balance -= 1
    except Exception as e:
        db_obj.status = MessageStatus.FAILED
        logger.error(f"QuickSend failed: {str(e)}")

    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.post("/retry/{message_id}", response_model=SMSResponse)
async def retry_sms(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Manually retry a failed SMS message.
    """
    result = await db.execute(
        select(SMSMessage).where(SMSMessage.id == message_id, SMSMessage.organization_id == current_user.organization_id)
    )
    sms = result.scalar_one_or_none()
    
    if not sms:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if sms.status != MessageStatus.FAILED:
        raise HTTPException(status_code=400, detail="Only failed messages can be retried")

    # Reset status and retry count
    sms.status = MessageStatus.PENDING
    sms.retry_count = 0
    sms.next_retry_at = None
    
    await db.commit()
    await db.refresh(sms)
    
    # Re-enqueue
    await enqueue_sms(sms.id)
    
    return sms
