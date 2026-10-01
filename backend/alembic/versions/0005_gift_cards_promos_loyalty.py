"""gift cards, promo codes and loyalty balance"""
from alembic import op
import sqlalchemy as sa


revision = '0005_gift_cards_promos_loyalty'
down_revision = '0004_content_refresh'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('customers') as batch:
        batch.add_column(sa.Column('bonus_balance', sa.Numeric(12, 2), nullable=False, server_default='0.00'))
    with op.batch_alter_table('orders') as batch:
        batch.add_column(sa.Column('subtotal_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'))
        batch.add_column(sa.Column('promo_code', sa.String(40), nullable=True))
        batch.add_column(sa.Column('promo_discount_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'))
        batch.add_column(sa.Column('bonus_spent_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'))
        batch.add_column(sa.Column('bonus_earned_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'))
    op.execute('UPDATE orders SET subtotal_amount = total_amount WHERE subtotal_amount = 0')
    op.create_table(
        'promo_codes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(40), nullable=False, unique=True),
        sa.Column('discount_type', sa.String(12), nullable=False, server_default='percent'),
        sa.Column('discount_value', sa.Numeric(12, 2), nullable=False),
        sa.Column('min_order_amount', sa.Numeric(12, 2), nullable=False, server_default='0.00'),
        sa.Column('max_discount_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('usage_limit', sa.Integer(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('starts_at', sa.DateTime(), nullable=True),
        sa.Column('ends_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_promo_codes_code', 'promo_codes', ['code'])
    op.create_table(
        'bonus_transactions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('kind', sa.String(32), nullable=False),
        sa.Column('description', sa.String(240), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_bonus_transactions_customer_id', 'bonus_transactions', ['customer_id'])


def downgrade():
    op.drop_index('ix_bonus_transactions_customer_id', table_name='bonus_transactions')
    op.drop_table('bonus_transactions')
    op.drop_index('ix_promo_codes_code', table_name='promo_codes')
    op.drop_table('promo_codes')
    with op.batch_alter_table('orders') as batch:
        batch.drop_column('bonus_earned_amount')
        batch.drop_column('bonus_spent_amount')
        batch.drop_column('promo_discount_amount')
        batch.drop_column('promo_code')
        batch.drop_column('subtotal_amount')
    with op.batch_alter_table('customers') as batch:
        batch.drop_column('bonus_balance')
