"""Added musical_key, bpm and size_bytes columns to Track

Revision ID: 3f9a1c2d7e4b
Revises: bbd74ffc30ef
Create Date: 2026-10-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '3f9a1c2d7e4b'
down_revision: Union[str, None] = 'bbd74ffc30ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tracks', sa.Column('musical_key', sa.String(), nullable=True))
    op.add_column('tracks', sa.Column('bpm', sa.Float(), nullable=True))
    op.add_column('tracks', sa.Column('size_bytes', sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column('tracks', 'size_bytes')
    op.drop_column('tracks', 'bpm')
    op.drop_column('tracks', 'musical_key')
