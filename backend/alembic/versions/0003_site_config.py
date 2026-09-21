"""site config for editable storefront"""
from alembic import op
import sqlalchemy as sa

revision = '0003_site_config'
down_revision = '0002_accounts_and_service_flow'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'site_config',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('brand_name', sa.String(120), nullable=False, server_default='WorkKit Studio'),
        sa.Column('brand_short', sa.String(60), nullable=False, server_default='WorkKit'),
        sa.Column('brand_mark', sa.String(8), nullable=False, server_default='W'),
        sa.Column('site_mode', sa.String(40), nullable=False, server_default='services'),
        sa.Column('accent_color', sa.String(20), nullable=False, server_default='#6366f1'),
        sa.Column('tagline', sa.String(240), nullable=False, server_default='Цифровые услуги для бизнеса и частных задач'),
        sa.Column('hero_eyebrow', sa.String(160), nullable=False, server_default='ЗАДАЧА → ПОНЯТНЫЙ РЕЗУЛЬТАТ'),
        sa.Column('hero_title', sa.String(300), nullable=False, server_default='Цифровые услуги без лишней бюрократии'),
        sa.Column('hero_text', sa.Text(), nullable=False, server_default='Выберите готовый пакет, создайте заявку и следите за статусом в личном кабинете.'),
        sa.Column('hero_cta', sa.String(100), nullable=False, server_default='Посмотреть услуги'),
        sa.Column('catalog_label', sa.String(80), nullable=False, server_default='Услуги'),
        sa.Column('item_label', sa.String(80), nullable=False, server_default='услуга'),
        sa.Column('order_cta', sa.String(100), nullable=False, server_default='Оформить заявку'),
        sa.Column('promo_title', sa.String(180), nullable=False, server_default='Нужна нестандартная задача?'),
        sa.Column('promo_text', sa.String(500), nullable=False, server_default='Выберите ближайший пакет, а детали уточним после оформления.'),
        sa.Column('support_email', sa.String(320), nullable=False, server_default='hello@your-domain.ru'),
        sa.Column('support_phone', sa.String(60), nullable=False, server_default='+7 (900) 000-00-00'),
        sa.Column('work_hours', sa.String(120), nullable=False, server_default='Ежедневно 09:00–21:00'),
        sa.Column('seller_name', sa.String(240), nullable=False, server_default='[укажите реальное наименование]'),
        sa.Column('seller_inn', sa.String(40), nullable=False, server_default='[укажите]'),
        sa.Column('seller_ogrn', sa.String(40), nullable=False, server_default='[укажите]'),
        sa.Column('seller_address', sa.String(500), nullable=False, server_default='[укажите реальный адрес]'),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.execute("INSERT INTO site_config (id) VALUES (1)")


def downgrade():
    op.drop_table('site_config')
