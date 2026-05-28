from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.api import deps
from app.core import security
from app.db.models import User, Organization, Wallet, SubscriptionPlan, StaffInvite, UserRole
from datetime import datetime
from sqlalchemy import select, func
from app.db.database import get_db
from app.schemas.schemas import Token, User as UserSchema, UserRegister, UserProfileUpdate
import httpx
import urllib.parse
from app.core.config import settings
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger("uvicorn.error")
limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Standard OAuth2 password flow. Returns access + refresh tokens.
    """
    email = form_data.username.lower().strip()
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalar_one_or_none()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return {
        "access_token": security.create_access_token(user.id),
        "refresh_token": security.create_refresh_token(user.id),
        "token_type": "bearer",
    }

@router.post("/register", response_model=Token)
@limiter.limit("3/minute")
async def register(
    request: Request,
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user with organization.
    """
    email = user_data.email.lower().strip()
    # Check if user already exists
    result = await db.execute(select(User).where(func.lower(User.email) == email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Get default subscription plan (or create one if none exists)
    result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.slug == "starter"))
    plan = result.scalar_one_or_none()
    
    if not plan:
        # Create a default plan if none exists
        plan = SubscriptionPlan(
            name="Starter",
            slug="starter",
            monthly_price=50.0,
            sms_rate=0.05,
            max_users=5,
            monthly_credits=1000.0,
            bonus_credits_on_signup=0.0,
            pricing_model="hybrid",
            payg_rate_multiplier=1.2,
            features={"tps_limit": 5, "api_access": True}
        )
        db.add(plan)
        await db.flush()
    
    # Get or create organization
    org_slug = user_data.organization_name.lower().replace(" ", "-")
    result = await db.execute(select(Organization).where(Organization.slug == org_slug))
    organization = result.scalar_one_or_none()
    
    if not organization:
        organization = Organization(
            name=user_data.organization_name,
            slug=org_slug,
            plan_id=plan.id,
            is_active=True
        )
        db.add(organization)
        await db.flush()
    
    # Determine Role and validate secrets
    role = UserRole.USER
    staff_invite = None
    
    if user_data.admin_secret:
        if user_data.admin_secret != settings.ADMIN_REGISTRATION_KEY:
            raise HTTPException(status_code=400, detail="Invalid admin secret key")
        role = UserRole.SUPERADMIN
    elif user_data.staff_id:
        # Validate Staff ID
        result = await db.execute(select(StaffInvite).where(StaffInvite.staff_id == user_data.staff_id, StaffInvite.is_used == False))
        staff_invite = result.scalar_one_or_none()
        if not staff_invite:
            raise HTTPException(status_code=400, detail="Invalid or already used Staff ID")
        
        role = UserRole.STAFF

    # Create user
    user = User(
        email=email,
        hashed_password=security.get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone_number=user_data.phone_number,
        organization_id=organization.id,
        role=role,
        is_active=True
    )
    db.add(user)
    await db.flush()
    
    # Link Staff ID if applicable
    if staff_invite:
        staff_invite.is_used = True
        staff_invite.used_by_id = user.id
        staff_invite.used_at = datetime.utcnow()
    
    # Create wallet with bonus credits using INSERT ... ON CONFLICT DO NOTHING
    stmt = pg_insert(Wallet).values(
        organization_id=organization.id,
        balance=0.0,
        subscription_credits=0.0,
        payg_credits=0.0,
        currency="GHS"
    ).on_conflict_do_nothing(index_elements=["organization_id"])
    await db.execute(stmt)
    await db.commit()

    return {
        "access_token": security.create_access_token(user.id),
        "refresh_token": security.create_refresh_token(user.id),
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Issue a new access token for a still-valid (refresh) token holder.
    The client should call this endpoint using the refresh_token as Bearer.
    """
    return {
        "access_token": security.create_access_token(current_user.id),
        "refresh_token": security.create_refresh_token(current_user.id),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserSchema)
async def read_users_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Fetch organization name and plan info
    from sqlalchemy.orm import selectinload
    query = (
        select(User)
        .options(selectinload(User.organization).selectinload(Organization.plan))
        .where(User.id == current_user.id)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if user:
        user_data = UserSchema.from_orm(user)
        user_data.organization_name = user.organization.name
        user_data.plan_name = user.organization.plan.name if user.organization.plan else None
        user_data.plan_slug = user.organization.plan.slug if user.organization.plan else None
        return user_data
        
    return current_user

@router.put("/me", response_model=UserSchema)
async def update_users_me(
    profile: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    """
    Update current user profile. Used after Google OAuth to capture phone number.
    """
    if profile.phone_number is not None:
        current_user.phone_number = profile.phone_number
    if profile.full_name is not None:
        current_user.full_name = profile.full_name
    
    await db.commit()
    await db.refresh(current_user)
    
    # Return full user schema with org details
    from sqlalchemy.orm import selectinload
    query = (
        select(User)
        .options(selectinload(User.organization).selectinload(Organization.plan))
        .where(User.id == current_user.id)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if user:
        user_data = UserSchema.from_orm(user)
        user_data.organization_name = user.organization.name
        user_data.plan_name = user.organization.plan.name if user.organization.plan else None
        user_data.plan_slug = user.organization.plan.slug if user.organization.plan else None
        return user_data
    return current_user

@router.get("/google/login")
async def google_login():
    """
    Redirect the user to Google's OAuth consent screen.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID not configured")
        
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": redirect_uri,
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
    return {"url": auth_url}

@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """
    Handle the callback from Google, exchange code for token, and login/register.
    """
    try:
        logger.info(f"OAuth: Callback sequence started (code: {code[:5]}...)")
        
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            logger.error("OAuth: Configuration Error - Missing Client ID or Secret")
            raise HTTPException(status_code=500, detail="Google credentials not configured")

        redirect_uri = settings.GOOGLE_REDIRECT_URI
        
        async with httpx.AsyncClient() as client:
            # 1. Exchange code for access token
            logger.info("OAuth: Requesting access token from Google...")
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=10.0
            )
            
            if token_response.status_code != 200:
                logger.error(f"Failed to fetch Google token: {token_response.text}")
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/#/login?error=token_exchange_failed")
                
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            logger.info("OAuth: Token exchange successful")
            
            # 2. Get user info from Google
            logger.info("OAuth: Fetching user profile info...")
            user_info_response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10.0
            )
            
            if user_info_response.status_code != 200:
                logger.error(f"Failed to fetch Google user profile: {user_info_response.text}")
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/#/login?error=profile_fetch_failed")
                
            google_user = user_info_response.json()
            email = google_user.get("email").lower().strip()
            full_name = google_user.get("name")
            logger.info(f"OAuth: Identity confirmed for {email}")
            
        # 3. Check if user exists, otherwise register
        logger.info(f"OAuth: DB sync for {email}")
        result = await db.execute(select(User).where(func.lower(User.email) == email))
        user = result.scalar_one_or_none()
        
        if not user:
            logger.info(f"OAuth: Creating new account for {email}")
            # Get or create default plan
            result = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.slug == "starter"))
            plan = result.scalar_one_or_none()
            
            if not plan:
                logger.info("OAuth: Initializing default subscription plan")
                plan = SubscriptionPlan(
                    name="Starter", slug="starter", monthly_price=50.0, sms_rate=0.05,
                    max_users=5, monthly_credits=0.0, bonus_credits_on_signup=0.0,
                    pricing_model="hybrid", payg_rate_multiplier=1.2, features={"tps_limit": 5}
                )
                db.add(plan)
                await db.flush()
                
            # Create organization
            org_name = f"{full_name}'s Org"
            organization = Organization(
                name=org_name,
                slug=org_name.lower().replace(" ", "-").replace("'", ""),
                plan_id=plan.id,
                is_active=True
            )
            db.add(organization)
            await db.flush()
            
            user = User(
                email=email,
                hashed_password="oauth_managed",
                full_name=full_name,
                organization_id=organization.id,
                is_active=True
            )
            db.add(user)
            await db.flush()
            
            # Create wallet
            wallet = Wallet(
                organization_id=organization.id,
                balance=0.0,
                subscription_credits=0.0,
                payg_credits=0.0,
                currency="GHS"
            )
            db.add(wallet)
            await db.commit()
            logger.info(f"OAuth: Account created successfully")
        else:
            logger.info(f"OAuth: User already exists, proceeding to login")
        
        # 4. Issue token and redirect to frontend
        token = security.create_access_token(user.id)
        frontend_url = f"{settings.FRONTEND_URL}/#/login?token={token}"
        
        logger.info(f"OAuth: Final redirect to frontend")
        return RedirectResponse(url=frontend_url, status_code=302)

    except Exception as e:
        logger.error(f"Google OAuth Callback Error: {str(e)}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/#/login?error=internal_server_error")

@router.post("/admin/impersonate/{user_id}", response_model=Token)
async def admin_impersonate(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_platform_manager)
):
    """
    Superadmin only: Impersonate any user by generating a new access token for their ID.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await deps.log_admin_action(
        db, current_user, "impersonate_user", "user", 
        str(target_user.id), {"email": target_user.email}
    )
    
    return {
        "access_token": security.create_access_token(target_user.id),
        "refresh_token": security.create_refresh_token(target_user.id),
        "token_type": "bearer",
    }

