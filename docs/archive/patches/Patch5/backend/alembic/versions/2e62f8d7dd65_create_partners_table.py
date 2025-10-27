"""create partners table

Revision ID: 2e62f8d7dd65
Revises: 
Create Date: 2025-10-16T15:45:22.162393Z
"""
from alembic import op
import sqlalchemy as sa
import uuid

# revision identifiers, used by Alembic.
revision = '2e62f8d7dd65'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'partners',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False, index=True),
        sa.Column('created_by_user_id', sa.String(), nullable=False, index=True),
        sa.Column('category', sa.String(), nullable=False, server_default='other'),
        sa.Column('role', sa.String(), nullable=False, server_default='other'),
        sa.Column('company_name', sa.String(), nullable=False),
        sa.Column('contact_name', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('address_line1', sa.String(), nullable=True),
        sa.Column('address_line2', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('postal_code', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_partners_org', 'partners', ['organization_id'])

def downgrade() -> None:
    op.drop_index('ix_partners_org', table_name='partners')
    op.drop_table('partners')
