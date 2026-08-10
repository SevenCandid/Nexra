from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.db.database import get_db
from app.db.models import User, SMSMessage, MessageStatus, Wallet, Organization, Contact
from app.schemas.schemas import SMSCreate, SMSResponse
from app.services.gateway_manager import gateway_manager
from app.services.billing_service import billing_service
from app.core.phone_utils import normalize_phone_number, validate_ghana_number
from app.core.queue import enqueue_sms
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
import logging
import time
import collections

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Per-org rate limiter ──────────────────────────────────────────────────────
# Tracks message send timestamps per org in a sliding 60-second window.
# Pure in-memory: resets on server restart, which is acceptable for free tier.
_org_send_times: dict[int, collections.deque] = {}
RATE_LIMIT_MAX = 100       # max messages per org per window
RATE_LIMIT_WINDOW = 60     # seconds


def _check_rate_limit(org_id: int) -> None:
    """Raise 429 if the org has sent too many messages in the last 60 seconds."""
    now = time.monotonic()
    if org_id not in _org_send_times:
        _org_send_times[org_id] = collections.deque()
    dq = _org_send_times[org_id]
    # Drop timestamps outside the window
    while dq and now - dq[0] > RATE_LIMIT_WINDOW:
        dq.popleft()
    if len(dq) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Rate limit exceeded: max {RATE_LIMIT_MAX} messages per "
                f"{RATE_LIMIT_WINDOW}s per organisation."
            ),
        )
    dq.append(now)
# ─────────────────────────────────────────────────────────────────────────────


async def _check_opt_out(db: AsyncSession, phone: str, org_id: int) -> None:
    """Raise 403 if the recipient has opted out for this org."""
    stmt = select(Contact).where(
        Contact.phone_number == phone,
        Contact.organization_id == org_id,
        Contact.is_opted_out.is_(True),
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Recipient {phone} has opted out and cannot receive messages.",
        )
# ─────────────────────────────────────────────────────────────────────────────


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

    # 0a. Rate limit — max 100 messages/min per org
    _check_rate_limit(current_user.organization_id)

    # 0b. Opt-out check — do not send to contacts who replied STOP
    await _check_opt_out(db, normalized_recipient, current_user.organization_id)
    
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

    from app.db.models import SenderID, SenderIDStatus, UserRole
    if current_user.role == UserRole.SUPERADMIN:
        s_query = select(SenderID).where(
            SenderID.sender_id == sms_in.sender,
            SenderID.organization_id == current_user.organization_id
        )
        s_result = await db.execute(s_query)
        if not s_result.scalar_one_or_none():
            new_sender = SenderID(
                sender_id=sms_in.sender,
                organization_id=current_user.organization_id,
                status=SenderIDStatus.APPROVED,
                purpose="Auto-saved by SuperAdmin",
                requested_by=current_user.id
            )
            db.add(new_sender)
            await db.flush()

    cost = await billing_service.calculate_sms_cost(db, normalized_recipient, sms_in.message, organization)

    if (wallet.subscription_credits + wallet.payg_credits) < cost:
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

    # Rate limit — max 100 messages/min per org
    _check_rate_limit(current_user.organization_id)

    # Opt-out check
    await _check_opt_out(db, normalized_recipient, current_user.organization_id)
    
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

    from app.db.models import SenderID, SenderIDStatus, UserRole
    if current_user.role == UserRole.SUPERADMIN:
        s_query = select(SenderID).where(
            SenderID.sender_id == sms_in.sender,
            SenderID.organization_id == current_user.organization_id
        )
        s_result = await db.execute(s_query)
        if not s_result.scalar_one_or_none():
            new_sender = SenderID(
                sender_id=sms_in.sender,
                organization_id=current_user.organization_id,
                status=SenderIDStatus.APPROVED,
                purpose="Auto-saved by SuperAdmin",
                requested_by=current_user.id
            )
            db.add(new_sender)
            await db.flush()

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

    if (wallet.subscription_credits + wallet.payg_credits) < cost:
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
    hours: int = 24,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    One-shot recovery tool.
    1. Finds all messages stuck in SUBMITTED status and polls Arkesel
       directly to update their real delivery status (up to a custom hours back).
    2. Re-enqueues any orphaned PENDING messages whose RQ jobs were lost.
    This same logic also runs automatically every 2 minutes in the background.
    """
    from app.workers.resolve_worker import resolve_stuck_messages, recover_orphaned_pending_messages
    submitted_result = await resolve_stuck_messages(hours=hours, limit=limit)
    pending_result = await recover_orphaned_pending_messages()
    
    resolved_count = submitted_result.get("resolved", 0)
    checked_count = submitted_result.get("checked", 0)
    recovered_count = pending_result.get("recovered", 0)
    
    return {
        "message": (
            f"Resolved {resolved_count} of {checked_count} stuck SUBMITTED messages. "
            f"Re-enqueued {recovered_count} orphaned PENDING messages."
        ),
        "submitted": submitted_result,
        "pending": pending_result,
    }

@router.post("/admin/force-deliver/{message_id}")
async def force_deliver_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Force marks a stuck message as DELIVERED.
    """
    from datetime import datetime
    stmt = select(SMSMessage).where(SMSMessage.id == message_id)
    result = await db.execute(stmt)
    msg = result.scalar_one_or_none()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.status = MessageStatus.DELIVERED
    msg.delivered_at = datetime.utcnow()

    if msg.campaign_id:
        from app.services.campaign_status import refresh_campaign_delivery_status
        await refresh_campaign_delivery_status(db, msg.campaign_id)

    # Broadcast
    try:
        from app.core.websocket import manager
        await manager.broadcast_to_org(msg.organization_id, {
            "type": "message_updated",
            "data": {
                "id": msg.id,
                "status": msg.status,
                "recipient": msg.recipient,
            },
        })
    except Exception as e:
        logger.warning(f"WS broadcast failed: {e}")

    await db.commit()
    return {"message": "Message forcefully marked as DELIVERED"}

@router.post("/admin/force-deliver-campaign/{campaign_id}")
async def force_deliver_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Force marks all SUBMITTED messages in a campaign as DELIVERED.
    """
    from datetime import datetime
    stmt = select(SMSMessage).where(
        SMSMessage.campaign_id == campaign_id,
        SMSMessage.status == MessageStatus.SUBMITTED
    )
    result = await db.execute(stmt)
    msgs = result.scalars().all()

    for msg in msgs:
        msg.status = MessageStatus.DELIVERED
        msg.delivered_at = datetime.utcnow()
        # Broadcast
        try:
            from app.core.websocket import manager
            await manager.broadcast_to_org(msg.organization_id, {
                "type": "message_updated",
                "data": {
                    "id": msg.id,
                    "status": msg.status,
                    "recipient": msg.recipient,
                },
            })
        except Exception:
            pass

    from app.services.campaign_status import refresh_campaign_delivery_status
    await refresh_campaign_delivery_status(db, campaign_id)

    await db.commit()
    return {"message": f"Forcefully marked {len(msgs)} messages as DELIVERED.", "resolved": len(msgs)}

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
