from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone_number: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    role: str
    organization_id: int
    organization_name: Optional[str] = None
    plan_name: Optional[str] = None
    plan_slug: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None

# Contact Schemas
class ContactBase(BaseModel):
    phone_number: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    tags: Optional[dict] = None

class ContactCreate(ContactBase):
    pass

class ContactResponse(BaseModel):
    id: int
    phone_number: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class ContactListResponse(BaseModel):
    items: List[ContactResponse]
    total: int

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization_name: str
    phone_number: str
    admin_secret: Optional[str] = None
    staff_id: Optional[str] = None

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserProfileUpdate(BaseModel):
    phone_number: Optional[str] = None
    full_name: Optional[str] = None

# SMS Schemas
class SMSCreate(BaseModel):
    recipient: str = Field(..., description="Phone number with country code, e.g. 233241234567")
    sender: str = Field(..., description="Sender ID (Alphanumeric or numeric)")
    message: str = Field(..., min_length=1)

class SMSResponse(BaseModel):
    id: int
    status: str
    recipient: str
    content: str
    provider_name: str
    created_at: datetime

    class Config:
        from_attributes = True

class MessageListResponse(BaseModel):
    items: List[SMSResponse]
    total: int

# Campaign Schemas
class CampaignCreate(BaseModel):
    name: str
    sender: str
    template: str
    scheduled_at: Optional[datetime] = None
    contact_ids: List[int]
    group_ids: Optional[List[int]] = []

class CampaignResponse(BaseModel):
    id: int
    name: str
    sender: str
    template: str
    status: str
    created_at: datetime
    scheduled_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CampaignListResponse(BaseModel):
    items: List[CampaignResponse]
    total: int

# Billing Schemas
class WalletResponse(BaseModel):
    balance: float
    currency: str
    subscription_credits: float
    payg_credits: float

    class Config:
        from_attributes = True

# Stats Schema
class MessageStats(BaseModel):
    total: int
    sent: int
    delivered: int
    pending: int
    failed: int

class NetworkPricingResponse(BaseModel):
    network_name: str
    cost_per_sms: float
    currency: str

    class Config:
        from_attributes = True

class BillingLedgerResponse(BaseModel):
    id: int
    amount: float
    type: str # credit, debit
    category: str
    description: str
    created_at: datetime
    balance_after: float

    class Config:
        from_attributes = True

# Waitlist Schemas
class WaitlistCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    company: Optional[str] = None
    referral_source: Optional[str] = None

class WaitlistResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    company: Optional[str] = None
    position: int
    signup_date: datetime

    class Config:
        from_attributes = True
# Sender ID Schemas
class SenderIDBase(BaseModel):
    sender_id: str = Field(..., max_length=11, min_length=3)

class SenderIDRequest(SenderIDBase):
    pass

class SenderIDResponse(SenderIDBase):
    id: int
    status: str
    organization_id: int
    organization_name: Optional[str] = None
    admin_comment: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class SenderIDUpdate(BaseModel):
    status: str
    admin_comment: Optional[str] = None

# Organization Schemas
class OrganizationBase(BaseModel):
    name: str
    slug: str
    is_active: bool = True

class Organization(OrganizationBase):
    id: int
    created_at: datetime
    plan_id: int

    class Config:
        from_attributes = True

# Staff Invite Schemas
class StaffInviteResponse(BaseModel):
    id: int
    staff_id: str
    is_used: bool
    created_at: datetime
    used_at: Optional[datetime] = None
    used_by_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Payment Schemas
class PaymentInitializeRequest(BaseModel):
    amount: float
    email: Optional[EmailStr] = None

class MomoPushRequest(BaseModel):
    amount: float
    phone_number: str
    network: str # MTN, VODAFONE, AIRTELTIGO

class TransactionStatusResponse(BaseModel):
    reference: str
    status: str # PENDING, SUCCESS, FAILED
    amount: float
    currency: str
    message: Optional[str] = None

# Message Template Schemas
class MessageTemplateBase(BaseModel):
    title: str = Field(..., max_length=100)
    content: str

class MessageTemplateCreate(MessageTemplateBase):
    pass

class MessageTemplateResponse(MessageTemplateBase):
    id: int
    created_at: datetime
    organization_id: int
    user_id: int

    class Config:
        from_attributes = True

# Contact Group Schemas
class ContactGroupBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None

class ContactGroupCreate(ContactGroupBase):
    pass

class ContactGroupResponse(ContactGroupBase):
    id: int
    created_at: datetime
    organization_id: int
    contact_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Bug Report Schemas
class BugReportCreate(BaseModel):
    subject: str = Field(..., max_length=255)
    description: str

class BugReportUpdate(BaseModel):
    status: str

class BugReportOut(BaseModel):
    id: int
    user_id: int
    organization_id: int
    subject: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
