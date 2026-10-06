from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Category(Base):
    __tablename__ = 'categories'
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    products: Mapped[list['Product']] = relationship(back_populates='category')


class Product(Base):
    __tablename__ = 'products'
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(240))
    short_description: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str] = mapped_column(String(500))
    category_id: Mapped[int] = mapped_column(ForeignKey('categories.id'))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped[Category] = relationship(back_populates='products')
    variants: Mapped[list['ProductVariant']] = relationship(
        back_populates='product', cascade='all, delete-orphan',
        order_by='(ProductVariant.face_value, ProductVariant.price, ProductVariant.id)',
    )


class ProductVariant(Base):
    __tablename__ = 'product_variants'
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column(String(120))
    sku: Mapped[str] = mapped_column(String(80), unique=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    old_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    delivery_type: Mapped[str] = mapped_column(String(40), default='service')
    face_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    commission_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    stock_quantity: Mapped[int | None] = mapped_column(nullable=True)
    face_currency: Mapped[str] = mapped_column(String(3), default='RUB')
    exchange_rate: Mapped[Decimal | None] = mapped_column(Numeric(12, 4), nullable=True)
    # resell.codes position this nominal is bought from (category_id + card_id). Empty = manual delivery.
    supplier_category_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    supplier_card_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    product: Mapped[Product] = relationship(back_populates='variants')


class Customer(Base):
    __tablename__ = 'customers'
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    external_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    external_source: Mapped[str | None] = mapped_column(String(80), nullable=True)
    bonus_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal('0.00'))
    email_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    verify_code_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    verify_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    verify_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    verify_attempts: Mapped[int] = mapped_column(default=0)
    orders: Mapped[list['Order']] = relationship(back_populates='customer')
    bonus_transactions: Mapped[list['BonusTransaction']] = relationship(back_populates='customer')


class Order(Base):
    __tablename__ = 'orders'
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey('customers.id'))
    status: Mapped[str] = mapped_column(String(40), default='awaiting_payment', index=True)
    currency: Mapped[str] = mapped_column(String(3), default='RUB')
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal('0.00'))
    promo_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    promo_discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal('0.00'))
    bonus_spent_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal('0.00'))
    bonus_earned_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal('0.00'))
    payment_provider: Mapped[str | None] = mapped_column(String(80), nullable=True)
    payment_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    payment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    delivery_token: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    customer: Mapped[Customer] = relationship(back_populates='orders')
    items: Mapped[list['OrderItem']] = relationship(back_populates='order', cascade='all, delete-orphan')
    bonus_transactions: Mapped[list['BonusTransaction']] = relationship(back_populates='order')


class OrderItem(Base):
    __tablename__ = 'order_items'
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id', ondelete='CASCADE'))
    variant_id: Mapped[int] = mapped_column(ForeignKey('product_variants.id'))
    title_snapshot: Mapped[str] = mapped_column(String(240))
    variant_snapshot: Mapped[str] = mapped_column(String(120))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    quantity: Mapped[int] = mapped_column(default=1)
    # Gift-card delivery: pending → purchasing → processing → delivered | failed | manual
    fulfil_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    supplier: Mapped[str | None] = mapped_column(String(40), nullable=True)  # which supplier holds supplier_order_number
    supplier_order_number: Mapped[int | None] = mapped_column(nullable=True)
    supplier_error: Mapped[str | None] = mapped_column(String(300), nullable=True)
    codes: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list of delivered codes
    fulfil_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    order: Mapped[Order] = relationship(back_populates='items')
    variant: Mapped[ProductVariant] = relationship()


class PromoCode(Base):
    __tablename__ = 'promo_codes'
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    discount_type: Mapped[str] = mapped_column(String(12), default='percent')
    discount_value: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    min_order_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal('0.00'))
    max_discount_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    usage_limit: Mapped[int | None] = mapped_column(nullable=True)
    usage_count: Mapped[int] = mapped_column(default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class BonusTransaction(Base):
    __tablename__ = 'bonus_transactions'
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey('customers.id', ondelete='CASCADE'), index=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey('orders.id', ondelete='SET NULL'), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    kind: Mapped[str] = mapped_column(String(32))
    description: Mapped[str] = mapped_column(String(240))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    customer: Mapped[Customer] = relationship(back_populates='bonus_transactions')
    order: Mapped[Order | None] = relationship(back_populates='bonus_transactions')


class SiteConfig(Base):
    __tablename__ = 'site_config'
    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    brand_name: Mapped[str] = mapped_column(String(120), default='WorkKit Studio')
    brand_short: Mapped[str] = mapped_column(String(60), default='WorkKit')
    brand_mark: Mapped[str] = mapped_column(String(8), default='W')
    site_mode: Mapped[str] = mapped_column(String(40), default='services')
    accent_color: Mapped[str] = mapped_column(String(20), default='#6366f1')
    tagline: Mapped[str] = mapped_column(String(240), default='Цифровые услуги для бизнеса и частных задач')
    hero_eyebrow: Mapped[str] = mapped_column(String(160), default='ЗАДАЧА → ПОНЯТНЫЙ РЕЗУЛЬТАТ')
    hero_title: Mapped[str] = mapped_column(String(300), default='Цифровые услуги без лишней бюрократии')
    hero_text: Mapped[str] = mapped_column(Text, default='Выберите готовый пакет, создайте заявку и следите за статусом в личном кабинете.')
    hero_cta: Mapped[str] = mapped_column(String(100), default='Посмотреть услуги')
    catalog_label: Mapped[str] = mapped_column(String(80), default='Услуги')
    item_label: Mapped[str] = mapped_column(String(80), default='услуга')
    order_cta: Mapped[str] = mapped_column(String(100), default='Оформить заявку')
    promo_title: Mapped[str] = mapped_column(String(180), default='Нужна нестандартная задача?')
    promo_text: Mapped[str] = mapped_column(String(500), default='Выберите ближайший пакет, а детали уточним после оформления.')
    support_email: Mapped[str] = mapped_column(String(320), default='support@workkit.test')
    support_phone: Mapped[str] = mapped_column(String(60), default='')
    work_hours: Mapped[str] = mapped_column(String(120), default='Ежедневно 09:00–21:00')
    seller_name: Mapped[str] = mapped_column(String(240), default='')
    seller_inn: Mapped[str] = mapped_column(String(40), default='')
    seller_ogrn: Mapped[str] = mapped_column(String(40), default='')
    seller_address: Mapped[str] = mapped_column(String(500), default='')
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
