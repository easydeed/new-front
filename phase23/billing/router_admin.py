from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from .deps import get_db

router = APIRouter(prefix='/admin', tags=['admin-billing'])

@router.get('/revenue')
def revenue(db: Session = Depends(get_db)):
    total = db.execute(text("SELECT COALESCE(SUM(amount_cents),0) FROM payment_history WHERE status='succeeded'"))
    total_cents = int(total.scalar() or 0)
    return {'overview': {'total_revenue_cents': total_cents, 'total_revenue_dollars': total_cents/100}}

@router.get('/invoices')
def invoices(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT id, invoice_number, status, total_cents, amount_due_cents, created_at FROM invoices ORDER BY id DESC LIMIT 100"))
    out = []
    for r in rows:
        out.append({'id': r[0], 'invoice_number': r[1], 'status': r[2], 'total_cents': r[3], 'amount_due_cents': r[4], 'created_at': r[5].isoformat() if r[5] else None})
    return out
