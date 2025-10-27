
"""add industry partners table

Revision ID: 20251015_add_industry_partners
Revises: 
Create Date: 2025-10-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251015_add_industry_partners'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'industry_partners',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_partners_user', 'industry_partners', ['user_id'])

def downgrade():
    op.drop_index('ix_partners_user', table_name='industry_partners')
    op.drop_table('industry_partners')
