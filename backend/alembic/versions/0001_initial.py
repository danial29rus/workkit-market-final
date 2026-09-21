"""initial schema"""
from alembic import op
import sqlalchemy as sa
revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(80), nullable=False, unique=True),
        sa.Column('name', sa.String(120), nullable=False),
    )
    op.create_table('products',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(120), nullable=False, unique=True),
        sa.Column('title', sa.String(240), nullable=False),
        sa.Column('short_description', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('image_url', sa.String(500), nullable=False),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('categories.id'), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_table('product_variants',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('sku', sa.String(80), nullable=False, unique=True),
        sa.Column('price', sa.Numeric(12, 2), nullable=False),
        sa.Column('old_price', sa.Numeric(12, 2), nullable=True),
        sa.Column('delivery_type', sa.String(40), nullable=False, server_default='download'),
    )
    op.create_table('customers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(320), nullable=False, unique=True),
        sa.Column('external_id', sa.String(200), nullable=True),
        sa.Column('external_source', sa.String(80), nullable=True),
    )
    op.create_table('orders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('public_id', sa.String(40), nullable=False, unique=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('status', sa.String(40), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='RUB'),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('payment_provider', sa.String(80), nullable=True),
        sa.Column('payment_id', sa.String(200), nullable=True),
        sa.Column('delivery_token', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_table('order_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('variant_id', sa.Integer(), sa.ForeignKey('product_variants.id'), nullable=False),
        sa.Column('title_snapshot', sa.String(240), nullable=False),
        sa.Column('variant_snapshot', sa.String(120), nullable=False),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
    )

def downgrade():
    op.drop_table('order_items')
    op.drop_table('orders')
    op.drop_table('customers')
    op.drop_table('product_variants')
    op.drop_table('products')
    op.drop_table('categories')
