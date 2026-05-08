"""remove column-dependant expirantion_term field

Revision ID: 6ce3ff41af2e
Revises: c02dad59edfe
Create Date: 2026-05-08 16:48:03.543199

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '6ce3ff41af2e'
down_revision: Union[str, Sequence[str], None] = 'c02dad59edfe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('links', 'expiration_term')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('links', sa.Column('expiration_term', sa.BIGINT(), autoincrement=False, nullable=False))
