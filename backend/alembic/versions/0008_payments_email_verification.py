"""payment url on orders, e-mail verification for customers"""
from alembic import op
import sqlalchemy as sa


revision = '0008_payments_email_verification'
down_revision = '0007_gift_card_exchange_rate'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('orders') as batch:
        batch.add_column(sa.Column('payment_url', sa.String(500), nullable=True))
    with op.batch_alter_table('customers') as batch:
        # Accounts that existed before verification was introduced stay usable.
        batch.add_column(sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.true()))
        batch.add_column(sa.Column('verify_code_hash', sa.String(128), nullable=True))
        batch.add_column(sa.Column('verify_expires_at', sa.DateTime(), nullable=True))
        batch.add_column(sa.Column('verify_sent_at', sa.DateTime(), nullable=True))
        batch.add_column(sa.Column('verify_attempts', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('customers') as batch:
        for column in ('verify_attempts', 'verify_sent_at', 'verify_expires_at', 'verify_code_hash', 'email_verified'):
            batch.drop_column(column)
    with op.batch_alter_table('orders') as batch:
        batch.drop_column('payment_url')
