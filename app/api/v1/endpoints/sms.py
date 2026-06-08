from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.db.database import get_db
from app.db.models import User, SMSMessage, MessageStatus, Wallet, Organization
from app.schemas.schemas import SMSCreate, SMSResponse
from app.services.gateway_manager import gateway_manager
from app.services.billing_service import billing_service
from app.core.phone_utils import normalize_phone_number, validate_ghana_number
from app.core.queue import enqueue_sms
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
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
    
    # 1. Load org plan and wallet, then calculate the true billable SMS cost.
    org_result = await db.execute(
        select(Organization)
        .options(selectinload(Organization.plan))
        .where(Organization.id == current_user.organization_id)
    )
    organization = org_result.scalar_one_or_none()
    result = await db.execute(select(Wallet).where(Wallet.organization_id == current_user.organization_id))
    wallet = result.scalar_one_or_none()

    if not organization or not wallet:
        raise HTTPException(status_code=404, detail="Organization wallet not found.")

    cost = await billing_service.calculate_sms_cost(db, normalized_recipient, sms_in.message, organization)

    if wallet.balance < cost:
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
    
    # Check balance against the actual SMS rate for the current plan
    org_result = await db.execute(
        select(Organization)
        .options(selectinload(Organization.plan))
        .where(Organization.id == current_user.organization_id)
    )
    organization = org_result.scalar_one_or_none()
    result = await db.execute(select(Wallet).where(Wallet.organization_id == current_user.organization_id))
    wallet = result.scalar_one_or_none()

    if not organization or not wallet:
        raise HTTPException(status_code=404, detail="Organization wallet not found.")



    # Determine Provider
    provider_name = await gateway_manager.route_message(normalized_recipient)
    
    # Check for Contact to personalize message
    from app.db.models import Contact
    contact_stmt = select(Contact).where(
        Contact.phone_number == normalized_recipient,
        Contact.organization_id == current_user.organization_id
    )
    contact_result = await db.execute(contact_stmt)
    contact = contact_result.scalar_one_or_none()

    content = sms_in.message
    if contact:
        f_name = (contact.first_name or "").strip()
        l_name = (contact.last_name or "").strip()
        full_name = f"{f_name} {l_name}".strip()
        display_name = full_name if full_name else (f_name if f_name else contact.phone_number)

        content = content.replace("{first_name}", f_name)
        content = content.replace("{last_name}", l_name)
        content = content.replace("{name}", display_name)
    content = content.replace("{phone_number}", normalized_recipient)

    cost = await billing_service.calculate_sms_cost(db, normalized_recipient, content, organization)

    if wallet.balance < cost:
        raise HTTPException(status_code=402, detail="Insufficient credits.")

    # Log PENDING message
    db_obj = SMSMessage(
        sender=sms_in.sender,
        recipient=normalized_recipient,
        content=content,
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

@router.post("/admin/resolve-stuck-messages")
async def resolve_stuck_messages_endpoint(
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    One-shot recovery tool.
    Finds all messages stuck in SUBMITTED status and polls Arkesel
    directly to update their real delivery status.
    This same logic also runs automatically every 2 minutes in the background.
    """
    from app.workers.resolve_worker import resolve_stuck_messages
    result = await resolve_stuck_messages()
    return {
        "message": f"Resolved {result['resolved']} of {result['checked']} stuck messages.",
        **result
    }

@router.get("/webhook/arkesel/debug")
async def arkesel_webhook_debug(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Debug endpoint: returns the last 20 Delivery Report Logs received.
    """
    from app.db.models import DeliveryReportLog
    from sqlalchemy import desc
    stmt = select(DeliveryReportLog).order_by(desc(DeliveryReportLog.received_at)).limit(20)
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "received_at": log.received_at,
            "provider_msg_id": log.provider_msg_id,
            "stat": log.stat,
            "err": log.err,
            "sms_message_id": log.sms_message_id,
            "raw_content": log.raw_content,
        }
        for log in logs
    ]

@router.api_route("/webhook/arkesel", methods=["GET", "POST"])
async def arkesel_webhook(
    request: Request
):
    """
    Webhook endpoint to receive Delivery Reports (DLRs) from Arkesel.
    """
    try:
        def normalize_status(value) -> str:
            return str(value or "").strip().replace(" ", "_").replace("-", "_").upper()

        mapped_dlr = {}

        if request.method == "GET":
            params = dict(request.query_params)
            logger.info(f"[DLR][GET] Arkesel webhook received. Full params: {params}")
            mapped_dlr = {
                "id": str(params.get("sms_id") or params.get("id") or params.get("message_id") or ""),
                "stat": normalize_status(params.get("status")),
                "err": str(params.get("err") or params.get("error") or params.get("reason") or ""),
                "raw": str(params),
            }
        else:
            raw_body = await request.body()
            logger.info(f"[DLR][POST] Arkesel webhook received. Raw body: {raw_body.decode('utf-8', errors='replace')}")

            try:
                payload = await request.json()
            except Exception:
                payload = {}

            logger.info(f"[DLR][POST] Parsed payload: {payload}")

            raw_data = payload.get("data", payload)

            if isinstance(raw_data, list):
                dlr_data = raw_data[0] if raw_data else {}
            elif isinstance(raw_data, dict):
                dlr_data = raw_data
            else:
                dlr_data = payload

            logger.info(f"[DLR] Resolved dlr_data block: {dlr_data}")

            msg_id = (
                dlr_data.get("id")
                or dlr_data.get("ID")
                or dlr_data.get("sms_id")
                or dlr_data.get("message_id")
                or payload.get("id")
                or payload.get("ID")
                or payload.get("sms_id")
                or payload.get("message_id")
                or ""
            )

            raw_status = (
                dlr_data.get("status")
                or dlr_data.get("stat")
                or payload.get("status")
                or ""
            )

            mapped_dlr = {
                "id": str(msg_id),
                "stat": normalize_status(raw_status),
                "err": str(dlr_data.get("error_code") or dlr_data.get("reason") or dlr_data.get("err") or ""),
                "raw": str(payload)
            }

        logger.info(f"[DLR] Mapped DLR for processing: {mapped_dlr}")

        if not mapped_dlr.get("id"):
            logger.warning(f"[DLR] Webhook payload missing message 'id'. Full mapped_dlr: {mapped_dlr}")
            return {"status": "ignored", "reason": "missing id"}

        import asyncio
        from app.core.queue import enqueue_dlr
        asyncio.create_task(enqueue_dlr(mapped_dlr))

        return {"status": "success"}

    except Exception as e:
        logger.error(f"[DLR] Error processing Arkesel Webhook: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}
