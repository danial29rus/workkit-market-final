from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..dao.customers import CustomerDAO
from ..db import get_db
from ..models import BonusTransaction, Customer
from ..schemas import BonusTransactionOut, CustomerOut, LoginIn, PasswordChange, ProfileUpdate, RegisterIn, TokenOut
from ..security import create_access_token, current_customer, hash_password, verify_password

router = APIRouter(prefix='/auth', tags=['auth'])

def user_dict(user: Customer):
    return {'id': user.id, 'email': user.email, 'full_name': user.full_name, 'phone': user.phone, 'created_at': user.created_at, 'bonus_balance': user.bonus_balance}

@router.post('/register', response_model=TokenOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    customer = CustomerDAO.by_email(db, payload.email)
    if customer and customer.password_hash:
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
    db.commit()
    db.refresh(customer)
    return {'access_token': create_access_token(customer.id), 'user': user_dict(customer)}

@router.post('/login', response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    customer = CustomerDAO.by_email(db, payload.email)
    if not customer or not verify_password(payload.password, customer.password_hash):
        raise HTTPException(401, 'invalid_email_or_password')
    return {'access_token': create_access_token(customer.id), 'user': user_dict(customer)}

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
