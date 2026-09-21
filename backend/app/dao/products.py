from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from ..models import Product

class ProductDAO:
    @staticmethod
    def list(db: Session, active_only: bool = True):
        q = select(Product).options(selectinload(Product.variants), selectinload(Product.category)).order_by(Product.id.desc())
        if active_only:
            q = q.where(Product.active.is_(True))
        return list(db.scalars(q).unique())

    @staticmethod
    def by_slug(db: Session, slug: str):
        q = select(Product).options(selectinload(Product.variants), selectinload(Product.category)).where(Product.slug == slug)
        return db.scalar(q)
