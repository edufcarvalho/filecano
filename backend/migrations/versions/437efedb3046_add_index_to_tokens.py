"""add index to tokens

Revision ID: 437efedb3046
Revises: 471a2bfaf789
Create Date: 2026-05-15 11:51:19.862131

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '437efedb3046'
down_revision: Union[str, Sequence[str], None] = '471a2bfaf789'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f('links_token_key'), 'links', type_='unique')
    op.create_index(op.f('ix_links_token'), 'links', ['token'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_links_token'), table_name='links')
    op.create_unique_constraint(op.f('links_token_key'), 'links', ['token'], postgresql_nulls_not_distinct=False)
