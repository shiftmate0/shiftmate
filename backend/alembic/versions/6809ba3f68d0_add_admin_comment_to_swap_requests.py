"""add_admin_comment_to_swap_requests

Revision ID: 6809ba3f68d0
Revises: 40041bedf4cc
Create Date: 2026-05-02 09:07:30.439032

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6809ba3f68d0'
down_revision: Union[str, Sequence[str], None] = '40041bedf4cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'swap_requests',
        sa.Column('admin_comment', sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('swap_requests', 'admin_comment')
