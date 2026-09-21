from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..dao.products import ProductDAO
from ..schemas import ProductOut
from ..serializers import product_to_dict

router = APIRouter(prefix='/catalog', tags=['catalog'])

@router.get('/products', response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return [product_to_dict(p) for p in ProductDAO.list(db)]

@router.get('/products/{slug}', response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    p = ProductDAO.by_slug(db, slug)
    if not p:
        raise HTTPException(404, 'product_not_found')
    return product_to_dict(p)
