"""change_folder_id name

Revision ID: 9da62d37cf23
Revises: 825e76f21c0b
Create Date: 2026-05-19 22:11:43.810726

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '9da62d37cf23'
down_revision: Union[str, Sequence[str], None] = '825e76f21c0b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('files', 'folder_id', new_column_name='parent_id')


def downgrade() -> None:
    op.alter_column('files', 'parent_id', new_column_name='file_id')
