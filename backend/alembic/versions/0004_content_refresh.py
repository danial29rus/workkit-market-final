"""refresh product descriptions and site_config defaults"""
from alembic import op
import sqlalchemy as sa

revision = '0004_content_refresh'
down_revision = '0003_site_config'
branch_labels = None
depends_on = None

PRODUCT_DESCRIPTIONS = {
    'notion-audit': """Приводим ваше рабочее пространство (Notion, Trello или похожий инструмент) в порядок: убираем хаос из разрозненных списков и делаем понятную систему, в которой видно, что делать сегодня и что в работе.
Разбираем текущую структуру и находим слабые места
Проектируем логичную структуру разделов и статусов задач
Настраиваем шаблоны карточек под ваш тип задач
Готовим короткую инструкцию, как пользоваться системой дальше
Срок выполнения: 2-4 рабочих дня в зависимости от объёма.""",
    'finance-setup': """Собираем рабочую финансовую модель в таблице: понятные доходы, расходы и ключевые показатели без лишних листов и формул, в которых сложно разобраться.
Разбираем текущие источники доходов и статьи расходов
Строим таблицу с помесячной разбивкой и итогами
Добавляем ключевые показатели: маржа, точка безубыточности, остаток
Настраиваем автоматический пересчёт при вводе новых данных
Срок выполнения: 2-3 рабочих дня после получения исходных данных.""",
    'content-plan': """Готовим контент-план для соцсетей или блога: темы, рубрики и календарь публикаций на выбранный период, чтобы не изобретать темы на ходу.
Изучаем нишу, аудиторию и текущие публикации
Формируем набор рубрик и распределяем темы по ним
Собираем календарь с датами и форматом публикаций
Передаём план в удобной таблице с возможностью редактирования
Срок выполнения: 3-4 рабочих дня в зависимости от периода охвата.""",
    'interface-pack': """Оформляем ключевые экраны интерфейса или отдельные блоки в едином аккуратном стиле — на основе ваших материалов или референсов.
Разбираем референсы и формируем визуальный стиль
Прорабатываем сетку, отступы и типографику экранов
Оформляем экраны в выбранном количестве (см. варианты)
Передаём исходники в удобном формате для разработки
Срок выполнения: 3-5 рабочих дней в зависимости от количества экранов.""",
    'business-structure': """Собираем материалы вашего проекта в понятную структуру: разделы, документы и связи между ними, чтобы дальше можно было легко работать и дополнять.
Разбираем исходные материалы и определяем логику структуры
Формируем разделы: цели, процессы, ресурсы, команда
Раскладываем существующие материалы по разделам
Готовим шаблон для дальнейшего самостоятельного заполнения
Срок выполнения: 3-4 рабочих дня в зависимости от объёма материалов.""",
    'budget-setup': """Настраиваем личный бюджет: категории расходов, финансовые цели и сводный экран, где сразу видно, сколько потрачено и сколько осталось.
Разбираем ваши источники доходов и типичные траты
Настраиваем категории и подкатегории расходов
Добавляем финансовые цели с отслеживанием прогресса
Собираем сводный экран с балансом по месяцам
Срок выполнения: 1-2 рабочих дня.""",
    'presentation-design': """Собираем аккуратную презентацию из ваших материалов: текстов, данных и изображений — в едином визуальном стиле, готовую к показу.
Разбираем исходные материалы и логику повествования
Подбираем визуальный стиль под тематику презентации
Оформляем слайды: структура, графика, акценты
Передаём файл в редактируемом формате
Срок выполнения: 2-4 рабочих дня в зависимости от количества слайдов.""",
    'launch-pack': """Комплексный пакет для запуска проекта: структура, финансовая таблица и визуальные материалы — всё в одном заказе, чтобы не собирать по частям.
Структурируем материалы проекта по разделам
Готовим базовую финансовую таблицу с ключевыми показателями
Оформляем набор визуальных материалов для запуска
Передаём весь комплект в едином архиве с инструкцией
Срок выполнения: 5-7 рабочих дней.""",
}

NEW_SITE_DEFAULTS = {
    'support_email': 'support@workkit.test',
    'support_phone': '',
    'seller_name': '',
    'seller_inn': '',
    'seller_ogrn': '',
    'seller_address': '',
}

OLD_SITE_PLACEHOLDERS = {
    'support_email': 'hello@your-domain.ru',
    'support_phone': '+7 (900) 000-00-00',
    'seller_name': '[укажите реальное наименование]',
    'seller_inn': '[укажите]',
    'seller_ogrn': '[укажите]',
    'seller_address': '[укажите реальный адрес]',
}


def upgrade():
    conn = op.get_bind()
    products = sa.table(
        'products',
        sa.column('slug', sa.String),
        sa.column('description', sa.Text),
    )
    for slug, description in PRODUCT_DESCRIPTIONS.items():
        conn.execute(
            products.update().where(products.c.slug == slug).values(description=description)
        )

    site_config = sa.table(
        'site_config',
        sa.column('id', sa.Integer),
        sa.column('support_email', sa.String),
        sa.column('support_phone', sa.String),
        sa.column('seller_name', sa.String),
        sa.column('seller_inn', sa.String),
        sa.column('seller_ogrn', sa.String),
        sa.column('seller_address', sa.String),
    )
    conn.execute(site_config.update().values(**NEW_SITE_DEFAULTS))

    with op.batch_alter_table('site_config') as batch:
        batch.alter_column('support_email', server_default=NEW_SITE_DEFAULTS['support_email'])
        batch.alter_column('support_phone', server_default=NEW_SITE_DEFAULTS['support_phone'])
        batch.alter_column('seller_name', server_default=NEW_SITE_DEFAULTS['seller_name'])
        batch.alter_column('seller_inn', server_default=NEW_SITE_DEFAULTS['seller_inn'])
        batch.alter_column('seller_ogrn', server_default=NEW_SITE_DEFAULTS['seller_ogrn'])
        batch.alter_column('seller_address', server_default=NEW_SITE_DEFAULTS['seller_address'])


def downgrade():
    with op.batch_alter_table('site_config') as batch:
        batch.alter_column('support_email', server_default=OLD_SITE_PLACEHOLDERS['support_email'])
        batch.alter_column('support_phone', server_default=OLD_SITE_PLACEHOLDERS['support_phone'])
        batch.alter_column('seller_name', server_default=OLD_SITE_PLACEHOLDERS['seller_name'])
        batch.alter_column('seller_inn', server_default=OLD_SITE_PLACEHOLDERS['seller_inn'])
        batch.alter_column('seller_ogrn', server_default=OLD_SITE_PLACEHOLDERS['seller_ogrn'])
        batch.alter_column('seller_address', server_default=OLD_SITE_PLACEHOLDERS['seller_address'])

    conn = op.get_bind()
    site_config = sa.table(
        'site_config',
        sa.column('id', sa.Integer),
        sa.column('support_email', sa.String),
        sa.column('support_phone', sa.String),
        sa.column('seller_name', sa.String),
        sa.column('seller_inn', sa.String),
        sa.column('seller_ogrn', sa.String),
        sa.column('seller_address', sa.String),
    )
    conn.execute(site_config.update().values(**OLD_SITE_PLACEHOLDERS))
