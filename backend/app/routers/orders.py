from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..dao.orders import OrderDAO
from ..models import Customer
from ..schemas import OrderCreate, OrderOut
from ..security import current_customer
from ..serializers import order_to_dict
from ..services import OrderService

router = APIRouter(prefix='/orders', tags=['orders'])

@router.post('', response_model=OrderOut)
def create_order(payload: OrderCreate, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    try:
        order = OrderService.create(db, customer, payload.variant_id, payload.quantity)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return order_to_dict(OrderDAO.by_public_id(db, order.public_id))

@router.get('/{public_id}', response_model=OrderOut)
def get_order(public_id: str, db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    order = OrderDAO.by_public_id(db, public_id)
    if not order or order.customer_id != customer.id:
        raise HTTPException(404, 'order_not_found')
    return order_to_dict(order)

@router.get('', response_model=list[OrderOut])
def customer_orders(db: Session = Depends(get_db), customer: Customer = Depends(current_customer)):
    return [order_to_dict(o) for o in OrderDAO.for_customer(db, customer.id)]
