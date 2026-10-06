from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from ..config import settings
from ..db import get_db
from ..dao.orders import OrderDAO
from ..dao.products import ProductDAO
from ..models import Category, Customer, Order, Product, ProductVariant, PromoCode, SiteConfig
from ..schemas import (
    ManualCodesIn,
    OrderOut, OrderStatusUpdate, ProductCreate, ProductOut, ProductUpdate,
    PromoCodeCreate, PromoCodeOut, PromoCodeUpdate, SiteConfigOut, SiteConfigUpdate, VariantCreate, VariantUpdate,
)
from ..serializers import order_to_dict, product_to_dict
from ..services import OrderService
from .site import get_or_create_config
from .. import fulfilment, resellcodes

router = APIRouter(prefix='/admin', tags=['admin'])


def sync_gift_card_price(variant: ProductVariant) -> None:
    """A gift-card price is its nominal converted to RUB plus the configured service fee."""
    if variant.delivery_type != 'gift_card' or variant.face_value is None or variant.commission_percent is None:
        return
    rate = Decimal(variant.exchange_rate) if variant.exchange_rate is not None else Decimal('1')
    variant.price = (
        Decimal(variant.face_value) * rate * (Decimal('1') + Decimal(variant.commission_percent) / Decimal('100'))
    ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def require_admin(x_admin_token: str = Header(default='')):
    if x_admin_token != settings.admin_token:
        raise HTTPException(401, 'invalid_admin_token')


@router.get('/summary', dependencies=[Depends(require_admin)])
def summary(db: Session = Depends(get_db)):
    orders = OrderDAO.list(db)
    products = ProductDAO.list(db, active_only=False)
    return {
        'orders_total': len(orders),
        'orders_open': sum(1 for o in orders if o.status in {'awaiting_payment', 'paid', 'in_progress'}),
        'revenue_paid': str(sum((o.total_amount for o in orders if o.status in {'paid', 'in_progress', 'completed'}), start=0)),
        'products_total': len(products),
        'products_active': sum(1 for p in products if p.active),
        **_user_stats(db),
    }


def _user_stats(db: Session) -> dict:
    registered = Customer.password_hash.is_not(None)
    week_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)
    count = lambda *where: db.scalar(select(func.count()).select_from(Customer).where(registered, *where)) or 0
    buyers = db.scalar(select(func.count(func.distinct(Order.customer_id))).where(Order.status.in_(('paid', 'in_progress', 'completed')))) or 0
    return {
        'users_total': count(),
        'users_verified': count(Customer.email_verified.is_(True)),
        'users_new_7d': count(Customer.created_at >= week_ago),
        'users_buyers': buyers,
    }


