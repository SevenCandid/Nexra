"""expand sender id request and verification fields

Revision ID: c7d8e9f0a1b2
Revises: a1b2c3d4e5f6
Create Date: 2026-06-02 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sender_ids", sa.Column("company_name", sa.String(length=255), nullable=True))
    op.add_column("sender_ids", sa.Column("username", sa.String(length=255), nullable=True))
    op.add_column("sender_ids", sa.Column("use_case", sa.Text(), nullable=True))
    op.add_column("sender_ids", sa.Column("website_or_social", sa.String(length=255), nullable=True))
    op.add_column("sender_ids", sa.Column("official_email", sa.String(length=255), nullable=True))
    op.add_column("sender_ids", sa.Column("registration_certificate", sa.Text(), nullable=True))
    op.add_column("sender_ids", sa.Column("authorization_letter", sa.Text(), nullable=True))
    op.add_column("sender_ids", sa.Column("verification_payload", sa.JSON(), nullable=True))
    op.add_column("sender_ids", sa.Column("verification_submitted_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("sender_ids", "verification_submitted_at")
    op.drop_column("sender_ids", "verification_payload")
    op.drop_column("sender_ids", "authorization_letter")
    op.drop_column("sender_ids", "registration_certificate")
    op.drop_column("sender_ids", "official_email")
    op.drop_column("sender_ids", "website_or_social")
    op.drop_column("sender_ids", "use_case")
    op.drop_column("sender_ids", "username")
    op.drop_column("sender_ids", "company_name")
