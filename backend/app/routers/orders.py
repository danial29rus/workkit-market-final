from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..dao.orders import OrderDAO
from ..models import Customer
from ..schemas import GiftCartCreate, GiftCartQuoteIn, OrderCreate, OrderOut, OrderQuoteIn, OrderQuoteOut
from ..security import current_customer, optional_customer
from ..serializers import order_to_dict
from ..services import OrderService
from ..payment_sync import refresh_if_due

router = APIRouter(prefix='/orders', tags=['orders'])

@router.post('', response_model=OrderOut)
def create_order(payload: OrderCreate, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    try:
        order = OrderService.create(db, customer, payload.variant_id, payload.quantity, payload.promo_code, payload.bonus_amount)
    except ValueError as exc:
        raise HTTPException(404 if str(exc) == 'variant_not_found' else 400, str(exc)) from exc
    return order_to_dict(OrderDAO.by_public_id(db, order.public_id))


@router.post('/quote', response_model=OrderQuoteOut)
def quote_order(payload: OrderQuoteIn, db: Session = Depends(get_db), customer: Customer | None = Depends(optional_customer)):
    try:
        quote = OrderService.quote(db, customer, payload.variant_id, payload.quantity, payload.promo_code, payload.bonus_amount)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {key: value for key, value in quote.items() if key not in {'variants', 'quantities'}}


@router.post('/gift-cart/quote', response_model=OrderQuoteOut)
def quote_gift_cart(payload: GiftCartQuoteIn, db: Session = Depends(get_db), customer: Customer | None = Depends(optional_customer)):
    try:
        quote = OrderService.quote_gift_cart(db, customer, [(item.variant_id, item.quantity) for item in payload.items], payload.promo_code, payload.bonus_amount)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {key: value for key, value in quote.items() if key not in {'variants', 'quantities'}}


@router.post('/gift-cart', response_model=OrderOut)
def create_gift_cart(payload: GiftCartCreate, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    try:
        order = OrderService.create_gift_cart(db, customer, [(item.variant_id, item.quantity) for item in payload.items], payload.promo_code, payload.bonus_amount)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return order_to_dict(OrderDAO.by_public_id(db, order.public_id))

@router.get('/{public_id}', response_model=OrderOut)
def get_order(public_id: str, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    order = OrderDAO.by_public_id(db, public_id)
    if not order or order.customer_id != customer.id:
        raise HTTPException(404, 'order_not_found')
    refresh_if_due(db, order)  # the customer may have just come back from the payment page
    return order_to_dict(OrderDAO.by_public_id(db, public_id))

@router.get('', response_model=list[OrderOut])
def customer_orders(db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    orders = OrderDAO.for_customer(db, customer.id)
    pending = [o for o in orders if o.status == 'awaiting_payment' and o.payment_id][:5]
    for order in pending:
        refresh_if_due(db, order)
    if pending:
        orders = OrderDAO.for_customer(db, customer.id)
    return [order_to_dict(o) for o in orders]