@router.get('/orders', dependencies=[Depends(require_admin)], response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return [order_to_dict(o, admin=True) for o in OrderDAO.list(db)]


@router.patch('/orders/{public_id}', dependencies=[Depends(require_admin)], response_model=OrderOut)
def change_status(public_id: str, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    order = OrderDAO.by_public_id(db, public_id)
    if not order:
        raise HTTPException(404, 'order_not_found')
    try:
        OrderService.set_status(db, order, payload.status)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return order_to_dict(OrderDAO.by_public_id(db, public_id), admin=True)


@router.get('/products', dependencies=[Depends(require_admin)], response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return [product_to_dict(p, admin=True) for p in ProductDAO.list(db, active_only=False)]


@router.post('/products', dependencies=[Depends(require_admin)])
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Product).where(Product.slug == payload.slug)):
        raise HTTPException(409, 'slug_already_exists')
    category = db.scalar(select(Category).where(Category.slug == payload.category_slug))
    if not category:
        category = Category(slug=payload.category_slug, name=payload.category_name)
        db.add(category)
        db.flush()
    product = Product(
        slug=payload.slug, title=payload.title, short_description=payload.short_description,
        description=payload.description, image_url=payload.image_url,
        category_id=category.id, active=payload.active,
    )
    db.add(product)
    db.commit()
    return {'id': product.id, 'slug': product.slug}


@router.patch('/products/{product_id}', dependencies=[Depends(require_admin)], response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = db.scalar(
        select(Product).options(selectinload(Product.variants), selectinload(Product.category)).where(Product.id == product_id)
    )
    if not product:
        raise HTTPException(404, 'product_not_found')
    data = payload.model_dump(exclude_unset=True)
    category_slug = data.pop('category_slug', None)
    category_name = data.pop('category_name', None)
    if category_slug:
        category = db.scalar(select(Category).where(Category.slug == category_slug))
        if not category:
            category = Category(slug=category_slug, name=category_name or category_slug)
            db.add(category); db.flush()
        elif category_name:
            category.name = category_name
        product.category_id = category.id
    for key, value in data.items():
        setattr(product, key, value)
    db.commit(); db.refresh(product)
    product = db.scalar(select(Product).options(selectinload(Product.variants), selectinload(Product.category)).where(Product.id == product_id))
    return product_to_dict(product, admin=True)


@router.post('/products/{product_id}/variants', dependencies=[Depends(require_admin)])
def create_variant(product_id: int, payload: VariantCreate, db: Session = Depends(get_db)):
    if not db.get(Product, product_id):
        raise HTTPException(404, 'product_not_found')
    if db.scalar(select(ProductVariant).where(ProductVariant.sku == payload.sku)):
        raise HTTPException(409, 'sku_already_exists')
    variant = ProductVariant(product_id=product_id, **payload.model_dump())
    sync_gift_card_price(variant)
    db.add(variant); db.commit(); db.refresh(variant)
    return {'id': variant.id}


@router.patch('/variants/{variant_id}', dependencies=[Depends(require_admin)])
def update_variant(variant_id: int, payload: VariantUpdate, db: Session = Depends(get_db)):
    variant = db.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(404, 'variant_not_found')
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, key, value)
    sync_gift_card_price(variant)
    db.commit(); db.refresh(variant)
    return {'id': variant.id}


@router.get('/promotions', dependencies=[Depends(require_admin)], response_model=list[PromoCodeOut])
def list_promotions(db: Session = Depends(get_db)):
    return list(db.scalars(select(PromoCode).order_by(PromoCode.id.desc())))


@router.post('/promotions', dependencies=[Depends(require_admin)], response_model=PromoCodeOut)
def create_promotion(payload: PromoCodeCreate, db: Session = Depends(get_db)):
    code = payload.code.strip().upper()
    if db.scalar(select(PromoCode).where(PromoCode.code == code)):
        raise HTTPException(409, 'promo_code_already_exists')
    promo = PromoCode(**{**payload.model_dump(), 'code': code})
    db.add(promo); db.commit(); db.refresh(promo)
    return promo


@router.patch('/promotions/{promo_id}', dependencies=[Depends(require_admin)], response_model=PromoCodeOut)
def update_promotion(promo_id: int, payload: PromoCodeUpdate, db: Session = Depends(get_db)):
    promo = db.get(PromoCode, promo_id)
    if not promo:
        raise HTTPException(404, 'promo_not_found')
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(promo, key, value)
    db.commit(); db.refresh(promo)
    return promo


@router.get('/site-config', dependencies=[Depends(require_admin)], response_model=SiteConfigOut)
def admin_site_config(db: Session = Depends(get_db)):
    return get_or_create_config(db)


@router.put('/site-config', dependencies=[Depends(require_admin)], response_model=SiteConfigOut)
def update_site_config(payload: SiteConfigUpdate, db: Session = Depends(get_db)):
    config = get_or_create_config(db)
    for key, value in payload.model_dump().items():
        setattr(config, key, value)
    db.commit(); db.refresh(config)
    return config


# --- Gift-card delivery -------------------------------------------------------

def _order_item(db: Session, public_id: str, item_id: int):
    order = OrderDAO.by_public_id(db, public_id)
    item = next((i for i in order.items if i.id == item_id), None) if order else None
    if not item:
        raise HTTPException(404, 'item_not_found')
    return order, item


@router.post('/orders/{public_id}/items/{item_id}/retry', dependencies=[Depends(require_admin)], response_model=OrderOut)
def retry_delivery(public_id: str, item_id: int, db: Session = Depends(get_db)):
    """Put a failed / manual item back into the purchase queue. Check resell.codes first for 'manual' ones."""
    order, item = _order_item(db, public_id, item_id)
    if order.status not in {'paid', 'in_progress'} or item.fulfil_status not in {'failed', 'manual'}:
        raise HTTPException(400, 'item_not_retryable')
    if not fulfilment.has_supplier(item.variant):
        raise HTTPException(400, 'variant_not_mapped')
    item.fulfil_status, item.supplier_error, item.supplier_order_number, item.supplier = 'pending', None, None, None
    db.commit()
    return order_to_dict(OrderDAO.by_public_id(db, public_id), admin=True)


@router.post('/orders/{public_id}/items/{item_id}/codes', dependencies=[Depends(require_admin)], response_model=OrderOut)
def deliver_manually(public_id: str, item_id: int, payload: ManualCodesIn, db: Session = Depends(get_db)):
    order, item = _order_item(db, public_id, item_id)
    codes = [c.strip() for c in payload.codes if c.strip()]
    if not codes:
        raise HTTPException(400, 'codes_required')
    if item.fulfil_status == 'purchasing':
        raise HTTPException(409, 'purchase_in_progress')
    fulfilment._mark_delivered(item, codes)
    db.commit()
    fulfilment._finish_order_if_ready(db, OrderDAO.by_public_id(db, public_id))
    return order_to_dict(OrderDAO.by_public_id(db, public_id), admin=True)


@router.get('/supplier/status', dependencies=[Depends(require_admin)])
def supplier_status():
    if not settings.supplier_enabled:
        return {'enabled': False}
    try:
        account = resellcodes.account()
    except (resellcodes.SupplierError, resellcodes.SupplierUnreachable) as exc:
        return {'enabled': True, 'error': str(exc)}
    return {'enabled': True, 'balance_usd': account.get('balance_usd'), 'nickname': account.get('nickname')}


@router.get('/supplier/categories', dependencies=[Depends(require_admin)])
def supplier_categories(q: str = ''):
    if not settings.supplier_enabled:
        raise HTTPException(400, 'supplier_not_configured')
    try:
        return resellcodes.categories(q)
    except (resellcodes.SupplierError, resellcodes.SupplierUnreachable) as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get('/supplier/categories/{category_id}/cards', dependencies=[Depends(require_admin)])
def supplier_cards(category_id: str):
    if not settings.supplier_enabled:
        raise HTTPException(400, 'supplier_not_configured')
    try:
        return resellcodes.cards(category_id)
    except (resellcodes.SupplierError, resellcodes.SupplierUnreachable) as exc:
        raise HTTPException(502, str(exc)) from exc
