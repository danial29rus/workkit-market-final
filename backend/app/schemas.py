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


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: CustomerOut


class OrderCreate(BaseModel):
    variant_id: int
    quantity: int = Field(default=1, ge=1, le=20)


class OrderItemOut(BaseModel):
    title: str
    variant: str
    unit_price: Decimal
    quantity: int


class OrderOut(BaseModel):
    public_id: str
    status: str
    currency: str
    total_amount: Decimal
    delivery_token: str | None = None
    created_at: datetime
    customer_email: EmailStr
    customer_name: str | None = None
    items: list[OrderItemOut]


class OrderStatusUpdate(BaseModel):
    status: str


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


class VariantUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    old_price: Decimal | None = None
    delivery_type: str | None = None


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
