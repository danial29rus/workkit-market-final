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
    variants: Mapped[list['ProductVariant']] = relationship(back_populates='product', cascade='all, delete-orphan')


class ProductVariant(Base):
    __tablename__ = 'product_variants'
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column(String(120))
    sku: Mapped[str] = mapped_column(String(80), unique=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    old_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    delivery_type: Mapped[str] = mapped_column(String(40), default='service')
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
    orders: Mapped[list['Order']] = relationship(back_populates='customer')


class Order(Base):
    __tablename__ = 'orders'
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey('customers.id'))
    status: Mapped[str] = mapped_column(String(40), default='awaiting_payment', index=True)
    currency: Mapped[str] = mapped_column(String(3), default='RUB')
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    payment_provider: Mapped[str | None] = mapped_column(String(80), nullable=True)
    payment_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    delivery_token: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    customer: Mapped[Customer] = relationship(back_populates='orders')
    items: Mapped[list['OrderItem']] = relationship(back_populates='order', cascade='all, delete-orphan')


class OrderItem(Base):
    __tablename__ = 'order_items'
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id', ondelete='CASCADE'))
    variant_id: Mapped[int] = mapped_column(ForeignKey('product_variants.id'))
    title_snapshot: Mapped[str] = mapped_column(String(240))
    variant_snapshot: Mapped[str] = mapped_column(String(120))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    quantity: Mapped[int] = mapped_column(default=1)
    order: Mapped[Order] = relationship(back_populates='items')


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
    support_email: Mapped[str] = mapped_column(String(320), default='hello@your-domain.ru')
    support_phone: Mapped[str] = mapped_column(String(60), default='+7 (900) 000-00-00')
    work_hours: Mapped[str] = mapped_column(String(120), default='Ежедневно 09:00–21:00')
    seller_name: Mapped[str] = mapped_column(String(240), default='[укажите реальное наименование]')
    seller_inn: Mapped[str] = mapped_column(String(40), default='[укажите]')
    seller_ogrn: Mapped[str] = mapped_column(String(40), default='[укажите]')
    seller_address: Mapped[str] = mapped_column(String(500), default='[укажите реальный адрес]')
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
