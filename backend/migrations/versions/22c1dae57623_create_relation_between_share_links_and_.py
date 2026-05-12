"""create relation between share links and folders

Revision ID: 22c1dae57623
Revises: 6ce3ff41af2e
Create Date: 2026-05-12 23:33:38.291899

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '22c1dae57623'
down_revision: Union[str, Sequence[str], None] = '6ce3ff41af2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('folder_link_relations',
        sa.Column('folder_id', sa.Uuid(), nullable=False),
        sa.Column('link_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['folder_id'], ['folders.id'], ),
        sa.ForeignKeyConstraint(['link_id'], ['links.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('folder_id', 'link_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('folder_link_relations')
