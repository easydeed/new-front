
"""add partners org scoped

Revision ID: partners_1760585384
Revises: 
Create Date: 2025-10-15

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'partners_1760585384'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'partners',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), nullable=False, index=True),
        sa.Column('name', sa.String(), nullable=False, index=True),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    op.create_table(
        'partner_people',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('partner_id', sa.String(), sa.ForeignKey('partners.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

def downgrade():
    op.drop_table('partner_people')
    op.drop_table('partners')
