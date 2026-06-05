"""add announcement priority

Revision ID: b1c2d3e4f5a6
Revises: f0a1b2c3d4e5
Create Date: 2026-06-05 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "f0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "system_announcements",
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="normal"),
    )
    op.create_index(
        "ix_system_announcements_priority",
        "system_announcements",
        ["priority"],
        unique=False,
    )
    op.alter_column("system_announcements", "priority", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_system_announcements_priority", table_name="system_announcements")
    op.drop_column("system_announcements", "priority")
