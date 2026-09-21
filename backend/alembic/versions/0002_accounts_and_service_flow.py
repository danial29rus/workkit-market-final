"""accounts and service flow"""
from alembic import op
import sqlalchemy as sa

revision = '0002_accounts_and_service_flow'
down_revision = '0001_initial'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('customers') as batch:
        batch.add_column(sa.Column('full_name', sa.String(160), nullable=True))
        batch.add_column(sa.Column('phone', sa.String(40), nullable=True))
        batch.add_column(sa.Column('password_hash', sa.String(255), nullable=True))
        batch.add_column(sa.Column('created_at', sa.DateTime(), nullable=True))
    op.execute("UPDATE customers SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")
    op.execute("UPDATE product_variants SET delivery_type = 'service'")

def downgrade():
    op.execute("UPDATE product_variants SET delivery_type = 'download'")
    with op.batch_alter_table('customers') as batch:
        batch.drop_column('created_at')
        batch.drop_column('password_hash')
        batch.drop_column('phone')
        batch.drop_column('full_name')
