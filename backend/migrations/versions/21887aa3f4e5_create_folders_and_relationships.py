"""create_folders_and_relationships

Revision ID: 21887aa3f4e5
Revises: 3417760500f8
Create Date: 2026-05-06 15:54:12.642509

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '21887aa3f4e5'
down_revision: Union[str, Sequence[str], None] = '3417760500f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('folders',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('parent_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['folders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'name', name='uq_user_item_name')
    )
    op.add_column('files', sa.Column('folder_id', sa.Uuid(), nullable=True))
    op.create_foreign_key('files_folder_ids_fk', 'files', 'folders', ['folder_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('files_folder_ids_fk', 'files', type_='foreignkey')
    op.drop_column('files', 'folder_id')
    op.drop_table('folders')
