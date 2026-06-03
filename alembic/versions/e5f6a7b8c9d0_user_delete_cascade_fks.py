"""user delete cascade foreign keys

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _replace_user_fk(table: str, column: str, ondelete: str, constraint: str | None = None) -> None:
    name = constraint or f"{table}_{column}_fkey"
    op.drop_constraint(name, table, type_="foreignkey")
    op.create_foreign_key(name, table, "users", [column], ["id"], ondelete=ondelete)


def upgrade() -> None:
    op.alter_column("admin_audit_logs", "admin_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("system_announcements", "created_by", existing_type=sa.Integer(), nullable=True)

    _replace_user_fk("notifications", "user_id", "CASCADE")
    _replace_user_fk("api_keys", "user_id", "CASCADE")
    _replace_user_fk("campaigns", "user_id", "CASCADE")
    _replace_user_fk("message_templates", "user_id", "CASCADE")
    _replace_user_fk("sms_messages", "user_id", "CASCADE")
    _replace_user_fk("billing_ledger", "created_by", "SET NULL")
    _replace_user_fk("staff_invites", "used_by_id", "SET NULL")
    _replace_user_fk("admin_audit_logs", "admin_id", "SET NULL")
    _replace_user_fk("webhook_subscriptions", "user_id", "CASCADE")
    _replace_user_fk("system_announcements", "created_by", "SET NULL")
    _replace_user_fk("bug_reports", "user_id", "CASCADE")

    op.drop_constraint("sms_messages_campaign_id_fkey", "sms_messages", type_="foreignkey")
    op.create_foreign_key(
        "sms_messages_campaign_id_fkey",
        "sms_messages",
        "campaigns",
        ["campaign_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("sms_messages_campaign_id_fkey", "sms_messages", type_="foreignkey")
    op.create_foreign_key(
        "sms_messages_campaign_id_fkey",
        "sms_messages",
        "campaigns",
        ["campaign_id"],
        ["id"],
    )

    for table, column in [
        ("notifications", "user_id"),
        ("api_keys", "user_id"),
        ("campaigns", "user_id"),
        ("message_templates", "user_id"),
        ("sms_messages", "user_id"),
        ("billing_ledger", "created_by"),
        ("staff_invites", "used_by_id"),
        ("admin_audit_logs", "admin_id"),
        ("webhook_subscriptions", "user_id"),
        ("system_announcements", "created_by"),
        ("bug_reports", "user_id"),
    ]:
        name = f"{table}_{column}_fkey"
        op.drop_constraint(name, table, type_="foreignkey")
        op.create_foreign_key(name, table, "users", [column], ["id"])

    op.alter_column("admin_audit_logs", "admin_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("system_announcements", "created_by", existing_type=sa.Integer(), nullable=False)
