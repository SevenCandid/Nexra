"""merge heads: b1c2d3e4f5a6 and f1b2c3d4e5f6

Revision ID: g2h3i4j5k6l7
Revises: b1c2d3e4f5a6, f1b2c3d4e5f6
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "g2h3i4j5k6l7"
down_revision: Union[str, Sequence[str], None] = ("b1c2d3e4f5a6", "f1b2c3d4e5f6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
