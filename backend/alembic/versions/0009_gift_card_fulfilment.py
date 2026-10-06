"""supplier mapping for gift-card nominals and per-item code delivery"""
from alembic import op
import sqlalchemy as sa


revision = '0009_gift_card_fulfilment'
down_revision = '0008_payments_email_verification'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('product_variants') as batch:
        batch.add_column(sa.Column('supplier_category_id', sa.String(120), nullable=True))
        batch.add_column(sa.Column('supplier_card_id', sa.String(120), nullable=True))
    with op.batch_alter_table('order_items') as batch:
        batch.add_column(sa.Column('fulfil_status', sa.String(20), nullable=True))
        batch.add_column(sa.Column('supplier', sa.String(40), nullable=True))
        batch.add_column(sa.Column('supplier_order_number', sa.Integer(), nullable=True))
        batch.add_column(sa.Column('supplier_error', sa.String(300), nullable=True))
        batch.add_column(sa.Column('codes', sa.Text(), nullable=True))
        batch.add_column(sa.Column('fulfil_updated_at', sa.DateTime(), nullable=True))
    # Gift cards are sold without a local stock limit: availability is the suppliers' job.
    op.execute("UPDATE product_variants SET stock_quantity = NULL WHERE delivery_type = 'gift_card'")
    # Gift cards paid before automatic delivery existed: hand them to the admin instead of a fake code.
    op.execute("""
        UPDATE order_items SET fulfil_status = 'manual',
               supplier_error = 'Оплачен до подключения автовыдачи — выдайте код вручную'
        WHERE fulfil_status IS NULL
          AND order_id IN (SELECT id FROM orders WHERE status IN ('paid', 'in_progress'))
          AND variant_id IN (SELECT id FROM product_variants WHERE delivery_type = 'gift_card')
    """)
    op.execute("""
        UPDATE orders SET delivery_token = NULL
        WHERE NOT EXISTS (
            SELECT 1 FROM order_items oi JOIN product_variants v ON v.id = oi.variant_id
            WHERE oi.order_id = orders.id AND v.delivery_type <> 'gift_card'
        )
    """)


def downgrade():
    with op.batch_alter_table('order_items') as batch:
        for column in ('fulfil_updated_at', 'codes', 'supplier_error', 'supplier_order_number', 'supplier', 'fulfil_status'):
            batch.drop_column(column)
    with op.batch_alter_table('product_variants') as batch:
        batch.drop_column('supplier_card_id')
        batch.drop_column('supplier_category_id')
