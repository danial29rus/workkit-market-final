"""resell.codes API client (https://resell.codes/docs). Only the gift-card part is used."""
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from .config import settings

log = logging.getLogger('workkit.resellcodes')


class SupplierError(Exception):
    """The supplier answered with an error: nothing was bought."""
    def __init__(self, message: str, status: int = 0):
        super().__init__(message)
        self.status = status


class SupplierUnreachable(Exception):
    """No definite answer (timeout, 5xx). A purchase may or may not have happened."""


def _request(method: str, path: str, payload: dict | None = None, query: dict | None = None) -> dict:
    url = settings.resellcodes_base_url.rstrip('/') + path
    if query:
        url += '?' + urllib.parse.urlencode({k: v for k, v in query.items() if v not in (None, '')})
    req = urllib.request.Request(url, data=json.dumps(payload).encode() if payload is not None else None, method=method, headers={
        'Authorization': f'Bearer {settings.resellcodes_api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'WorkKit/1.0 (+https://workkit-studio.ru)',
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read() or b'{}')
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors='replace')
        try:
            message = json.loads(body).get('error', {}).get('message') or body[:200]
        except (ValueError, AttributeError):
            message = body[:200]
        log.error('resell.codes %s %s -> %s %s', method, path, exc.code, message)
        if exc.code >= 500:
            raise SupplierUnreachable(f'http_{exc.code}') from exc
        raise SupplierError(message, exc.code) from exc
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        log.error('resell.codes %s %s failed: %s', method, path, exc)
        raise SupplierUnreachable(str(exc)) from exc


def account() -> dict:
    return _request('GET', '/me')


def categories(q: str = '') -> list[dict]:
    return _request('GET', '/gift-cards/categories', query={'q': q, 'limit': 600}).get('data', [])


def cards(category_id: str) -> dict:
    return _request('GET', f'/gift-cards/categories/{urllib.parse.quote(category_id, safe="")}/cards')


def buy(category_id: str, card_id: str, quantity: int) -> dict:
    """Charges the balance immediately and returns the supplier order (codes arrive once it is completed)."""
    return _request('POST', '/gift-cards/order', {'category_id': category_id, 'card_id': card_id, 'quantity': quantity})


def order(number: int) -> dict:
    return _request('GET', f'/orders/{number}')
