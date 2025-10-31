from fastapi import APIRouter
router = APIRouter()

@router.post('/payments/webhook')
def webhook():
    return {'ok': True}
