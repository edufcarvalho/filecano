"""add cascadings

Revision ID: d6d12db8f240
Revises: 33e50261ddce
Create Date: 2026-05-04 13:48:29.921615

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'd6d12db8f240'
down_revision: Union[str, Sequence[str], None] = '33e50261ddce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f('file_link_relations_link_id_fkey'), 'file_link_relations', type_='foreignkey')
    op.create_foreign_key('file_link_relations_link_id_fkey', 'file_link_relations', 'links', ['link_id'], ['id'], ondelete='CASCADE')
    op.add_column('links', sa.Column('user_id', sa.Uuid(), nullable=True))
    op.execute("""
        UPDATE links AS l
        SET user_id = src.user_id
        FROM (
            SELECT DISTINCT ON (fl.link_id)
                fl.link_id,
                f.user_id
            FROM file_link_relations AS fl
            JOIN files AS f ON f.id = fl.file_id
            WHERE f.user_id IS NOT NULL
            ORDER BY fl.link_id, f.created_at DESC NULLS LAST, f.id
        ) AS src
        WHERE src.link_id = l.id
    """)
    op.create_foreign_key('links_user_id_fkey', 'links', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.alter_column('links', 'user_id', nullable=False)


def downgrade() -> None:
    op.drop_constraint('links_user_id_fkey', 'links', type_='foreignkey')
    op.drop_column('links', 'user_id')
    op.drop_constraint('file_link_relations_link_id_fkey', 'file_link_relations', type_='foreignkey')
    op.create_foreign_key(op.f('file_link_relations_link_id_fkey'), 'file_link_relations', 'links', ['link_id'], ['id'])

