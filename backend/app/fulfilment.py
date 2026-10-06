"""Delivery of gift-card codes after payment, bought from a chain of suppliers.

Suppliers are tried in SUPPLIERS order: if one definitely refuses (no balance, out of stock,
refunded order) the next one is tried. Adding a platform = writing one adapter class below.

Item states (OrderItem.fulfil_status):
  pending     – paid, waiting to be bought
  purchasing  – purchase request is being sent (committed BEFORE the request)
  processing  – bought, supplier is preparing codes
  delivered   – codes stored on the item and e-mailed
  failed      – supplier refused / refunded; nothing to deliver, admin decides
  manual      – needs a human: no supplier mapping, or the outcome of a purchase is unknown

Supplier APIs have no idempotency key, so a purchase whose result is unknown (timeout, crash)
is never retried automatically – that would risk paying twice. Such items go to `manual`.
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from . import resellcodes
from .config import settings
from .db import SessionLocal
from .mailer import send_mail
from .models import Order, OrderItem, ProductVariant
from .services import OrderService

log = logging.getLogger('workkit.fulfilment')

STUCK_AFTER = timedelta(minutes=5)
GIVE_UP_AFTER = timedelta(hours=2)  # supplier still "processing" after this → ask a human


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def codes_of(item: OrderItem) -> list[str]:
    try:
        return json.loads(item.codes) if item.codes else []
    except ValueError:
        return []


def alert(subject: str, text: str) -> None:
    to = settings.admin_alert_email or settings.smtp_from or settings.smtp_user
    log.warning('%s: %s', subject, text)
    if to:
        send_mail(to, f'[WorkKit] {subject}', text)


def _set(item: OrderItem, status: str, error: str | None = None) -> None:
    item.fulfil_status = status
    item.supplier_error = error[:300] if error else None
    item.fulfil_updated_at = _now()


def _mark_delivered(item: OrderItem, codes: list[str]) -> None:
    item.codes = json.dumps(codes, ensure_ascii=False)
    _set(item, 'delivered')


def _finish_order_if_ready(db: Session, order: Order) -> None:
    gift_items = [i for i in order.items if i.fulfil_status]
    if order.status != 'paid' or not gift_items or any(i.fulfil_status != 'delivered' for i in gift_items):
        return
    OrderService.set_status(db, order, 'completed')
    send_codes_email(order)


def send_codes_email(order: Order) -> None:
    lines, rows = [], []
    for item in order.items:
        codes = codes_of(item)
        if not codes:
            continue
        lines.append(f'{item.title_snapshot} · {item.variant_snapshot}:')
        lines += [f'  {c}' for c in codes]
        rows.append(f'<tr><td style="padding:12px 0 4px;font-weight:700">{item.title_snapshot} · {item.variant_snapshot}</td></tr>' + ''.join(
            f'<tr><td style="padding:4px 0"><code style="display:inline-block;font-size:17px;letter-spacing:1px;background:#eef8f6;color:#134e4a;border-radius:8px;padding:8px 12px">{c}</code></td></tr>' for c in codes))
    if not lines:
        return
    text = (f'Заказ {order.public_id} выполнен. Ваши коды:\n\n' + '\n'.join(lines) +
            '\n\nКоды также доступны в личном кабинете в разделе «Заказы». Перед активацией проверьте регион аккаунта.')
    html = f"""<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#101828">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;padding:32px;border:1px solid #e5e8ef">
