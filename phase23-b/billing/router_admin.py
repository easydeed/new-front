from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import csv, io

from .deps import get_db
from .services.revenue import get_revenue_overview, monthly_breakdown, mrr_arr

router = APIRouter(prefix="/admin", tags=["admin-billing"])

def require_admin():
    # TODO: wire to real RBAC
    return True

@router.get("/revenue")
def revenue(db: Session = Depends(get_db)):
    require_admin()
    return {
        "overview": get_revenue_overview(db),
        "monthly_breakdown": monthly_breakdown(db),
        "mrr_arr": mrr_arr(db)
    }

@router.get("/invoices")
def list_invoices(limit: int = 100, db: Session = Depends(get_db)):
    require_admin()
    rows = db.execute(text("""
        SELECT id, invoice_number, status, total_cents, amount_due_cents, invoice_pdf_url, billing_period_start, billing_period_end, created_at
        FROM invoices ORDER BY id DESC LIMIT :lim
    """), {"lim": limit}).fetchall()
    out = []
    for r in rows:
        out.append({
            "id": r.id, "invoice_number": r.invoice_number, "status": r.status,
            "total_cents": r.total_cents, "amount_due_cents": r.amount_due_cents,
            "invoice_pdf_url": r.invoice_pdf_url,
            "period": [r.billing_period_start.isoformat() if r.billing_period_start else None, r.billing_period_end.isoformat() if r.billing_period_end else None],
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return out

@router.get("/payments")
def list_payments(limit: int = 200, db: Session = Depends(get_db)):
    require_admin()
    rows = db.execute(text("""
        SELECT id, invoice_id, user_id, amount_cents, currency, status, stripe_fee_cents, net_amount_cents, created_at
        FROM payment_history ORDER BY id DESC LIMIT :lim
    """), {"lim": limit}).fetchall()
    return [{
        "id": r.id, "invoice_id": r.invoice_id, "user_id": r.user_id, "amount_cents": r.amount_cents, "currency": r.currency,
        "status": r.status, "stripe_fee_cents": r.stripe_fee_cents, "net_amount_cents": r.net_amount_cents,
        "created_at": r.created_at.isoformat() if r.created_at else None
    } for r in rows]

@router.get("/exports/payments.csv")
def export_payments_csv(db: Session = Depends(get_db)):
    require_admin()
    buf = io.StringIO()
    wr = csv.writer(buf)
    wr.writerow(["id","invoice_id","user_id","amount_cents","currency","status","stripe_fee_cents","net_amount_cents","created_at"])
    rows = db.execute(text("""
        SELECT id, invoice_id, user_id, amount_cents, currency, status, stripe_fee_cents, net_amount_cents, created_at
        FROM payment_history ORDER BY id DESC LIMIT 5000
    """)).fetchall()
    for r in rows:
        wr.writerow([r.id, r.invoice_id, r.user_id, r.amount_cents, r.currency, r.status, r.stripe_fee_cents, r.net_amount_cents, r.created_at.isoformat() if r.created_at else None])
    buf.seek(0)
    return {"filename": "payments.csv", "data": buf.read()}
