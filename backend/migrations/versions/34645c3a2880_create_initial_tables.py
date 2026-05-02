"""create initial tables

Revision ID: 34645c3a2880
Revises: 
Create Date: 2026-05-01 13:43:25.324079

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '34645c3a2880'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table('users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('hashed_password', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table('files',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('object_key', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('original_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('content_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('checksum', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('object_key')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('files')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')

