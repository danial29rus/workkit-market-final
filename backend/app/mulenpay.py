"""Minimal Mulen Pay client: create a payment and read its state back.

Docs: https://docs.mulenpay.com/pays/pays_create.html
"""
import hashlib
import json
import logging
import urllib.error
import urllib.request
from decimal import Decimal
from .config import settings

log = logging.getLogger('workkit.mulenpay')

# Payment status codes from GET /v2/payments/{id}; 3 means the payment went through.
STATUS_PAID = 3


class MulenPayError(Exception):
    pass


def _request(method: str, path: str, payload: dict | None = None) -> dict:
    url = settings.mulenpay_base_url.rstrip('/') + path
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': f'Bearer {settings.mulenpay_api_key}',
        # Cloudflare in front of Mulen Pay rejects the default "Python-urllib" agent (error 1010).
        'User-Agent': 'WorkKit/1.0 (+https://workkit-studio.ru)',
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read() or b'{}')
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors='replace')[:500]
        log.error('Mulen Pay %s %s -> %s %s', method, path, exc.code, body)
        raise MulenPayError(f'http_{exc.code}') from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        log.error('Mulen Pay %s %s failed: %s', method, path, exc)
        raise MulenPayError('unreachable') from exc


def sign(currency: str, amount: str, uuid: str) -> str:
    raw = f'{currency}{amount}{settings.mulenpay_shop_id}{uuid}{settings.mulenpay_secret_key}'
    return hashlib.sha1(raw.encode()).hexdigest()


def create_payment(order_public_id: str, amount: Decimal, email: str, website_url: str) -> tuple[str, str]:
    """Create a payment for the whole order. Only the customer's e-mail is passed, no line items."""
    currency = 'rub'
    amount_str = f'{Decimal(amount):.2f}'
    payload = {
        'currency': currency,
        'amount': amount_str,
        'uuid': order_public_id,
        'shopId': settings.mulenpay_shop_id,
        'description': 'Покупка в магазине workkit-studio',
        'website_url': website_url,
        'language': 'ru',
        'client': email,
        'items': [],
        'sign': sign(currency, amount_str, order_public_id),
    }
    data = _request('POST', '/v2/payments', payload)
    if not data.get('success') or not data.get('paymentUrl'):
        log.error('Mulen Pay rejected payment for %s: %s', order_public_id, data)
        raise MulenPayError('rejected')
    return str(data['id']), data['paymentUrl']


def get_payment(payment_id: str) -> dict:
    data = _request('GET', f'/v2/payments/{payment_id}')
    payment = data.get('payment')
    if not data.get('success') or not isinstance(payment, dict):
        raise MulenPayError('not_found')
    return payment
