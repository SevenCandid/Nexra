"""add_phone_number_to_users

Revision ID: a1b2c3d4e5f6
Revises: 6dc20265e385
Create Date: 2026-05-28 01:08:00

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '6dc20265e385'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone_number', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'phone_number')
