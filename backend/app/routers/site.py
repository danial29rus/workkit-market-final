from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import SiteConfig
from ..schemas import SiteConfigOut

router = APIRouter(prefix='/site', tags=['site'])


def get_or_create_config(db: Session) -> SiteConfig:
    config = db.get(SiteConfig, 1)
    if config:
        return config
    config = SiteConfig(id=1)
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


@router.get('/config', response_model=SiteConfigOut)
def site_config(db: Session = Depends(get_db)):
    return get_or_create_config(db)
