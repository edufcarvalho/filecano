"""add_custom_name_and_deleted_at_to_link

Revision ID: 3417760500f8
Revises: d6d12db8f240
Create Date: 2026-05-05 01:46:36.658432

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '3417760500f8'
down_revision: Union[str, Sequence[str], None] = 'd6d12db8f240'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('links', sa.Column('custom_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('links', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint(None, 'links', ['custom_name'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'links', type_='unique')
    op.drop_column('links', 'deleted_at')
    op.drop_column('links', 'custom_name')
