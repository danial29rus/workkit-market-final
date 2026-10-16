"""support tickets and message history"""
from alembic import op
import sqlalchemy as sa


revision = '0010_support_tickets'
down_revision = '0009_gift_card_fulfilment'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'support_tickets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('public_id', sa.String(40), nullable=False),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id'), nullable=False),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id', ondelete='SET NULL'), nullable=True),
        sa.Column('subject', sa.String(180), nullable=False),
        sa.Column('category', sa.String(40), nullable=False, server_default='other'),
        sa.Column('status', sa.String(40), nullable=False, server_default='open'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_message_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('public_id'),
    )
    op.create_index('ix_support_tickets_customer_id', 'support_tickets', ['customer_id'])
    op.create_index('ix_support_tickets_order_id', 'support_tickets', ['order_id'])
    op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])
    op.create_index('ix_support_tickets_last_message_at', 'support_tickets', ['last_message_at'])
    op.create_table(
        'support_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('ticket_id', sa.Integer(), sa.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender', sa.String(20), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_support_messages_ticket_id', 'support_messages', ['ticket_id'])


def downgrade():
    op.drop_index('ix_support_messages_ticket_id', table_name='support_messages')
    op.drop_table('support_messages')
    for index in ('ix_support_tickets_last_message_at', 'ix_support_tickets_status', 'ix_support_tickets_order_id', 'ix_support_tickets_customer_id'):
        op.drop_index(index, table_name='support_tickets')
    op.drop_table('support_tickets')
