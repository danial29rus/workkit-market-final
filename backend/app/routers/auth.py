from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..dao.customers import CustomerDAO
from ..db import get_db
from ..models import Customer
from ..schemas import CustomerOut, LoginIn, RegisterIn, TokenOut
from ..security import create_access_token, current_customer, hash_password, verify_password

router = APIRouter(prefix='/auth', tags=['auth'])

def user_dict(user: Customer):
    return {'id': user.id, 'email': user.email, 'full_name': user.full_name, 'phone': user.phone, 'created_at': user.created_at}

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
