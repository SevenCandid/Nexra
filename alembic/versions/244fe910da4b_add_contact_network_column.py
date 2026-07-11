"""add_contact_network_column

Revision ID: 244fe910da4b
Revises: 8e6aaad579e1
Create Date: 2026-07-11 18:53:26.229822

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '244fe910da4b'
down_revision: Union[str, Sequence[str], None] = '8e6aaad579e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def get_carrier_for_phone(phone: str) -> str:
    clean = "".join(filter(str.isdigit, phone))
    if clean.startswith("00233"):
        clean = clean[5:]
    elif clean.startswith("233"):
        clean = clean[3:]
    elif clean.startswith("0"):
        clean = clean[1:]
        
    prefixes = {
        "24": "MTN Ghana",
        "54": "MTN Ghana",
        "55": "MTN Ghana",
        "59": "MTN Ghana",
        "25": "MTN Ghana",
        "53": "MTN Ghana",
        "20": "Vodafone Ghana",
        "50": "Vodafone Ghana",
        "26": "AirtelTigo Ghana",
        "27": "AirtelTigo Ghana",
        "56": "AirtelTigo Ghana",
        "57": "AirtelTigo Ghana",
    }
    if len(clean) == 9:
        prefix = clean[:2]
        return prefixes.get(prefix, "Unknown")
    return "Unknown"


def upgrade() -> None:
    """Upgrade schema and backfill networks."""
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('contacts')]
    
    if 'network' not in columns:
        op.add_column('contacts', sa.Column('network', sa.String(length=50), nullable=True))
    
    # Backfill existing contacts
    connection = op.get_bind()
    metadata = sa.MetaData()
    contacts_table = sa.Table(
        'contacts', metadata,
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('phone_number', sa.String(20)),
        sa.Column('network', sa.String(50))
    )
    
    results = connection.execute(sa.select(contacts_table.c.id, contacts_table.c.phone_number)).all()
    for row in results:
        network_str = get_carrier_for_phone(row.phone_number)
        connection.execute(
            contacts_table.update().where(contacts_table.c.id == row.id).values(network=network_str)
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('contacts', 'network')
