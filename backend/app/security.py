from datetime import datetime, timedelta, timezone
import base64
import hashlib
import hmac
import os
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from .config import settings
from .dao.customers import CustomerDAO
from .db import get_db

bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return 'scrypt$16384$8$1$' + base64.b64encode(salt).decode() + '$' + base64.b64encode(derived).decode()

def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        scheme, n, r, p, salt_b64, hash_b64 = password_hash.split('$', 5)
        if scheme != 'scrypt':
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        derived = hashlib.scrypt(password.encode(), salt=salt, n=int(n), r=int(r), p=int(p), dklen=len(expected))
        return hmac.compare_digest(derived, expected)
    except (ValueError, TypeError):
        return False

def create_access_token(customer_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {'sub': str(customer_id), 'iat': now, 'exp': now + timedelta(minutes=settings.access_token_minutes)}
    return jwt.encode(payload, settings.jwt_secret, algorithm='HS256')

def current_customer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not credentials:
        raise HTTPException(401, 'authentication_required')
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=['HS256'])
        customer_id = int(payload['sub'])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(401, 'invalid_token') from exc
    customer = CustomerDAO.by_id(db, customer_id)
    if not customer:
        raise HTTPException(401, 'user_not_found')
    return customer
