"""Delete a user and all rows that reference users.id (FK-safe)."""
from __future__ import annotations

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AdminAuditLog,
    APIKey,
    BillingLedger,
    BugReport,
    Campaign,
    DeliveryReportLog,
    MessageTemplate,
    Notification,
    SMSMessage,
    StaffInvite,
    SystemAnnouncement,
    User,
    WebhookSubscription,
)


async def _delete_delivery_reports_for_messages(db: AsyncSession, message_ids: list[int]) -> None:
    if not message_ids:
        return
    await db.execute(
        delete(DeliveryReportLog).where(DeliveryReportLog.sms_message_id.in_(message_ids))
    )


async def delete_user_and_dependencies(db: AsyncSession, user_id: int) -> None:
    """
    Remove dependent rows before deleting the user.
    Required when DB FKs do not use ON DELETE CASCADE.
    """
    campaign_result = await db.execute(
        select(Campaign.id).where(Campaign.user_id == user_id)
    )
    campaign_ids = [row[0] for row in campaign_result.all()]

    if campaign_ids:
        camp_msg_result = await db.execute(
            select(SMSMessage.id).where(SMSMessage.campaign_id.in_(campaign_ids))
        )
        camp_msg_ids = [row[0] for row in camp_msg_result.all()]
        await _delete_delivery_reports_for_messages(db, camp_msg_ids)
        await db.execute(delete(SMSMessage).where(SMSMessage.campaign_id.in_(campaign_ids)))
        await db.execute(delete(Campaign).where(Campaign.id.in_(campaign_ids)))

    user_msg_result = await db.execute(
        select(SMSMessage.id).where(SMSMessage.user_id == user_id)
    )
    user_msg_ids = [row[0] for row in user_msg_result.all()]
    await _delete_delivery_reports_for_messages(db, user_msg_ids)
    await db.execute(delete(SMSMessage).where(SMSMessage.user_id == user_id))

    await db.execute(delete(Notification).where(Notification.user_id == user_id))
    await db.execute(delete(APIKey).where(APIKey.user_id == user_id))
    await db.execute(delete(MessageTemplate).where(MessageTemplate.user_id == user_id))
    await db.execute(delete(WebhookSubscription).where(WebhookSubscription.user_id == user_id))
    await db.execute(delete(BugReport).where(BugReport.user_id == user_id))

    await db.execute(
        update(StaffInvite).where(StaffInvite.used_by_id == user_id).values(used_by_id=None)
    )
    await db.execute(
        update(BillingLedger).where(BillingLedger.created_by == user_id).values(created_by=None)
    )
    await db.execute(
        update(AdminAuditLog).where(AdminAuditLog.admin_id == user_id).values(admin_id=None)
    )
    await db.execute(
        update(SystemAnnouncement)
        .where(SystemAnnouncement.created_by == user_id)
        .values(created_by=None)
    )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        await db.delete(user)
