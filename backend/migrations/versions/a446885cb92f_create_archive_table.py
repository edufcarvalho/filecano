"""create_archive_table

Revision ID: a446885cb92f
Revises: 9da62d37cf23
Create Date: 2026-05-23 12:01:00.664763

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a446885cb92f'
down_revision: Union[str, Sequence[str], None] = '9da62d37cf23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('archives',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('object_key', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('file_ids_hash', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('file_count', sa.Integer(), nullable=False),
        sa.Column('original_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('compressed_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('last_time_downloaded', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('object_key')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('archives')
