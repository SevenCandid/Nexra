from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.db.models import User, Wallet, NetworkPricing, BillingLedger, Organization, SubscriptionPlan
from app.db.database import get_db
from app.schemas.schemas import WalletResponse, NetworkPricingResponse, BillingLedgerResponse
from app.services.billing_service import billing_service, BillingService

router = APIRouter()
PLAN_ALIASES = {
    "custom": "payg",
    "enterprise": "pro"
}

@router.get("/balance", response_model=WalletResponse)
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get current organization wallet balance.
    """
    result = await db.execute(select(Wallet).where(Wallet.organization_id == current_user.organization_id))
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        return WalletResponse(
            balance=0.00,
            currency="GHS",
            subscription_credits=0.00,
            payg_credits=0.00
        )
        
    return wallet

@router.get("/pricing")
async def get_pricing(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get the active plan catalog and current organization plan.
    """
    org_stmt = select(Organization).options(selectinload(Organization.plan)).where(Organization.id == current_user.organization_id)
    org_res = await db.execute(org_stmt)
    org = org_res.scalar_one_or_none()

    plans = await BillingService.get_pricing_catalog(db)
    return [
        {
            "slug": p.slug,
            "name": p.name,
            "monthly_price": float(p.monthly_price or 0),
            "sms_rate": float(p.sms_rate or 0),
            "max_users": p.max_users,
            "pricing_model": p.pricing_model,
            "features": p.features or {},
            "is_current": bool(org and org.plan and org.plan.id == p.id)
        }
        for p in plans
    ]

@router.get("/ledger", response_model=list[BillingLedgerResponse])
async def get_ledger(
    limit: int = 10,
    skip: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Get browsing history / ledger.
    """
    query = select(BillingLedger).where(
        BillingLedger.organization_id == current_user.organization_id
    ).order_by(BillingLedger.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    ledger = result.scalars().all()
    return ledger

@router.post("/topup")
async def topup_wallet(
    amount: float,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Simulated wallet top-up for development.
    """
    from decimal import Decimal
    from app.services.billing_service import billing_service
    
    await billing_service.add_payg_credits(
        db, 
        current_user.organization_id, 
        Decimal(str(amount)), 
        f"TOPUP-{datetime.utcnow().timestamp()}",
        current_user.id
    )
    return {"message": f"Successfully added {amount} credits to your wallet."}

@router.post("/admin/adjust-balance")
async def admin_adjust_balance(
    organization_id: int,
    amount: float,
    description: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_platform_manager)
):
    """
    Superadmin only: Manually adjust any organization's wallet balance.
    Positive amount adds credit, negative amount subtracts.
    """
    from decimal import Decimal
    from app.services.billing_service import billing_service
    
    if amount >= 0:
        await billing_service.add_payg_credits(
            db, organization_id, Decimal(str(amount)), description, current_user.id
        )
    else:
        # Subtracting credits (negative adjustment)
        success = await billing_service.use_credits(
            db, organization_id, Decimal(str(abs(amount))), description
        )
        if not success:
            raise HTTPException(status_code=400, detail="Insufficient funds in organization wallet to perform deduction.")
            
    await deps.log_admin_action(
        db, current_user, "adjust_balance", "organization", 
        str(organization_id), {"amount": amount, "description": description}
    )
    await db.commit()

@router.post("/admin/assign-plan")
async def assign_org_plan(
    org_id: int,
    plan_slug: str = None, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_platform_manager)
):
    """
    Manually assign or cancel a plan for an organization (Admin only).
    """
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    organization = result.scalar_one_or_none()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    plans = await BillingService.ensure_pricing_catalog(db)
    default_plan = plans["payg"]

    if not plan_slug or plan_slug.lower() == "none" or plan_slug.lower() == "cancel":
        organization.plan_id = default_plan.id
        await db.commit()
        await deps.log_admin_action(
            db, current_user, "cancel_plan", "organization", 
            str(org_id), {}
        )
        await db.commit()
        return {"message": "Plan reset to Pay As You Go successfully"}

    normalized_slug = PLAN_ALIASES.get(plan_slug.lower().strip(), plan_slug.lower().strip())
    plan = plans.get(normalized_slug)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    organization.plan_id = plan.id
    await db.commit()
    
    await deps.log_admin_action(
        db, current_user, "assign_plan", "organization", 
        str(org_id), {"plan_slug": plan_slug}
    )
    await db.commit()
    return {"message": f"Plan {plan_slug} assigned successfully"}


@router.post("/buy-plan")
async def buy_plan(
    plan_slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Purchase a subscription plan and assign it to the current organization.
    """
    plans = await BillingService.ensure_pricing_catalog(db)
    normalized_slug = PLAN_ALIASES.get(plan_slug.lower().strip(), plan_slug.lower().strip())
    plan = plans.get(normalized_slug)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if plan.slug == "payg":
        return {"message": "Pay As You Go is already the default plan. Top up your wallet to send SMS."}

    result = await db.execute(select(Wallet).where(Wallet.organization_id == current_user.organization_id))
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    monthly_price = Decimal(str(plan.monthly_price or 0))
    if wallet.balance < monthly_price:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient wallet balance to activate this plan."
        )

    success = await billing_service.use_credits(
        db=db,
        organization_id=current_user.organization_id,
        amount=monthly_price,
        description=f"Plan purchase - {plan.name}",
        user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=400, detail="Unable to deduct plan cost from wallet.")

    organization = await db.get(Organization, current_user.organization_id)
    organization.plan_id = plan.id
    await db.commit()

    # Grant the plan's monthly subscription credits immediately on purchase.
    await billing_service.renew_subscription_credits(db, current_user.organization_id)

    return {"message": f"Plan {plan.name} activated successfully"}
