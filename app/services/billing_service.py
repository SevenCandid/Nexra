import logging
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from sqlalchemy.orm import selectinload
from app.db.models import (
    Organization, Wallet, BillingLedger, SMSMessage, NetworkPricing,
    SubscriptionPlan, LedgerType, MessageStatus, User, UserRole, Notification
)
from app.core.config import settings

logger = logging.getLogger(__name__)

class BillingService:
    """Core billing service for credit-based SMS charging."""

    PRICING_CATALOG: List[Dict] = [
        {
            "slug": "payg",
            "legacy_slugs": ["custom"],
            "name": "Pay As You Go",
            "monthly_price": Decimal("0.00"),
            "sms_rate": Decimal("0.08"),
            "max_users": 3,
            "monthly_credits": Decimal("0.00"),
            "bonus_credits_on_signup": Decimal("50.00"),
            "pricing_model": "payg",
            "payg_rate_multiplier": Decimal("1.0"),
            "features": {
                "tps_limit": 3,
                "api_access": True,
                "webhook_support": False
            }
        },
        {
            "slug": "starter",
            "legacy_slugs": [],
            "name": "Starter",
            "monthly_price": Decimal("25.00"),
            "sms_rate": Decimal("0.07"),
            "max_users": 5,
            "monthly_credits": Decimal("35.00"),
            "bonus_credits_on_signup": Decimal("100.00"),
            "pricing_model": "hybrid",
            "payg_rate_multiplier": Decimal("1.0"),
            "features": {
                "tps_limit": 5,
                "api_access": True,
                "webhook_support": False
            }
        },
        {
            "slug": "pro",
            "legacy_slugs": ["enterprise"],
            "name": "Pro",
            "monthly_price": Decimal("50.00"),
            "sms_rate": Decimal("0.06"),
            "max_users": 100,
            "monthly_credits": Decimal("75.00"),
            "bonus_credits_on_signup": Decimal("250.00"),
            "pricing_model": "hybrid",
            "payg_rate_multiplier": Decimal("1.0"),
            "features": {
                "tps_limit": 100,
                "api_access": True,
                "webhook_support": True,
                "priority_support": True,
                "dedicated_account_manager": True,
                "custom_integrations": True
            }
        }
    ]

    @staticmethod
    async def ensure_pricing_catalog(db: AsyncSession) -> Dict[str, SubscriptionPlan]:
        """
        Ensure the canonical pricing plans exist and legacy aliases are migrated.
        """
        plans_by_slug: Dict[str, SubscriptionPlan] = {}

        for plan_def in BillingService.PRICING_CATALOG:
            canonical_slug = plan_def["slug"]
            legacy_slugs = plan_def.get("legacy_slugs", [])

            stmt = select(SubscriptionPlan).where(SubscriptionPlan.slug == canonical_slug)
            result = await db.execute(stmt)
            plan = result.scalar_one_or_none()

            if not plan:
                for legacy_slug in legacy_slugs:
                    legacy_stmt = select(SubscriptionPlan).where(SubscriptionPlan.slug == legacy_slug)
                    legacy_result = await db.execute(legacy_stmt)
                    legacy_plan = legacy_result.scalar_one_or_none()
                    if legacy_plan:
                        plan = legacy_plan
                        plan.slug = canonical_slug
                        break

            if not plan:
                plan = SubscriptionPlan(
                    name=plan_def["name"],
                    slug=canonical_slug,
                    monthly_price=plan_def["monthly_price"],
                    sms_rate=plan_def["sms_rate"],
                    max_users=plan_def["max_users"],
                    monthly_credits=plan_def["monthly_credits"],
                    bonus_credits_on_signup=plan_def["bonus_credits_on_signup"],
                    pricing_model=plan_def["pricing_model"],
                    payg_rate_multiplier=plan_def["payg_rate_multiplier"],
                    features=plan_def["features"],
                )
                db.add(plan)
                await db.flush()
            else:
                plan.name = plan_def["name"]
                plan.monthly_price = plan_def["monthly_price"]
                plan.sms_rate = plan_def["sms_rate"]
                plan.max_users = plan_def["max_users"]
                plan.monthly_credits = plan_def["monthly_credits"]
                plan.bonus_credits_on_signup = plan_def["bonus_credits_on_signup"]
                plan.pricing_model = plan_def["pricing_model"]
                plan.payg_rate_multiplier = plan_def["payg_rate_multiplier"]
                plan.features = plan_def["features"]

            plans_by_slug[canonical_slug] = plan

        # Migrate organizations off legacy plan aliases where we now have canonical plans.
        for plan_def in BillingService.PRICING_CATALOG:
            canonical_slug = plan_def["slug"]
            canonical_plan = plans_by_slug.get(canonical_slug)
            if not canonical_plan:
                continue

            for legacy_slug in plan_def.get("legacy_slugs", []):
                legacy_stmt = select(SubscriptionPlan).where(SubscriptionPlan.slug == legacy_slug)
                legacy_result = await db.execute(legacy_stmt)
                legacy_plan = legacy_result.scalar_one_or_none()
                if legacy_plan and legacy_plan.id != canonical_plan.id:
                    # Reassign any organizations still on the legacy plan to the canonical plan.
                    await db.execute(
                        update(Organization)
                        .where(Organization.plan_id == legacy_plan.id)
                        .values(plan_id=canonical_plan.id)
                    )

        await db.commit()
        return plans_by_slug

    @staticmethod
    async def get_pricing_catalog(db: AsyncSession) -> List[SubscriptionPlan]:
        plans_by_slug = await BillingService.ensure_pricing_catalog(db)
        ordered_slugs = [plan_def["slug"] for plan_def in BillingService.PRICING_CATALOG]
        return [plans_by_slug[slug] for slug in ordered_slugs if slug in plans_by_slug]
    
    @staticmethod
    async def get_network_pricing(db: AsyncSession, network_name: str) -> Optional[NetworkPricing]:
        """Get active pricing for a network."""
        stmt = (
            select(NetworkPricing)
            .where(
                NetworkPricing.network_name == network_name,
                NetworkPricing.is_active == True
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def calculate_sms_cost(
        db: AsyncSession,
        recipient: str,
        message_content: str,
        organization: Organization
    ) -> Decimal:
        """
        Calculate SMS cost based on the organization's active plan.
        
        Steps:
        1. Resolve the organization's active plan
        2. Calculate parts (1-160 = 1 part, >160 = 153 chars per part)
        3. Multiply rate by parts
        """
        base_rate = Decimal("0.08")
        if organization.plan:
            base_rate = Decimal(str(organization.plan.sms_rate))
        else:
            logger.warning("Organization %s has no active plan; falling back to PAYG rate", organization.id)

        import math
        length = len(message_content) if message_content else 0
        if length <= 160:
            parts = 1
        else:
            parts = math.ceil(length / 153)
            
        return base_rate * parts
    
    @staticmethod
    async def deduct_credits_for_sms(
        db: AsyncSession,
        organization_id: int,
        sms_message_id: int,
        cost: Decimal,
        user_id: Optional[int] = None
    ) -> Tuple[bool, str]:
        """
        Deduct credits before sending SMS.
        
        Returns: (success: bool, error_message: str)
        
        Uses row-level locking to prevent race conditions.
        """
        try:
            # Lock wallet for update
            stmt = (
                select(Wallet)
                .where(Wallet.organization_id == organization_id)
                .with_for_update()
            )
            result = await db.execute(stmt)
            wallet = result.scalar_one_or_none()
            
            if not wallet:
                return False, "Wallet not found"
            
            # Check total balance
            total_balance = wallet.subscription_credits + wallet.payg_credits
            if total_balance < cost:
                return False, f"Insufficient balance. Required: {cost}, Available: {total_balance}"
            
            # Deduct from subscription credits first
            credit_source = "subscription"
            if wallet.subscription_credits >= cost:
                wallet.subscription_credits -= cost
            else:
                # Use remaining subscription + PAYG
                remaining = cost - wallet.subscription_credits
                wallet.subscription_credits = Decimal('0')
                wallet.payg_credits -= remaining
                credit_source = "payg" if wallet.subscription_credits == 0 else "hybrid"
            
            # Update wallet balance
            wallet.balance = wallet.subscription_credits + wallet.payg_credits
            
            # Create ledger entry
            ledger = BillingLedger(
                organization_id=organization_id,
                amount=cost,
                type=LedgerType.DEBIT,
                category="sms_charge",
                reference_type="sms_message",
                reference_id=str(sms_message_id),
                credit_source=credit_source,
                description=f"SMS charge for message {sms_message_id}",
                balance_after=wallet.balance,
                extra_data={
                    "sms_id": sms_message_id,
                    "cost": str(cost),
                    "credit_source": credit_source
                },
                created_by=user_id
            )
            db.add(ledger)
            await db.flush()
            
            # Update SMS message
            sms = await db.get(SMSMessage, sms_message_id)
            if sms:
                sms.cost = cost
                sms.credit_source = credit_source
                sms.ledger_entry_id = ledger.id
            
            # Check for low balance
            await BillingService._check_and_notify_low_balance(db, wallet)
            
            await db.commit()
            logger.info(f"Deducted {cost} credits from org {organization_id} for SMS {sms_message_id}")
            return True, ""
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error deducting credits: {str(e)}")
            return False, f"Error processing payment: {str(e)}"

    @staticmethod
    async def _check_and_notify_low_balance(db: AsyncSession, wallet: Wallet, threshold: float = 20.0) -> None:
        """
        Check if balance is below threshold and send notifications if we haven't
        already sent one in the last 24 hours.
        """
        if float(wallet.balance) > threshold:
            return
            
        if wallet.low_balance_notified_at and datetime.utcnow() - wallet.low_balance_notified_at < timedelta(hours=24):
            return
            
        # Get organization
        org = await db.get(Organization, wallet.organization_id)
        if not org:
            return
            
        # Get org admins
        stmt = select(User).where(
            User.organization_id == wallet.organization_id, 
            User.role == UserRole.ORG_ADMIN,
            User.is_active == True
        )
        result = await db.execute(stmt)
        admins = result.scalars().all()
        
        if not admins:
            return
            
        import asyncio
        from app.services.email_service import send_low_balance_email
        top_up_url = f"{settings.FRONTEND_URL}/billing"
        
        for admin in admins:
            # Dispatch Email
            asyncio.create_task(
                send_low_balance_email(
                    to_email=admin.email,
                    organization_name=org.name,
                    current_balance=float(wallet.balance),
                    threshold=threshold,
                    top_up_url=top_up_url
                )
            )
            
            # Create In-App Notification
            notification = Notification(
                title="Low Balance Alert",
                message=f"Your SMS credit balance is low ({wallet.balance:.2f} credits remaining). Please top up to avoid campaign interruptions.",
                type="warning",
                link="/billing",
                user_id=admin.id,
                organization_id=org.id
            )
            db.add(notification)
            
        wallet.low_balance_notified_at = datetime.utcnow()
        logger.info(f"Low balance notifications dispatched for org {org.id}")
    
    @staticmethod
    async def refund_failed_sms(
        db: AsyncSession,
        sms_message_id: int
    ) -> bool:
        """
        Refund credits for permanently failed messages.
        
        Refund policy:
        - FAILED: Full refund
        - EXPIRED: Full refund
        - UNDELIVERABLE: Full refund
        - DELIVERED: No refund
        """
        try:
            sms = await db.get(SMSMessage, sms_message_id)
            if not sms:
                logger.warning(f"SMS {sms_message_id} not found for refund")
                return False
            
            # Check if already refunded
            if sms.is_refunded:
                logger.info(f"SMS {sms_message_id} already refunded")
                return False
            
            # Check if cost was charged
            if not sms.cost or sms.cost <= 0:
                logger.info(f"SMS {sms_message_id} has no cost to refund")
                return False
            
            # Check if refundable
            refundable_statuses = [
                MessageStatus.FAILED,
                MessageStatus.NOT_DELIVERED
            ]
            if sms.status not in refundable_statuses:
                logger.info(f"SMS {sms_message_id} status {sms.status} not refundable")
                return False
            
            # Lock wallet
            stmt = (
                select(Wallet)
                .where(Wallet.organization_id == sms.organization_id)
                .with_for_update()
            )
            result = await db.execute(stmt)
            wallet = result.scalar_one_or_none()
            
            if not wallet:
                logger.error(f"Wallet not found for org {sms.organization_id}")
                return False
            
            refund_amount = Decimal(str(sms.cost))
            
            # Refund to original credit source
            if sms.credit_source == "subscription":
                wallet.subscription_credits += refund_amount
            elif sms.credit_source == "payg":
                wallet.payg_credits += refund_amount
            else:  # hybrid - refund to PAYG
                wallet.payg_credits += refund_amount
            
            wallet.balance += refund_amount
            
            # Create refund ledger entry
            ledger = BillingLedger(
                organization_id=sms.organization_id,
                amount=refund_amount,
                type=LedgerType.CREDIT,
                category="refund",
                reference_type="sms_message",
                reference_id=str(sms_message_id),
                credit_source=sms.credit_source,
                description=f"Refund for failed SMS {sms_message_id}",
                balance_after=wallet.balance,
                extra_data={
                    "sms_id": sms_message_id,
                    "original_cost": str(sms.cost),
                    "failure_reason": getattr(sms.status, "value", str(sms.status))
                }
            )
            db.add(ledger)
            await db.flush()
            
            # Update SMS message
            sms.is_refunded = True
            sms.refund_amount = refund_amount
            sms.refunded_at = datetime.utcnow()
            sms.refund_ledger_entry_id = ledger.id
            
            await db.commit()
            logger.info(f"Refunded {refund_amount} credits for SMS {sms_message_id}")
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error refunding SMS {sms_message_id}: {str(e)}")
            return False
    
    @staticmethod
    async def renew_subscription_credits(
        db: AsyncSession,
        organization_id: int
    ) -> None:
        """
        Reset subscription credits on monthly renewal.
        Called by scheduled job.
        """
        try:
            # Get organization with plan
            stmt = (
                select(Organization)
                .options(selectinload(Organization.plan))
                .where(Organization.id == organization_id)
            )
            result = await db.execute(stmt)
            org = result.scalar_one_or_none()
            
            if not org:
                logger.error(f"Organization {organization_id} not found")
                return
            
            # Lock wallet
            stmt = (
                select(Wallet)
                .where(Wallet.organization_id == organization_id)
                .with_for_update()
            )
            result = await db.execute(stmt)
            wallet = result.scalar_one_or_none()
            
            if not wallet:
                logger.error(f"Wallet not found for org {organization_id}")
                return
            
            # Reset subscription credits
            new_credits = Decimal(str(org.plan.monthly_credits))
            wallet.subscription_credits = new_credits
            wallet.balance = wallet.subscription_credits + wallet.payg_credits
            wallet.last_subscription_renewal = datetime.utcnow()
            
            # Create ledger entry
            ledger = BillingLedger(
                organization_id=organization_id,
                amount=new_credits,
                type=LedgerType.CREDIT,
                category="subscription_renewal",
                credit_source="subscription",
                description=f"Monthly subscription renewal - {org.plan.name}",
                balance_after=wallet.balance,
                extra_data={
                    "plan_name": org.plan.name,
                    "plan_id": org.plan_id
                }
            )
            db.add(ledger)
            
            await db.commit()
            logger.info(f"Renewed subscription credits for org {organization_id}: {new_credits}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error renewing subscription for org {organization_id}: {str(e)}")
    
    @staticmethod
    async def add_payg_credits(
        db: AsyncSession,
        organization_id: int,
        amount: Decimal,
        payment_reference: str,
        user_id: Optional[int] = None
    ) -> None:
        """Add purchased credits to organization wallet."""
        try:
            # Lock wallet
            stmt = (
                select(Wallet)
                .where(Wallet.organization_id == organization_id)
                .with_for_update()
            )
            result = await db.execute(stmt)
            wallet = result.scalar_one_or_none()
            
            if not wallet:
                logger.error(f"Wallet not found for org {organization_id}")
                return
            
            wallet.payg_credits += amount
            wallet.balance += amount
            
            ledger = BillingLedger(
                organization_id=organization_id,
                amount=amount,
                type=LedgerType.CREDIT,
                category="topup",
                reference_type="payment",
                reference_id=payment_reference,
                credit_source="payg",
                description=f"Credit purchase - {payment_reference}",
                balance_after=wallet.balance,
                extra_data={
                    "payment_reference": payment_reference,
                    "amount": str(amount)
                },
                created_by=user_id
            )
            db.add(ledger)
            
            await db.commit()
            logger.info(f"Added {amount} PAYG credits to org {organization_id}")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error adding PAYG credits to org {organization_id}: {str(e)}")

    @staticmethod
    async def use_credits(
        db: AsyncSession,
        organization_id: int,
        amount: Decimal,
        description: str,
        user_id: Optional[int] = None
    ) -> bool:
        """
        Manually deduct credits from organization wallet.
        Used by admins for corrections or custom charges.
        """
        try:
            # Lock wallet
            stmt = (
                select(Wallet)
                .where(Wallet.organization_id == organization_id)
                .with_for_update()
            )
            result = await db.execute(stmt)
            wallet = result.scalar_one_or_none()
            
            if not wallet:
                return False
            
            # Check balance
            if wallet.balance < amount:
                return False
            
            # Deduct from PAYG first, then subscription
            if wallet.payg_credits >= amount:
                wallet.payg_credits -= amount
            else:
                remaining = amount - wallet.payg_credits
                wallet.payg_credits = Decimal('0')
                wallet.subscription_credits -= remaining
                
            wallet.balance = wallet.payg_credits + wallet.subscription_credits
            
            ledger = BillingLedger(
                organization_id=organization_id,
                amount=amount,
                type=LedgerType.DEBIT,
                category="manual_deduction",
                description=description,
                balance_after=wallet.balance,
                created_by=user_id
            )
            db.add(ledger)
            await db.commit()
            return True
        except Exception as e:
            await db.rollback()
            logger.error(f"Error using credits: {str(e)}")
            return False

# Global instance
billing_service = BillingService()
