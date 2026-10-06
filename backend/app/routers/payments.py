import hmac
import logging
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from .. import mulenpay
from ..config import settings
from ..dao.orders import OrderDAO
from ..db import get_db
from ..models import Customer, Order
from ..security import current_customer
from ..services import OrderService
from ..payment_sync import confirm_order

router = APIRouter(prefix='/payments', tags=['payments'])
log = logging.getLogger('workkit.payments')


@router.get('/status')
def payments_status():
    return {'enabled': settings.payments_enabled, 'provider': 'mulenpay' if settings.payments_enabled else None}


@router.post('/orders/{public_id}')
def pay_order(public_id: str, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    """Return a Mulen Pay checkout URL for the customer's unpaid order (created once, then reused)."""
    order = OrderDAO.by_public_id(db, public_id)
    if not order or order.customer_id != customer.id:
        raise HTTPException(404, 'order_not_found')
    if order.status != 'awaiting_payment':
        raise HTTPException(400, 'order_not_payable')
    if not settings.payments_enabled:
        raise HTTPException(503, {'code': 'provider_not_configured', 'message': 'Онлайн-оплата временно недоступна. Заказ сохранён в кабинете.'})
    if order.payment_url:
        return {'payment_url': order.payment_url}
    if Decimal(order.total_amount) <= 0:
        # Fully covered by bonuses/promo: nothing to charge.
        OrderService.set_status(db, order, 'paid')
        return {'payment_url': None, 'paid': True}
    try:
        payment_id, url = mulenpay.create_payment(order.public_id, order.total_amount, customer.email, settings.frontend_origin)
    except mulenpay.MulenPayError as exc:
        raise HTTPException(502, {'code': 'payment_provider_error', 'message': 'Платёжная система не ответила. Попробуйте ещё раз через минуту.'}) from exc
    order.payment_provider = 'mulenpay'
    order.payment_id = payment_id
    order.payment_url = url
    db.commit()
    return {'payment_url': url}


@router.post('/mulenpay/callback')
async def mulenpay_callback(request: Request, token: str = '', db: Session = Depends(get_db)):
    """Optional webhook. Not required: orders are confirmed by polling too. The payload is unsigned, so it is re-checked via the API."""
    if settings.mulenpay_callback_token and not hmac.compare_digest(token, settings.mulenpay_callback_token):
        raise HTTPException(403, 'forbidden')
    try:
        data = await request.json()
    except Exception:
        data = dict(await request.form())
    payment_id = str(data.get('id') or '')
    uuid = str(data.get('uuid') or '')
    log.info('Mulen Pay callback: id=%s uuid=%s status=%s', payment_id, uuid, data.get('payment_status'))

    order = db.scalar(select(Order).where(Order.payment_id == payment_id)) if payment_id else None
    if order is None and uuid:
        order = OrderDAO.by_public_id(db, uuid)
    if order is None:
        raise HTTPException(404, 'order_not_found')
    if order.status != 'awaiting_payment':
        return {'success': True}

    if not order.payment_id and payment_id:
        order.payment_id = payment_id
    if not confirm_order(db, order):
        log.warning('Callback for %s not confirmed by Mulen Pay API', order.public_id)
    return {'success': True}
