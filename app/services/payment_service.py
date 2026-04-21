import logging
import uuid
import asyncio
import httpx
from decimal import Decimal
from datetime import datetime
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.billing_service import billing_service
from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory store for simulated transactions (use Redis/DB for production)
pending_transactions: Dict[str, dict] = {}

class PaymentService:
    """Simulated payment service for MoMo/T-Cash push logic."""

    async def initiate_momo_push(
        self, 
        organization_id: int, 
        user_id: int,
        amount: float, 
        phone_number: str, 
        network: str
    ) -> str:
        """
        Initiates a simulated USSD Push request.
        """
        reference = f"NEX-PAY-{uuid.uuid4().hex[:8].upper()}"
        
        pending_transactions[reference] = {
            "organization_id": organization_id,
            "user_id": user_id,
            "amount": Decimal(str(amount)),
            "phone_number": phone_number,
            "network": network,
            "status": "PENDING",
            "created_at": datetime.utcnow()
        }
        
        logger.info(f"Initiated MoMo Push: {reference} for {phone_number} ({network})")
        return reference

    async def get_transaction_status(self, reference: str) -> dict:
        """Get the current status of a transaction."""
        return pending_transactions.get(reference, {"status": "NOT_FOUND"})

    async def complete_payment(self, db: AsyncSession, reference: str, success: bool = True):
        """
        Completes a payment and updates the wallet.
        This is called by our simulation endpoint or a real webhook.
        """
        txn = pending_transactions.get(reference)
        if not txn or txn["status"] != "PENDING":
            return False

        if success:
            txn["status"] = "SUCCESS"
            # Add credits to wallet
            await billing_service.add_payg_credits(
                db=db,
                organization_id=txn["organization_id"],
                amount=txn["amount"],
                payment_reference=reference,
                user_id=txn["user_id"]
            )
            logger.info(f"Payment SUCCESS: {reference} - {txn['amount']} GHS added to org {txn['organization_id']}")
        else:
            txn["status"] = "FAILED"
            logger.info(f"Payment FAILED: {reference}")

        return True

    async def register_payment_intent(
        self, 
        organization_id: int, 
        user_id: int,
        amount: float,
        reference: str
    ):
        """
        Registers a payment intent from Paystack Inline.
        """
        pending_transactions[reference] = {
            "organization_id": organization_id,
            "user_id": user_id,
            "amount": Decimal(str(amount)),
            "status": "PENDING",
            "created_at": datetime.utcnow(),
            "provider": "PAYSTACK"
        }
        logger.info(f"Registered Paystack Intent: {reference} for {amount} GHS")
        return reference

    async def verify_paystack_payment(self, db: AsyncSession, reference: str):
        """
        Verifies a Paystack transaction and completes it.
        """
        if not settings.PAYSTACK_SECRET_KEY:
            logger.error("PAYSTACK_SECRET_KEY not configured")
            return {"status": "ERROR", "message": "Paystack not configured"}

        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                data = response.json()
                
                if data.get("status") and data["data"]["status"] == "success":
                    amount_ghs = Decimal(str(data["data"]["amount"])) / 100
                    
                    # Check if we already have this intent or create a one-off
                    txn = pending_transactions.get(reference)
                    if not txn:
                        # This could happen if intent was lost or one-off
                        # In production, we'd lookup by metadata or just trust Paystack but verify amount
                        logger.warning(f"Verification for unknown reference {reference}. Creating ad-hoc txn.")
                        # This is a bit risky without intent, but for now we assume it's okay
                        # In real app, we'd pass organization_id in metadata
                        org_id = data["data"]["metadata"].get("organization_id")
                        user_id = data["data"]["metadata"].get("user_id")
                        
                        if not org_id:
                             return {"status": "FAILED", "message": "Organization info missing in metadata"}
                             
                        txn = {
                            "organization_id": int(org_id),
                            "user_id": int(user_id) if user_id else None,
                            "amount": amount_ghs,
                            "status": "PENDING"
                        }
                        pending_transactions[reference] = txn

                    # Complete the payment
                    if txn["status"] == "PENDING":
                        await self.complete_payment(db, reference, True)
                        return {"status": "SUCCESS", "amount": float(amount_ghs)}
                    else:
                        return {"status": "ALREADY_COMPLETED", "amount": float(txn["amount"])}
                
                return {"status": "FAILED", "message": data.get("message", "Verification failed")}
            except Exception as e:
                logger.error(f"Paystack verification error: {str(e)}")
                return {"status": "ERROR", "message": str(e)}

payment_service = PaymentService()
