"""add low balance notified at

Revision ID: f1b2c3d4e5f6
Revises: f0a1b2c3d4e5
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add the column that was added to models.py previously
    op.add_column("wallets", sa.Column("low_balance_notified_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("wallets", "low_balance_notified_at")