<tr><td style="font-size:20px;font-weight:800">Ваши коды готовы</td></tr>
<tr><td style="padding-top:8px;color:#5d6679">Заказ {order.public_id}</td></tr>
{''.join(rows)}
<tr><td style="padding-top:20px;font-size:13px;line-height:1.6;color:#5d6679">Коды также доступны в личном кабинете в разделе «Заказы». Перед активацией проверьте регион аккаунта — активированный код вернуть нельзя.</td></tr>
</table></td></tr></table></body></html>"""
    send_mail(order.customer.email, f'Коды по заказу {order.public_id}', text, html)


class Refused(Exception):
    """A supplier definitely did not sell: safe to try the next one."""


class ResellCodesSupplier:
    name = 'resellcodes'
    title = 'resell.codes'

    def enabled(self) -> bool:
        return settings.supplier_enabled

    def mapped(self, variant: ProductVariant) -> bool:
        return bool(variant.supplier_category_id and variant.supplier_card_id)

    @staticmethod
    def _normalize(data: dict) -> dict:
        status = data.get('status')
        if status == 'completed' and data.get('codes'):
            return {'number': data.get('number'), 'state': 'delivered', 'codes': [str(c) for c in data['codes']]}
        if status in ('failed', 'refund'):
            return {'number': data.get('number'), 'state': 'refused', 'reason': f"{status}: {data.get('fail_code') or data.get('status_reason') or ''}".strip(': ')}
        return {'number': data.get('number'), 'state': 'processing'}

    def buy(self, variant: ProductVariant, quantity: int) -> dict:
        try:
            return self._normalize(resellcodes.buy(variant.supplier_category_id, variant.supplier_card_id, quantity))
        except resellcodes.SupplierError as exc:
            raise Refused(str(exc)) from exc

    def check(self, number: int) -> dict:
        return self._normalize(resellcodes.order(number))


# Order of preference. A second platform goes here once its adapter exists.
SUPPLIERS = [ResellCodesSupplier()]


def _supplier(name: str | None):
    return next((s for s in SUPPLIERS if s.name == name), None)


def _chain(variant: ProductVariant, after: str | None = None) -> list:
    names = [s.name for s in SUPPLIERS]
    start = names.index(after) + 1 if after in names else 0
    return [s for s in SUPPLIERS[start:] if s.enabled() and variant and s.mapped(variant)]


def has_supplier(variant: ProductVariant | None) -> bool:
    return bool(variant and _chain(variant))


def queue_paid_order(order: Order) -> None:
    """Called when an order becomes paid: put its gift-card lines in the delivery queue."""
    for item in order.items:
        variant = item.variant
        if not variant or variant.delivery_type != 'gift_card' or item.fulfil_status:
            continue
        mapped = has_supplier(variant)
        _set(item, 'pending' if mapped else 'manual', None if mapped else 'Номинал не привязан ни к одному поставщику — выдайте код вручную')


def _buy(db: Session, item: OrderItem, after: str | None = None, errors: list[str] | None = None) -> None:
    """Buy the item from the first supplier in the chain (after `after`) that agrees to sell it."""
    errors = errors or []
    ref = f'{item.title_snapshot} · {item.variant_snapshot} × {item.quantity}'
    for supplier in _chain(item.variant, after):
        # Claim first, so a crash or a parallel run can never send the same purchase twice.
        item.supplier, item.supplier_order_number = supplier.name, None
        _set(item, 'purchasing')
        db.commit()
        try:
            result = supplier.buy(item.variant, item.quantity)
        except Refused as exc:
            errors.append(f'{supplier.title}: {exc}')
            log.warning('%s refused %s: %s', supplier.title, item.order.public_id, exc)
            continue
        except (resellcodes.SupplierUnreachable, Exception) as exc:  # unknown outcome: never buy elsewhere too
            _set(item, 'manual', f'Нет ответа от {supplier.title} ({exc}). Проверьте их список заказов, прежде чем повторять — покупка могла пройти.')
            db.commit()
            alert(f'Неизвестен результат покупки для {item.order.public_id}',
                  f'{ref}\n{supplier.title} не ответил: {exc}.\nЕсли покупка у них прошла — впишите коды вручную в админке, если нет — нажмите «Повторить».')
            return
        item.supplier_order_number = result.get('number')
        if result['state'] == 'refused':
            errors.append(f"{supplier.title} #{result.get('number')}: {result.get('reason')}")
            continue
        _apply(item, result)
        db.commit()
        return
    _set(item, 'failed', '; '.join(errors) or 'Нет доступных поставщиков')
    db.commit()
    alert(f'Ни один поставщик не выдал код по {item.order.public_id}',
          f'{ref}\n' + '\n'.join(errors) + '\nПополните баланс поставщика и нажмите «Повторить» в админке или выдайте код вручную.')


def _apply(item: OrderItem, result: dict) -> None:
    if result['state'] == 'delivered':
        _mark_delivered(item, result['codes'])
        log.info('Codes delivered for %s by %s (%s × %s)', item.order.public_id, item.supplier, item.variant_snapshot, item.quantity)
    elif item.fulfil_status != 'processing':
        _set(item, 'processing')


def process() -> int:
    """One pass over the delivery queue. Returns how many items changed state."""
    if not any(sup.enabled() for sup in SUPPLIERS):
        return 0
    db = SessionLocal()
    changed = 0
    try:
        items = db.scalars(
            select(OrderItem).options(selectinload(OrderItem.variant), selectinload(OrderItem.order).selectinload(Order.items))
            .where(OrderItem.fulfil_status.in_(('pending', 'purchasing', 'processing'))).order_by(OrderItem.id)
        ).all()
        touched: dict[int, Order] = {}
        for item in items:
            before = item.fulfil_status
            if item.fulfil_status == 'pending':
                _buy(db, item)
            elif item.fulfil_status == 'purchasing':
                if item.fulfil_updated_at and _now() - item.fulfil_updated_at > STUCK_AFTER:
                    _set(item, 'manual', 'Покупка прервалась (перезапуск сервера). Проверьте заказы в кабинете resell.codes, прежде чем повторять.')
                    db.commit()
                    alert(f'Прерванная покупка по {item.order.public_id}', item.supplier_error or '')
            elif item.fulfil_status == 'processing' and item.supplier_order_number:
                supplier = _supplier(item.supplier)
                try:
                    result = supplier.check(item.supplier_order_number) if supplier else None
                except Exception:
                    result = None  # try again on the next pass
                if result and result['state'] == 'refused':
                    # The supplier refunded / failed after accepting: move on to the next one.
                    _buy(db, item, after=item.supplier, errors=[f"{supplier.title} #{item.supplier_order_number}: {result.get('reason')}"])
                elif result:
                    _apply(item, result)
                if item.fulfil_status == 'processing' and item.fulfil_updated_at and _now() - item.fulfil_updated_at > GIVE_UP_AFTER:
                    _set(item, 'manual', f'{supplier.title if supplier else item.supplier} #{item.supplier_order_number} больше 2 часов в обработке. Напишите в их поддержку.')
                    alert(f'Долгая выдача по {item.order.public_id}', item.supplier_error or '')
                db.commit()
            if item.fulfil_status != before:
                changed += 1
                touched[item.order.id] = item.order
        for order in touched.values():
            db.refresh(order)
            _finish_order_if_ready(db, order)
    finally:
        db.close()
    return changed


async def run_forever(interval: int = 15) -> None:
    log.info('Gift-card delivery queue every %ss, suppliers: %s', interval, ', '.join(s.title for s in SUPPLIERS if s.enabled()) or 'none (manual delivery)')
    while True:
        await asyncio.sleep(interval)
        try:
            await asyncio.to_thread(process)
        except Exception:
            log.exception('Gift-card delivery pass failed')
