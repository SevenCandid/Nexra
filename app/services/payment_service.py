import logging
import uuid
import asyncio
from decimal import Decimal
from datetime import datetime
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.billing_service import billing_service

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

payment_service = PaymentService()
