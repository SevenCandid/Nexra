from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Campaign, CampaignStatus, MessageStatus, SMSMessage


async def refresh_campaign_delivery_status(db: AsyncSession, campaign_id: int) -> Campaign | None:
    """
    Recompute a campaign's aggregate delivery state from its message rows.

    Rules:
    - PENDING / PROCESSING / SENT => campaign is still DELIVERING
    - DELIVERED => contributes to delivered_count
    - FAILED => Nexra-side failure, contributes to failed_count
    - EXPIRED / UNDELIVERABLE => provider-side not delivered, contributes to failed_count
    - When all messages are terminal:
      - if at least one message was delivered, mark COMPLETED
      - otherwise mark FAILED
    """
    # CRITICAL: Flush pending session changes to the DB first.
    # Because autoflush is False, if we don't flush here, the counts_stmt 
    # below will group by the old, unmodified data in the DB.
    await db.flush()

    campaign_stmt = select(Campaign).where(Campaign.id == campaign_id)
    campaign_result = await db.execute(campaign_stmt)
    campaign = campaign_result.scalar_one_or_none()
    if not campaign:
        return None

    counts_stmt = (
        select(SMSMessage.status, func.count(SMSMessage.id))
        .where(SMSMessage.campaign_id == campaign_id)
        .group_by(SMSMessage.status)
    )
    counts_result = await db.execute(counts_stmt)
    counts = {row[0]: row[1] for row in counts_result.all()}

    delivered = int(counts.get(MessageStatus.DELIVERED, 0))
    submitted = int(counts.get(MessageStatus.SUBMITTED, 0))
    pending = int(counts.get(MessageStatus.PENDING, 0))
    processing = int(counts.get(MessageStatus.PROCESSING, 0))
    failed = int(counts.get(MessageStatus.FAILED, 0))
    not_delivered = int(counts.get(MessageStatus.NOT_DELIVERED, 0))

    in_flight = pending + processing + submitted
    terminal_total = delivered + failed + not_delivered

    campaign.delivered_count = delivered
    campaign.failed_count = failed + not_delivered

    if in_flight > 0:
        campaign.status = CampaignStatus.DELIVERING.value
    elif terminal_total > 0:
        campaign.status = (
            CampaignStatus.COMPLETED.value
            if delivered > 0
            else CampaignStatus.FAILED.value
        )

    return campaign
