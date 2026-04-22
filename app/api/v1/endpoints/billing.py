from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api import deps
from app.db.models import User, Wallet, NetworkPricing, BillingLedger
from app.db.database import get_db
from app.schemas.schemas import WalletResponse, NetworkPricingResponse, BillingLedgerResponse

router = APIRouter()

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
    Get current SMS pricing per network, adjusted by organization plan.
    """
    from sqlalchemy.orm import selectinload
    from app.db.models import Organization
    
    # Fetch org with plan to get multiplier
    org_stmt = select(Organization).options(selectinload(Organization.plan)).where(Organization.id == current_user.organization_id)
    org_res = await db.execute(org_stmt)
    org = org_res.scalar_one_or_none()
    
    multiplier = org.plan.payg_rate_multiplier if org and org.plan else 1.0
    
    result = await db.execute(select(NetworkPricing).where(NetworkPricing.is_active == True))
    pricing = result.scalars().all()
    
    # Apply multiplier to base costs
    return [
        {
            "network_name": p.network_name,
            "cost_per_sms": float(p.cost_per_sms) * float(multiplier),
            "currency": p.currency,
            "is_active": p.is_active
        }
        for p in pricing
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
    current_user: User = Depends(deps.get_current_active_superadmin)
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

