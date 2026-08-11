"""fix billing_ledger columns

Revision ID: 92ac31f20bfb
Revises: 4e6be732346a
Create Date: 2026-08-11 00:16:47.171891

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '92ac31f20bfb'
down_revision: Union[str, Sequence[str], None] = '4e6be732346a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('billing_ledger', sa.Column('balance_after', sa.Numeric(precision=12, scale=4), server_default='0.0000', nullable=False))
    
    # Using execute since column renames can be tricky across versions
    op.execute('ALTER TABLE billing_ledger RENAME COLUMN metadata TO extra_data')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('ALTER TABLE billing_ledger RENAME COLUMN extra_data TO metadata')
    op.drop_column('billing_ledger', 'balance_after')
