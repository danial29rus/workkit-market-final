"""Confirms Mulen Pay payments by asking the provider, so no webhook is required.

An order is checked when its owner looks at it (with a short throttle) and by a background
loop that sweeps recent unpaid orders every PAYMENT_SYNC_INTERVAL seconds.
"""
import asyncio
import logging
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import mulenpay
from .config import settings
from .db import SessionLocal
from .models import Order
from .services import OrderService

log = logging.getLogger('workkit.payment_sync')

ON_VIEW_THROTTLE = 8  # seconds between provider checks of one order triggered by page views
SWEEP_WINDOW = timedelta(hours=48)  # unpaid orders older than this are no longer polled
_last_check: dict[str, float] = {}


def confirm_order(db: Session, order: Order) -> bool:
    """Ask Mulen Pay about the order's payment and mark it paid when the provider confirms it."""
    if order.status != 'awaiting_payment' or not order.payment_id or not settings.payments_enabled:
        return False
    _last_check[order.public_id] = time.monotonic()
    try:
        payment = mulenpay.get_payment(order.payment_id)
    except mulenpay.MulenPayError:
        return False
    # Mulen Pay returns our order number as external_id; its own uuid is a separate value.
    same_order = order.public_id in (str(payment.get('external_id')), str(payment.get('uuid')))
    try:
        same_amount = Decimal(str(payment.get('amount'))) == Decimal(order.total_amount)
    except ArithmeticError:
        same_amount = False
    if int(payment.get('status', -1)) == mulenpay.STATUS_PAID and same_order and same_amount:
        OrderService.set_status(db, order, 'paid')
        log.info('Order %s confirmed as paid by Mulen Pay', order.public_id)
        return True
    if int(payment.get('status', -1)) == mulenpay.STATUS_PAID:
        log.warning('Payment %s is paid but does not match order %s (external_id=%s amount=%s)',
                    order.payment_id, order.public_id, payment.get('external_id'), payment.get('amount'))
    return False


def refresh_if_due(db: Session, order: Order) -> None:
    """Cheap check used on page views: at most once per ON_VIEW_THROTTLE seconds per order."""
    if order.status != 'awaiting_payment' or not order.payment_id:
        return
    if time.monotonic() - _last_check.get(order.public_id, 0) < ON_VIEW_THROTTLE:
        return
    confirm_order(db, order)


def sweep() -> int:
    """Check every recent unpaid order that already has a Mulen Pay payment."""
    since = datetime.now(timezone.utc).replace(tzinfo=None) - SWEEP_WINDOW
    confirmed = 0
    db = SessionLocal()
    try:
        orders = db.scalars(
            select(Order).where(Order.status == 'awaiting_payment', Order.payment_id.is_not(None), Order.created_at >= since)
            .order_by(Order.created_at.desc()).limit(100)
        ).all()
        for order in orders:
            confirmed += confirm_order(db, order)
    finally:
        db.close()
    return confirmed


async def run_forever() -> None:
    interval = settings.payment_sync_interval
    log.info('Payment status polling every %ss', interval)
    while True:
        await asyncio.sleep(interval)
        if not settings.payments_enabled:
            continue
        try:
            confirmed = await asyncio.to_thread(sweep)
            if confirmed:
                log.info('Payment sweep confirmed %s order(s)', confirmed)
        except Exception:
            log.exception('Payment sweep failed')
