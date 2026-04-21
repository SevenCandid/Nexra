from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.db.models import User
from app.db.database import get_db
from app.schemas.schemas import MomoPushRequest, TransactionStatusResponse
from app.services.payment_service import payment_service

router = APIRouter()

@router.post("/momo-push", response_model=dict)
async def initiate_momo_push(
    request: MomoPushRequest,
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Initiate a simulated MoMo USSD Push.
    """
    reference = await payment_service.initiate_momo_push(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        amount=request.amount,
        phone_number=request.phone_number,
        network=request.network
    )
    return {
        "status": "pending",
        "reference": reference,
        "message": f"Push request sent to {request.phone_number}. Please check your phone."
    }

@router.get("/status/{reference}", response_model=TransactionStatusResponse)
async def get_payment_status(reference: str):
    """
    Get current status of a payment.
    """
    txn = await payment_service.get_transaction_status(reference)
    if txn["status"] == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return TransactionStatusResponse(
        reference=reference,
        status=txn["status"],
        amount=float(txn["amount"]),
        currency="GHS",
        message=f"Transaction is {txn['status']}"
    )

@router.post("/simulate-complete/{reference}")
async def simulate_payment_complete(
    reference: str,
    success: bool = Body(True, embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Simulated webhook to mark a payment as successful or failed.
    """
    completed = await payment_service.complete_payment(db, reference, success)
    if not completed:
        raise HTTPException(status_code=400, detail="Transaction not found or already completed")
    
    return {"message": "Transaction status updated successfully"}
