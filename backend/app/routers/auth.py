import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..config import settings
from ..dao.customers import CustomerDAO
from ..db import get_db
from ..mailer import send_mail, verification_email
from ..models import BonusTransaction, Customer
from ..schemas import BonusTransactionOut, CustomerOut, EmailIn, LoginIn, PasswordChange, ProfileUpdate, RegisterIn, TokenOut, VerifyEmailIn
from ..security import create_access_token, current_customer, hash_password, verify_password
from .site import get_or_create_config

router = APIRouter(prefix='/auth', tags=['auth'])

RESEND_COOLDOWN = timedelta(seconds=60)
MAX_CODE_ATTEMPTS = 5


def user_dict(user: Customer):
    return {'id': user.id, 'email': user.email, 'full_name': user.full_name, 'phone': user.phone, 'created_at': user.created_at, 'bonus_balance': user.bonus_balance}


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _code_hash(email: str, code: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), f'{email.lower()}:{code}'.encode(), hashlib.sha256).hexdigest()


def _session(customer: Customer) -> dict:
    return {'access_token': create_access_token(customer.id), 'user': user_dict(customer)}


def _send_code(db: Session, customer: Customer, tasks: BackgroundTasks) -> int:
    """Issue a fresh code and e-mail it. Returns seconds until another code may be requested."""
    now = _now()
    if customer.verify_sent_at and now - customer.verify_sent_at < RESEND_COOLDOWN:
        return int((RESEND_COOLDOWN - (now - customer.verify_sent_at)).total_seconds()) + 1
    code = f'{secrets.randbelow(1_000_000):06d}'
    customer.verify_code_hash = _code_hash(customer.email, code)
    customer.verify_expires_at = now + timedelta(minutes=settings.email_code_minutes)
    customer.verify_sent_at = now
    customer.verify_attempts = 0
    db.commit()
    subject, text, html = verification_email(code, get_or_create_config(db).brand_name)
    tasks.add_task(send_mail, customer.email, subject, text, html)
    return int(RESEND_COOLDOWN.total_seconds())


def _pending(customer: Customer, retry_after: int) -> dict:
    return {'verification_required': True, 'email': customer.email, 'retry_after': retry_after}


@router.post('/register')
def register(payload: RegisterIn, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    customer = CustomerDAO.by_email(db, payload.email)
    # An address that never finished verification may be registered again.
    if customer and customer.password_hash and customer.email_verified:
        raise HTTPException(409, 'email_already_registered')
    if customer:
        customer.full_name = payload.full_name.strip()
        customer.phone = payload.phone.strip() if payload.phone else customer.phone
        customer.password_hash = hash_password(payload.password)
    else:
        customer = Customer(
            email=payload.email.lower(),
            full_name=payload.full_name.strip(),
            phone=payload.phone.strip() if payload.phone else None,
            password_hash=hash_password(payload.password),
        )
        db.add(customer)
    customer.email_verified = not settings.email_verification_enabled
    db.commit()
    db.refresh(customer)
    if customer.email_verified:
        return _session(customer)
    return _pending(customer, _send_code(db, customer, tasks))


@router.post('/login')
def login(payload: LoginIn, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    customer = CustomerDAO.by_email(db, payload.email)
    if not customer or not verify_password(payload.password, customer.password_hash):
        raise HTTPException(401, 'invalid_email_or_password')
    if not customer.email_verified:
        return _pending(customer, _send_code(db, customer, tasks))
    return _session(customer)


@router.post('/verify-email', response_model=TokenOut)
def verify_email(payload: VerifyEmailIn, db: Session = Depends(get_db)):
    customer = CustomerDAO.by_email(db, payload.email)
    if not customer or customer.email_verified or not customer.verify_code_hash:
        raise HTTPException(400, 'invalid_code')
    if customer.verify_attempts >= MAX_CODE_ATTEMPTS:
        raise HTTPException(400, 'code_attempts_exceeded')
    if customer.verify_expires_at and customer.verify_expires_at < _now():
        raise HTTPException(400, 'code_expired')
    if not hmac.compare_digest(customer.verify_code_hash, _code_hash(customer.email, payload.code.strip())):
        customer.verify_attempts += 1
        db.commit()
        raise HTTPException(400, 'code_attempts_exceeded' if customer.verify_attempts >= MAX_CODE_ATTEMPTS else 'invalid_code')
    customer.email_verified = True
    customer.verify_code_hash = None
    customer.verify_expires_at = None
    customer.verify_attempts = 0
    db.commit()
    db.refresh(customer)
    return _session(customer)


@router.post('/resend-code')
def resend_code(payload: EmailIn, tasks: BackgroundTasks, db: Session = Depends(get_db)):
    customer = CustomerDAO.by_email(db, payload.email)
    # Same answer for unknown and already verified addresses, so the endpoint does not reveal who is registered.
    if not customer or customer.email_verified:
        return {'retry_after': int(RESEND_COOLDOWN.total_seconds())}
    return {'retry_after': _send_code(db, customer, tasks)}


@router.get('/me', response_model=CustomerOut)
def me(customer: Customer = Depends(current_customer)):
    return user_dict(customer)


@router.patch('/me', response_model=CustomerOut)
def update_me(payload: ProfileUpdate, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    customer.full_name = payload.full_name.strip()
    customer.phone = payload.phone.strip() or None if payload.phone else None
    db.commit()
    db.refresh(customer)
    return user_dict(customer)


@router.post('/password', status_code=204)
def change_password(payload: PasswordChange, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    if not verify_password(payload.current_password, customer.password_hash):
        raise HTTPException(400, 'invalid_current_password')
    customer.password_hash = hash_password(payload.new_password)
    db.commit()


@router.get('/bonus-history', response_model=list[BonusTransactionOut])
def bonus_history(db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    q = select(BonusTransaction).where(BonusTransaction.customer_id == customer.id).order_by(BonusTransaction.created_at.desc()).limit(100)
    return list(db.scalars(q))
