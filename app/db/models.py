from __future__ import annotations
from datetime import datetime, date
from enum import Enum
from typing import Optional, List
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, Numeric, Boolean, Date, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

# --- ENUMS ---

class UserRole(str, Enum):
    SUPERADMIN = "superadmin"
    STAFF = "staff"
    ORG_ADMIN = "org_admin"
    USER = "user"

class MessageStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUBMITTED = "submitted"
    DELIVERED = "delivered"
    FAILED = "failed"
    NOT_DELIVERED = "not_delivered"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    DELIVERING = "delivering"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"

class LedgerType(str, Enum):
    CREDIT = "credit"
    DEBIT = "debit"

class BugReportStatus(str, Enum):
    PENDING = "pending"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"

# --- SaaS & MULTI-TENANCY ---

class NetworkPricing(Base):
    """Per-network SMS pricing configuration."""
    __tablename__ = "network_pricing"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    network_name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    cost_per_sms: Mapped[float] = mapped_column(Numeric(10, 4))
    currency: Mapped[str] = mapped_column(String(3), default="GHS")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    effective_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (Index('ix_network_pricing_active', 'network_name', 'is_active'),)

class SubscriptionPlan(Base):
    """SaaS pricing tiers that define limits for Organizations."""
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True)
    monthly_price: Mapped[float] = mapped_column(Numeric(10, 2), default=0.0)
    sms_rate: Mapped[float] = mapped_column(Numeric(10, 4)) # Deprecated - use NetworkPricing
    max_users: Mapped[int] = mapped_column(Integer, default=5)
    features: Mapped[dict] = mapped_column(JSON, default=dict)
    
    # Credit allocation
    monthly_credits: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0)
    bonus_credits_on_signup: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0)
    
    # Pricing model
    pricing_model: Mapped[str] = mapped_column(String(20), default="hybrid") # subscription, payg, hybrid
    payg_rate_multiplier: Mapped[float] = mapped_column(Numeric(4, 2), default=1.0)

    organizations = relationship("Organization", back_populates="plan")

class Organization(Base):
    """The root of multi-tenancy. Everything belongs to an Organization."""
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscription_plans.id"))
    
    # Relationships
    plan = relationship("SubscriptionPlan", back_populates="organizations")
    users = relationship("User", back_populates="organization")
    api_keys = relationship("APIKey", back_populates="organization")
    contacts = relationship("Contact", back_populates="organization")
    campaigns = relationship("Campaign", back_populates="organization")
    messages = relationship("SMSMessage", back_populates="organization")
    ledger_entries = relationship("BillingLedger", back_populates="organization")
    wallet = relationship("Wallet", back_populates="organization", uselist=False)
    contact_groups = relationship("ContactGroup", back_populates="organization")
    notifications = relationship("Notification", back_populates="organization")

# --- IDENTITY & ACCESS ---

