from decimal import Decimal
from sqlalchemy import select
from .db import SessionLocal
from .models import Category, Product, ProductVariant

DATA = [
    ('workflow','Рабочие процессы','notion-audit','Аудит и настройка рабочего пространства','Разберём структуру задач и подготовим понятную систему работы.','Специалист изучает текущую структуру, предлагает улучшения и настраивает базовое рабочее пространство под ваши задачи. Результат: настроенная структура и краткая инструкция.','https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=80', [('Базовый','SRV-NOTION-B',Decimal('649.90'),None),('Расширенный','SRV-NOTION-X',Decimal('1490.00'),None)]),
    ('analytics','Аналитика','finance-setup','Настройка финансовой модели','Подготовим таблицу доходов, расходов и ключевых показателей.','Настраиваем финансовую модель под вводные клиента: категории доходов и расходов, cash flow, основные показатели и понятный итоговый дашборд.','https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80', [('Старт','SRV-FIN-S',Decimal('1490.50'),Decimal('1890.00')),('Бизнес','SRV-FIN-B',Decimal('2390.90'),None),('Расширенный','SRV-FIN-X',Decimal('3990.00'),None)]),
    ('content','Контент','content-plan','Подготовка контент-плана','Соберём темы, рубрики и календарь публикаций.','На основе краткого брифа подготавливаем контент-план с рубриками, темами и логикой публикаций. Итог передаётся в удобной таблице.','https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=80', [('На месяц','SRV-CNT-M1',Decimal('1449.00'),None),('На 3 месяца','SRV-CNT-M3',Decimal('2890.40'),None)]),
    ('design','Дизайн','interface-pack','Оформление набора экранов','Аккуратно оформим ключевые экраны или блоки интерфейса.','Услуга включает визуальную сборку набора интерфейсных блоков по вашему контенту и референсам. Количество экранов зависит от выбранного пакета.','https://images.unsplash.com/photo-1559028012-481c04fa702d?auto=format&fit=crop&w=1200&q=80', [('3 экрана','SRV-UI-3',Decimal('2990.00'),None),('6 экранов','SRV-UI-6',Decimal('4799.70'),None)]),
    ('business','Бизнес','business-structure','Структура бизнес-проекта','Соберём материалы в понятную структуру для дальнейшей работы.','Помогаем структурировать исходные материалы проекта: цели, аудиторию, предложение, этапы запуска и базовую экономику. Результат оформляется в одном рабочем документе.','https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80', [('Базовый','SRV-BIZ-B',Decimal('3190.00'),None)]),
    ('analytics','Аналитика','budget-setup','Настройка личного бюджета','Настроим категории, цели и сводный экран бюджета.','Персональная настройка таблицы бюджета: категории расходов, накопления, цели и сводные показатели. Передаём готовую таблицу и инструкцию.','https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80', [('Стандарт','SRV-BUD-S',Decimal('1390.00'),None)]),
    ('design','Дизайн','presentation-design','Оформление презентации','Соберём аккуратную презентацию из ваших материалов.','Вы передаёте текст и материалы, мы приводим их к единой визуальной системе и оформляем готовую презентацию.','https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=80', [('До 8 слайдов','SRV-PRES-8',Decimal('3790.00'),None),('До 15 слайдов','SRV-PRES-15',Decimal('5790.80'),None)]),
    ('business','Бизнес','launch-pack','Пакет подготовки к запуску','Структура, таблица и визуальные материалы в одном заказе.','Комплексная услуга для небольшого запуска: структура проекта, рабочая таблица, базовый контент-план и оформление ключевого материала.','https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', [('Комплекс','SRV-LAUNCH',Decimal('6874.35'),None)]),
]


def run():
    """Initial content bootstrap. Existing/admin-edited rows are never overwritten."""
    db = SessionLocal()
    created_products = 0
    created_variants = 0
    try:
        categories = {c.slug: c for c in db.scalars(select(Category)).all()}
        products = {p.slug: p for p in db.scalars(select(Product)).all()}
        variants = {v.sku: v for v in db.scalars(select(ProductVariant)).all()}

        for cslug, cname, slug, title, short, desc, img, item_variants in DATA:
            category = categories.get(cslug)
            if category is None:
                category = Category(slug=cslug, name=cname)
                db.add(category)
                db.flush()
                categories[cslug] = category

            product = products.get(slug)
            if product is None:
                product = Product(
                    slug=slug,
                    title=title,
                    short_description=short,
                    description=desc,
                    image_url=img,
                    category_id=category.id,
                    active=True,
                )
                db.add(product)
                db.flush()
                products[slug] = product
                created_products += 1

            for name, sku, price, old_price in item_variants:
                if sku in variants:
                    continue
                variant = ProductVariant(
                    product_id=product.id,
                    name=name,
                    sku=sku,
                    price=price,
                    old_price=old_price,
                    delivery_type='service',
                )
                db.add(variant)
                db.flush()
                variants[sku] = variant
                created_variants += 1

        db.commit()
        print(f'Seed ready: +{created_products} products, +{created_variants} variants')
    finally:
        db.close()


if __name__ == '__main__':
    run()
