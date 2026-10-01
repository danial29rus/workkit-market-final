"""gift-card denominations, stock and service commission"""
from alembic import op
import sqlalchemy as sa


revision = '0006_gift_card_nominals'
down_revision = '0005_gift_cards_promos_loyalty'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('product_variants') as batch:
        batch.add_column(sa.Column('face_value', sa.Numeric(12, 2), nullable=True))
        batch.add_column(sa.Column('commission_percent', sa.Numeric(5, 2), nullable=True))
        batch.add_column(sa.Column('stock_quantity', sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table('product_variants') as batch:
        batch.drop_column('stock_quantity')
        batch.drop_column('commission_percent')
        batch.drop_column('face_value')
