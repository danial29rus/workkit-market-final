from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class VariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    sku: str
    price: Decimal
    old_price: Decimal | None = None
    delivery_type: str
    face_value: Decimal | None = None
    commission_percent: Decimal | None = None
    stock_quantity: int | None = None
    face_currency: str = 'RUB'
    exchange_rate: Decimal | None = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    title: str
    short_description: str
    description: str
    image_url: str
    active: bool
    category_name: str
    category_slug: str
    variants: list[VariantOut]


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=40)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CustomerOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None
    created_at: datetime
    bonus_balance: Decimal


class EmailIn(BaseModel):
    email: EmailStr


class VerifyEmailIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=40)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class BonusTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    amount: Decimal
    kind: str
    description: str
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: CustomerOut


class OrderCreate(BaseModel):
    variant_id: int
    quantity: int = Field(default=1, ge=1, le=20)
    promo_code: str | None = Field(default=None, max_length=40)
    bonus_amount: Decimal = Field(default=Decimal('0.00'), ge=0)


class OrderQuoteIn(OrderCreate):
    pass


class GiftCartItemIn(BaseModel):
    variant_id: int
    quantity: int = Field(default=1, ge=1, le=20)


class GiftCartCreate(BaseModel):
    items: list[GiftCartItemIn] = Field(min_length=1, max_length=20)
    promo_code: str | None = Field(default=None, max_length=40)
    bonus_amount: Decimal = Field(default=Decimal('0.00'), ge=0)


class GiftCartQuoteIn(GiftCartCreate):
    pass


class OrderQuoteOut(BaseModel):
    subtotal_amount: Decimal
    promo_code: str | None = None
    promo_discount_amount: Decimal
    bonus_spent_amount: Decimal
    total_amount: Decimal
    bonus_earned_amount: Decimal


class OrderItemOut(BaseModel):
    title: str
    variant: str
    unit_price: Decimal
    quantity: int
    delivery_type: str = 'service'
    product_slug: str | None = None


class OrderOut(BaseModel):
    public_id: str
    status: str
    currency: str
    total_amount: Decimal
    subtotal_amount: Decimal
    promo_code: str | None = None
    promo_discount_amount: Decimal
    bonus_spent_amount: Decimal
    bonus_earned_amount: Decimal
    delivery_token: str | None = None
    created_at: datetime
    customer_email: EmailStr
    customer_name: str | None = None
    items: list[OrderItemOut]


class OrderStatusUpdate(BaseModel):
    status: str


class PromoCodeCreate(BaseModel):
    code: str = Field(min_length=3, max_length=40)
    discount_type: str = Field(pattern='^(percent|fixed)$')
    discount_value: Decimal = Field(gt=0)
    min_order_amount: Decimal = Field(default=Decimal('0.00'), ge=0)
    max_discount_amount: Decimal | None = Field(default=None, gt=0)
    usage_limit: int | None = Field(default=None, gt=0)
    active: bool = True


class PromoCodeUpdate(BaseModel):
    active: bool | None = None
    usage_limit: int | None = Field(default=None, gt=0)


class PromoCodeOut(PromoCodeCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    usage_count: int


class ProductCreate(BaseModel):
    slug: str
    title: str
    short_description: str
    description: str
    image_url: str
    category_slug: str
    category_name: str
    active: bool = True


class ProductUpdate(BaseModel):
    title: str | None = None
    short_description: str | None = None
    description: str | None = None
    image_url: str | None = None
    category_slug: str | None = None
    category_name: str | None = None
    active: bool | None = None


class VariantCreate(BaseModel):
    name: str
    sku: str
    price: Decimal = Field(gt=0)
    old_price: Decimal | None = None
    delivery_type: str = 'service'
    face_value: Decimal | None = Field(default=None, gt=0)
    commission_percent: Decimal | None = Field(default=None, ge=0, le=100)
    stock_quantity: int | None = Field(default=None, ge=0)
    face_currency: str = Field(default='RUB', min_length=3, max_length=3)
    exchange_rate: Decimal | None = Field(default=None, gt=0)


class VariantUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    old_price: Decimal | None = None
    delivery_type: str | None = None
    face_value: Decimal | None = Field(default=None, gt=0)
    commission_percent: Decimal | None = Field(default=None, ge=0, le=100)
    stock_quantity: int | None = Field(default=None, ge=0)
    face_currency: str | None = Field(default=None, min_length=3, max_length=3)
    exchange_rate: Decimal | None = Field(default=None, gt=0)


class SiteConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    brand_name: str
    brand_short: str
    brand_mark: str
    site_mode: str
    accent_color: str
    tagline: str
    hero_eyebrow: str
    hero_title: str
    hero_text: str
    hero_cta: str
    catalog_label: str
    item_label: str
    order_cta: str
    promo_title: str
    promo_text: str
    support_email: str
    support_phone: str
    work_hours: str
    seller_name: str
    seller_inn: str
    seller_ogrn: str
    seller_address: str


class SiteConfigUpdate(SiteConfigOut):
    pass
