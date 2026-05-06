"""add index to original_name and create display_name

Revision ID: 33e50261ddce
Revises: 58e519035a68
Create Date: 2026-05-04 02:26:55.123029

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '33e50261ddce'
down_revision: Union[str, Sequence[str], None] = '58e519035a68'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('files', sa.Column('display_name', sqlmodel.sql.sqltypes.AutoString()))
    op.execute("UPDATE files f SET display_name = f.original_name")
    op.alter_column('files', 'display_name', existing_type=sqlmodel.sql.sqltypes.AutoString(), nullable=False)
    op.create_index(op.f('ix_files_original_name'), 'files', ['original_name'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_files_original_name'), table_name='files')
    op.drop_column('files', 'display_name')
