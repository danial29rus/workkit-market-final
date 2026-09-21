from sqlalchemy import select
from sqlalchemy.orm import Session
from ..models import Customer

class CustomerDAO:
    @staticmethod
    def by_email(db: Session, email: str):
        return db.scalar(select(Customer).where(Customer.email == email.lower()))

    @staticmethod
    def by_id(db: Session, customer_id: int):
        return db.get(Customer, customer_id)
