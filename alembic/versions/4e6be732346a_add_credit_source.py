"""add credit_source

Revision ID: 4e6be732346a
Revises: 244fe910da4b
Create Date: 2026-08-10 23:57:49.312184

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e6be732346a'
down_revision: Union[str, Sequence[str], None] = '244fe910da4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('billing_ledger', sa.Column('credit_source', sa.String(length=20), nullable=True))
    op.add_column('sms_messages', sa.Column('credit_source', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('sms_messages', 'credit_source')
    op.drop_column('billing_ledger', 'credit_source')
