from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .deps import get_db, get_settings

router = APIRouter(prefix='/usage', tags=['usage'])

@router.get('/overage/quote')
def overage_quote():
    s = get_settings()
    return {'overage_price_cents': s.STRIPE_OVERAGE_PRICE_CENTS, 'currency': 'USD'}

@router.post('/events')
def log_event(event_type: str, user_id: int | None = None, api_key_prefix: str | None = None, billable: bool = False, cost_units: int = 1, unit_price_cents: int | None = None, db: Session = Depends(get_db)):
    # Minimal stub; full model included in migrations
    db.execute('INSERT INTO usage_events (user_id, api_key_prefix, event_type, billable, cost_units, unit_price_cents) VALUES (%s,%s,%s,%s,%s,%s)', (user_id, api_key_prefix, event_type, billable, cost_units, unit_price_cents))
    db.commit()
    return {'ok': True}
