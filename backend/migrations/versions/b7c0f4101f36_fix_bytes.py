"""fix bytes

Revision ID: b7c0f4101f36
Revises: 437efedb3046
Create Date: 2026-05-17 21:49:19.257592

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c0f4101f36'
down_revision: Union[str, Sequence[str], None] = '437efedb3046'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE files f SET size_bytes = f.size_bytes / 1024")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE files f SET size_bytes = f.size_bytes * 1024")
