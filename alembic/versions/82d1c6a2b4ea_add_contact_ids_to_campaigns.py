"""Add contact_ids to campaigns

Revision ID: 82d1c6a2b4ea
Revises: 54d81681976c
Create Date: 2026-03-15 23:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '82d1c6a2b4ea'
down_revision: Union[str, Sequence[str], None] = '54d81681976c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add contact_ids column to campaigns table
    op.add_column('campaigns', sa.Column('contact_ids', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove contact_ids column
    op.drop_column('campaigns', 'contact_ids')