class User(Base):
    """Identity within an organization."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(String(20), default=UserRole.USER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    permissions: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True)
    
    organization = relationship("Organization", back_populates="users")
    api_keys = relationship("APIKey", back_populates="user")
    messages = relationship("SMSMessage", back_populates="user")

class APIKey(Base):
    """Programmatic access keys for developers."""
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    key_prefix: Mapped[str] = mapped_column(String(16), index=True) # First few chars for identification
    hashed_key: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(100)) # e.g. "Staging Key"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"))

    user = relationship("User", back_populates="api_keys")
    organization = relationship("Organization", back_populates="api_keys")

# --- CONTACTS & CAMPAIGNS ---

from sqlalchemy import Table, Column

# Association table for Group-Contact many-to-many relationship
contact_group_association = Table(
    "contact_group_association",
    Base.metadata,
    Column("contact_id", Integer, ForeignKey("contacts.id"), primary_key=True),
    Column("group_id", Integer, ForeignKey("contact_groups.id"), primary_key=True),
)

class ContactGroup(Base):
    """Segmented groups of contacts."""
    __tablename__ = "contact_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"))
    organization = relationship("Organization", back_populates="contact_groups")

    contacts = relationship("Contact", secondary=contact_group_association, back_populates="groups")

class Contact(Base):
    """Address book entry for bulk sending."""
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    phone_number: Mapped[str] = mapped_column(String(20), index=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(100))
    last_name: Mapped[Optional[str]] = mapped_column(String(100))
    tags: Mapped[Optional[dict]] = mapped_column(JSON) # e.g. ["customer", "loyalty_program"]
    
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True)
    organization = relationship("Organization", back_populates="contacts")

    groups = relationship("ContactGroup", secondary=contact_group_association, back_populates="contacts")

    __table_args__ = (Index('ix_contacts_org_phone', 'organization_id', 'phone_number', unique=True),)

class Campaign(Base):
    """Bulk SMS orchestration."""
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    sender: Mapped[str] = mapped_column(String(20))
    template: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default=CampaignStatus.DRAFT.value)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_recipients: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    delivered_count: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    failed_count: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    meta_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    contact_ids: Mapped[Optional[List[int]]] = mapped_column(JSON, nullable=True)
    group_ids: Mapped[Optional[List[int]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"))
    
    organization = relationship("Organization", back_populates="campaigns")
    messages = relationship("SMSMessage", back_populates="campaign")

class MessageTemplate(Base):
    """Reusable SMS message templates."""
    __tablename__ = "message_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(100))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    organization = relationship("Organization")
    user = relationship("User")

# --- MESSAGING LOGS ---

class DeliveryReportLog(Base):
    """Raw SMPP delivery receipts and their parsed status."""
    __tablename__ = "delivery_report_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    raw_content: Mapped[str] = mapped_column(Text)
    
    # Extracted fields from SMPP DLR string
    provider_msg_id: Mapped[str] = mapped_column(String(100), index=True)
    stat: Mapped[Optional[str]] = mapped_column(String(20), index=True)
    err: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    sub: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    dlvrd: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationship to the original message
    sms_message_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("sms_messages.id"), nullable=True)
    sms_message = relationship("SMSMessage", back_populates="delivery_reports")

class SMSMessage(Base):
    """Individual message log (The 'MessageLog')."""
    __tablename__ = "sms_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sender: Mapped[str] = mapped_column(String(20), index=True)
    recipient: Mapped[str] = mapped_column(String(20), index=True)
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default=MessageStatus.PENDING.value, index=True)
    
    # Telco metadata
    provider_name: Mapped[str] = mapped_column(String(50), index=True)
    provider_msg_id: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Retry Logic
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    next_retry_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Context
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True)
    campaign_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="messages")
    organization = relationship("Organization", back_populates="messages")
    campaign = relationship("Campaign", back_populates="messages")
    delivery_reports = relationship("DeliveryReportLog", back_populates="sms_message")
    
    # Billing fields
    cost: Mapped[Optional[float]] = mapped_column(Numeric(10, 4), nullable=True)
    credit_source: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # subscription, payg, hybrid
    is_refunded: Mapped[bool] = mapped_column(Boolean, default=False)
    refund_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 4), nullable=True)
    refunded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ledger_entry_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    refund_ledger_entry_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

# --- BILLING & LEDGER ---

class Wallet(Base):
    """Current credit balance for an Organization."""
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), unique=True)
    balance: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0)
    currency: Mapped[str] = mapped_column(String(3), default="GHS")
    
    # Subscription credits tracking
    subscription_credits: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0)
    payg_credits: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0)
    last_subscription_renewal: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Low-balance notification throttle: stores when the last low-balance alert was sent.
    # We only re-notify once per 24 hours to avoid spamming users.
    low_balance_notified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="wallet")

class BillingLedger(Base):
    """Immutable audit trail of all financial movements."""
    __tablename__ = "billing_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 4))
    type: Mapped[LedgerType] = mapped_column(String(10)) # CREDIT or DEBIT
    
    # Transaction categorization
    category: Mapped[str] = mapped_column(String(50)) # sms_charge, refund, topup, subscription_renewal
    
    # Reference tracking
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # sms_message, payment, subscription
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    # Credit type tracking
    credit_source: Mapped[Optional[str]] = mapped_column(String(20), nullable=True) # subscription, payg, bonus, hybrid
    
    description: Mapped[str] = mapped_column(String(255))
    balance_after: Mapped[float] = mapped_column(Numeric(12, 4)) # Snapshot of balance for auditing
    
    # Extra data for auditing (renamed from metadata to avoid SQLAlchemy reserved keyword)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True)

    organization = relationship("Organization", back_populates="ledger_entries")

# --- SMPP INFRASTRUCTURE ---

class SMPPAccount(Base):
    """Core config for MNO links."""
    __tablename__ = "smpp_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    provider_name: Mapped[str] = mapped_column(String(50), unique=True)
    host: Mapped[str] = mapped_column(String(255))
    port: Mapped[int] = mapped_column(Integer)
    system_id: Mapped[str] = mapped_column(String(20))
    password: Mapped[str] = mapped_column(String(50))
    system_type: Mapped[str] = mapped_column(String(20), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    tps_limit: Mapped[int] = mapped_column(Integer, default=10)

class SenderIDStatus(str, Enum):
    PENDING = "pending"
    NEED_VERIFICATION = "need_verification"
    APPROVED = "approved"
    REJECTED = "rejected"

class SenderID(Base):
    """Registered and approved alphanumeric sender names."""
    __tablename__ = "sender_ids"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sender_id: Mapped[str] = mapped_column(String(11), index=True)
    status: Mapped[SenderIDStatus] = mapped_column(String(20), default=SenderIDStatus.PENDING)
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    use_case: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    website_or_social: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    official_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    registration_certificate: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    authorization_letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    application_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    verification_payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    verification_submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Audit trail
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, onupdate=datetime.utcnow)
    admin_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True)
    organization = relationship("Organization")

    __table_args__ = (Index('ix_sender_ids_org_name', 'organization_id', 'sender_id', unique=True),)

class StaffInvite(Base):
    """Secure invitation codes for staff registration."""
    __tablename__ = "staff_invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    staff_id: Mapped[str] = mapped_column(String(20), unique=True, index=True) # e.g. NEX-7421
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Track who used it
    used_by_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

# --- AUDIT LOG ---

class AdminAuditLog(Base):
    """Immutable record of all admin actions for compliance."""
    __tablename__ = "admin_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    admin_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    admin_email: Mapped[str] = mapped_column(String(255))  # Denormalized for historical accuracy
    action: Mapped[str] = mapped_column(String(100), index=True)  # e.g. approve_sender_id, delegate_permission
    target_type: Mapped[str] = mapped_column(String(50))  # e.g. sender_id, user
    target_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    admin = relationship("User", foreign_keys=[admin_id])

# --- NOTIFICATIONS ---

class Notification(Base):
    """System notifications for users."""
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50), default="info") # info, success, warning, error
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    link: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True)

    user = relationship("User")
    organization = relationship("Organization", back_populates="notifications")

# --- WAITLIST ---

class Waitlist(Base):
    """Landing page waitlist signups."""
    __tablename__ = "waitlist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    referral_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    position: Mapped[int] = mapped_column(Integer)  # Their place in line
    signup_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notified: Mapped[bool] = mapped_column(Boolean, default=False)  # Sent launch email
# --- DEVELOPER TOOLS ---

class WebhookSubscription(Base):
    """Developer webhooks for real-time delivery reports."""
    __tablename__ = "webhook_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    url: Mapped[str] = mapped_column(String(512))
    events: Mapped[dict] = mapped_column(JSON, default=lambda: ["message.sent", "message.delivered", "message.failed"])
    secret: Mapped[str] = mapped_column(String(128)) # For signing requests
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")
    user = relationship("User")

    __table_args__ = (Index('ix_webhooks_org_url', 'organization_id', 'url', unique=True),)

class SystemAnnouncement(Base):
    """Platform-wide announcements visible to all users."""
    __tablename__ = "system_announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50), default="info") # info, warning, success, emergency
    priority: Mapped[str] = mapped_column(String(20), default="normal", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    target_user_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

class BugReport(Base):
    """Bug reports and issues submitted by users."""
    __tablename__ = "bug_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), index=True)
    
    subject: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default=BugReportStatus.PENDING.value)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    organization = relationship("Organization")
