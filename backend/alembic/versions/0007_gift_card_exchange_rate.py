"""gift card face currency and fixed conversion rate"""
from alembic import op
import sqlalchemy as sa


revision = '0007_gift_card_exchange_rate'
down_revision = '0006_gift_card_nominals'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('product_variants') as batch:
        batch.add_column(sa.Column('face_currency', sa.String(3), nullable=False, server_default='RUB'))
        batch.add_column(sa.Column('exchange_rate', sa.Numeric(12, 4), nullable=True))


def downgrade():
    with op.batch_alter_table('product_variants') as batch:
        batch.drop_column('exchange_rate')
        batch.drop_column('face_currency')
