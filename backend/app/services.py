from decimal import Decimal
import secrets
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Customer, Order, OrderItem, ProductVariant

class OrderService:
    @staticmethod
    def create(db: Session, customer: Customer, variant_id: int, quantity: int = 1) -> Order:
        variant = db.scalar(select(ProductVariant).where(ProductVariant.id == variant_id))
        if not variant:
            raise ValueError('variant_not_found')
        total = Decimal(variant.price) * quantity
        order = Order(
            public_id='WK-' + secrets.token_hex(4).upper(),
            customer_id=customer.id,
            status='awaiting_payment',
            total_amount=total,
            currency='RUB',
        )
        db.add(order)
        db.flush()
        db.add(OrderItem(
            order_id=order.id,
            variant_id=variant.id,
            title_snapshot=variant.product.title,
            variant_snapshot=variant.name,
            unit_price=variant.price,
            quantity=quantity,
        ))
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def set_status(db: Session, order: Order, status: str) -> Order:
        allowed = {'awaiting_payment', 'paid', 'in_progress', 'completed', 'cancelled', 'refunded'}
        if status not in allowed:
            raise ValueError('invalid_status')
        order.status = status
        if status in {'paid', 'in_progress', 'completed'} and not order.delivery_token:
            order.delivery_token = 'REQ-' + '-'.join([secrets.token_hex(2).upper() for _ in range(3)])
        db.commit()
        db.refresh(order)
        return order
