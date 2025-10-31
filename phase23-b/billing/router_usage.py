from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from .deps import get_db, get_settings

router = APIRouter(prefix="/usage", tags=["usage"])

@router.post("/events")
def log_event(event_type: str, user_id: int | None = None, api_key_prefix: str | None = None, billable: bool = False, cost_units: int = 1, unit_price_cents: int | None = None, resource_id: int | None = None, db: Session = Depends(get_db)):
    db.execute(text("""
        INSERT INTO usage_events (user_id, api_key_prefix, event_type, resource_id, billable, cost_units, unit_price_cents) 
        VALUES (:user_id, :prefix, :etype, :rid, :billable, :units, :price)
    """), {"user_id": user_id, "prefix": api_key_prefix, "etype": event_type, "rid": resource_id, "billable": billable, "units": cost_units, "price": unit_price_cents})
    db.commit()
    return {"ok": True}

@router.get("/overage/quote")
def overage_quote():
    s = get_settings()
    return {"overage_price_cents": s.STRIPE_OVERAGE_PRICE_CENTS, "currency": "USD"}

@router.get("/user/{user_id}/monthly")
def user_monthly(user_id: int, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS m, COUNT(*)::int AS events, COALESCE(SUM(cost_units),0)::int AS units
        FROM usage_events WHERE user_id=:uid GROUP BY 1 ORDER BY 1 DESC
    """), {"uid": user_id}).fetchall()
    return [{"month": r.m, "events": r.events, "units": r.units} for r in rows]

@router.get("/partner/{prefix}/monthly")
def partner_monthly(prefix: str, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS m, COUNT(*)::int AS events, COALESCE(SUM(cost_units),0)::int AS units
        FROM api_usage WHERE api_key_prefix=:pfx GROUP BY 1 ORDER BY 1 DESC
    """), {"pfx": prefix}).fetchall()
    return [{"month": r.m, "events": r.events, "units": r.units} for r in rows]

@router.get("/limit-check/user/{user_id}")
def limit_check_user(user_id: int, monthly_free_units: int = 5, db: Session = Depends(get_db)):
    # Example: free deeds per month
    row = db.execute(text("""
        SELECT COALESCE(SUM(cost_units),0)::int AS units
        FROM usage_events
        WHERE user_id=:uid AND billable=true AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    """), {"uid": user_id}).fetchone()
    used = row.units or 0
    remain = max(0, monthly_free_units - used)
    return {"used": used, "remaining_free_units": remain, "threshold": monthly_free_units}
