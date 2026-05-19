"""add_index_to_names

Revision ID: 825e76f21c0b
Revises: b7c0f4101f36
Create Date: 2026-05-18 21:43:20.531568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '825e76f21c0b'
down_revision: Union[str, Sequence[str], None] = 'b7c0f4101f36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.drop_index(op.f('ix_files_original_name'), table_name='files')
    op.create_index('ix_display_name_trgm', 'files', ['display_name'], unique=False, postgresql_using='gin', postgresql_ops={'display_name': 'gin_trgm_ops'})
    op.create_index('ix_original_name_trgm', 'files', ['original_name'], unique=False, postgresql_using='gin', postgresql_ops={'original_name': 'gin_trgm_ops'})
    op.create_index('ix_name_trgm', 'folders', ['name'], unique=False, postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'})


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_name_trgm', table_name='folders', postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'})
    op.drop_index('ix_original_name_trgm', table_name='files', postgresql_using='gin', postgresql_ops={'original_name': 'gin_trgm_ops'})
    op.drop_index('ix_display_name_trgm', table_name='files', postgresql_using='gin', postgresql_ops={'display_name': 'gin_trgm_ops'})
    op.create_index(op.f('ix_files_original_name'), 'files', ['original_name'], unique=False)
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
