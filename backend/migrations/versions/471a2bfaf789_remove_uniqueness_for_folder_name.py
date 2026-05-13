"""remove uniqueness for folder name

Revision ID: 471a2bfaf789
Revises: 22c1dae57623
Create Date: 2026-05-13 14:14:33.132916

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '471a2bfaf789'
down_revision: Union[str, Sequence[str], None] = '22c1dae57623'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f('uq_user_item_name'), 'folders', type_='unique')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_unique_constraint(op.f('uq_user_item_name'), 'folders', ['user_id', 'name'], postgresql_nulls_not_distinct=False)
