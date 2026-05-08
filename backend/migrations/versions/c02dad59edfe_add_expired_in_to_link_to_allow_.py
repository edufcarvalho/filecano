"""add expired_in to link, to allow restoration

Revision ID: c02dad59edfe
Revises: 21887aa3f4e5
Create Date: 2026-05-08 14:08:28.523397

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

from app.core import get_settings


# revision identifiers, used by Alembic.
revision: str = 'c02dad59edfe'
down_revision: Union[str, Sequence[str], None] = '21887aa3f4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    expires=get_settings().shared_url_expire_seconds
    """Upgrade schema."""
    op.add_column('links', sa.Column('expiration_term', sa.BigInteger()))
    op.add_column('links', sa.Column('created_at', sa.DateTime(timezone=True)))
    op.execute(
        f"""
        UPDATE links
        SET 
            expiration_term = {expires},
            created_at = expires_at - INTERVAL '{expires} seconds'
        """
    )
    op.alter_column('links', 'expiration_term', nullable=False)
    op.alter_column('links', 'created_at', nullable=False)



def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('links', 'expiration_term')
    op.drop_column('links', 'created_at')
