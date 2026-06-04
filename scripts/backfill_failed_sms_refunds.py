import argparse
import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.db.database import SessionLocal
from app.db.models import MessageStatus, SMSMessage
from app.services.billing_service import BillingService


REFUNDABLE_STATUSES = (
    MessageStatus.FAILED,
    MessageStatus.EXPIRED,
    MessageStatus.UNDELIVERABLE,
)


async def backfill_failed_sms_refunds(dry_run: bool = False, limit: int | None = None) -> None:
    """
    Backfill refunds for SMS messages that permanently failed before DLR refunding
    was wired up.

    The job is intentionally idempotent:
    - only messages with `is_refunded = false` are selected
    - the refund service itself also guards against double refunds
    """
    async with SessionLocal() as db:
        stmt = (
            select(SMSMessage.id, SMSMessage.status, SMSMessage.cost)
            .where(
                SMSMessage.status.in_(REFUNDABLE_STATUSES),
                SMSMessage.is_refunded == False,  # noqa: E712
                SMSMessage.cost.is_not(None),
                SMSMessage.cost > 0,
            )
            .order_by(SMSMessage.id.asc())
        )

        if limit is not None:
            stmt = stmt.limit(limit)

        result = await db.execute(stmt)
        rows = result.all()

        if not rows:
            print("No refundable failed SMS messages found.")
            return

        target_count = len(rows)
        target_amount = sum((Decimal(str(row.cost)) for row in rows), Decimal("0"))

        print(
            f"Found {target_count} refundable SMS messages "
            f"with a total refund value of GHs {target_amount:.4f}."
        )

        if dry_run:
            print("Dry run enabled. No database changes were made.")
            return

        refunded = 0
        skipped = 0
        refunded_amount = Decimal("0")

        for index, row in enumerate(rows, start=1):
            ok = await BillingService.refund_failed_sms(db, row.id)
            if ok:
                refunded += 1
                refunded_amount += Decimal(str(row.cost))
            else:
                skipped += 1

            if index % 100 == 0:
                print(f"Processed {index}/{target_count} messages...")

        print(
            f"Backfill complete. Refunded {refunded} messages "
            f"for GHs {refunded_amount:.4f}; skipped {skipped}."
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill refunds for failed SMS messages.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report the affected messages without writing any changes.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only process the first N eligible messages.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(backfill_failed_sms_refunds(dry_run=args.dry_run, limit=args.limit))
