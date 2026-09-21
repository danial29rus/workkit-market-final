from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from ..config import settings
from ..db import get_db
from ..dao.orders import OrderDAO
from ..dao.products import ProductDAO
from ..models import Category, Product, ProductVariant, SiteConfig
from ..schemas import (
    OrderOut, OrderStatusUpdate, ProductCreate, ProductOut, ProductUpdate,
    SiteConfigOut, SiteConfigUpdate, VariantCreate, VariantUpdate,
)
from ..serializers import order_to_dict, product_to_dict
from ..services import OrderService
from .site import get_or_create_config

router = APIRouter(prefix='/admin', tags=['admin'])


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
    }


@router.get('/orders', dependencies=[Depends(require_admin)], response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return [order_to_dict(o) for o in OrderDAO.list(db)]


@router.patch('/orders/{public_id}', dependencies=[Depends(require_admin)], response_model=OrderOut)
def change_status(public_id: str, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    order = OrderDAO.by_public_id(db, public_id)
    if not order:
        raise HTTPException(404, 'order_not_found')
    try:
        OrderService.set_status(db, order, payload.status)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return order_to_dict(OrderDAO.by_public_id(db, public_id))


@router.get('/products', dependencies=[Depends(require_admin)], response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return [product_to_dict(p) for p in ProductDAO.list(db, active_only=False)]


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
    return product_to_dict(product)


@router.post('/products/{product_id}/variants', dependencies=[Depends(require_admin)])
def create_variant(product_id: int, payload: VariantCreate, db: Session = Depends(get_db)):
    if not db.get(Product, product_id):
        raise HTTPException(404, 'product_not_found')
    if db.scalar(select(ProductVariant).where(ProductVariant.sku == payload.sku)):
        raise HTTPException(409, 'sku_already_exists')
    variant = ProductVariant(product_id=product_id, **payload.model_dump())
    db.add(variant); db.commit(); db.refresh(variant)
    return {'id': variant.id}


@router.patch('/variants/{variant_id}', dependencies=[Depends(require_admin)])
def update_variant(variant_id: int, payload: VariantUpdate, db: Session = Depends(get_db)):
    variant = db.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(404, 'variant_not_found')
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, key, value)
    db.commit(); db.refresh(variant)
    return {'id': variant.id}


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
