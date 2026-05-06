"""add preview to image files

Revision ID: bbb8a1e8b212
Revises: 7468fcfdffa2
Create Date: 2026-05-02 12:49:54.279325

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'bbb8a1e8b212'
down_revision: Union[str, Sequence[str], None] = '7468fcfdffa2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('files', sa.Column('preview_object_key', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('files', sa.Column('preview_content_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('files', sa.Column('preview_size_bytes', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('files', 'preview_size_bytes')
    op.drop_column('files', 'preview_content_type')
    op.drop_column('files', 'preview_object_key')
