from fastapi import APIRouter, HTTPException
router = APIRouter(prefix='/payments', tags=['payments'])

@router.post('/create')
def create_payment():
    raise HTTPException(
        status_code=503,
        detail={
            'code': 'provider_not_configured',
            'message': 'Платёжный провайдер пока не подключён. После выбора агрегатора здесь будет hosted checkout / redirect URL.'
        }
    )
