from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from ..models import Order

class OrderDAO:
    @staticmethod
    def by_public_id(db: Session, public_id: str):
        q = select(Order).options(selectinload(Order.items), selectinload(Order.customer)).where(Order.public_id == public_id)
        return db.scalar(q)

    @staticmethod
    def list(db: Session):
        q = select(Order).options(selectinload(Order.items), selectinload(Order.customer)).order_by(Order.created_at.desc())
        return list(db.scalars(q).unique())

    @staticmethod
    def for_customer(db: Session, customer_id: int):
        q = (select(Order)
             .options(selectinload(Order.items), selectinload(Order.customer))
             .where(Order.customer_id == customer_id)
             .order_by(Order.created_at.desc()))
        return list(db.scalars(q).unique())
