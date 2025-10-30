from sqlalchemy import text
from sqlalchemy.orm import Session

def get_revenue_overview(db: Session):
    try:
        total = db.execute(text("""
            SELECT COALESCE(SUM(amount_cents),0)::bigint FROM payment_history WHERE status='succeeded'
        """)).scalar() or 0
    except Exception:
        total = 0
    
    try:
        monthly = db.execute(text("""
            SELECT COALESCE(SUM(amount_cents),0)::bigint FROM payment_history 
            WHERE status='succeeded' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        """)).scalar() or 0
    except Exception:
        monthly = 0
    
    try:
        fees = db.execute(text("""
            SELECT COALESCE(SUM(stripe_fee_cents),0)::bigint FROM payment_history 
            WHERE status='succeeded' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
        """)).scalar() or 0
    except Exception:
        fees = 0
    
    try:
        refunded = db.execute(text("""
            SELECT COALESCE(SUM(refund_amount_cents),0)::bigint FROM payment_history 
            WHERE status='refunded' AND refunded_at >= DATE_TRUNC('month', CURRENT_DATE)
        """)).scalar() or 0
    except Exception:
        refunded = 0
    
    net = monthly - fees - refunded
    return {
        "total_revenue_cents": int(total),
        "monthly_revenue_cents": int(monthly),
        "stripe_fees_cents": int(fees),
        "refunds_cents": int(refunded),
        "net_monthly_revenue_cents": int(net)
    }

def monthly_breakdown(db: Session):
    try:
        rows = db.execute(text("""
            SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                   COALESCE(SUM(amount_cents),0)::bigint AS revenue
            FROM payment_history
            WHERE status='succeeded'
              AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
            GROUP BY 1 ORDER BY 1 DESC
        """)).fetchall()
        return [{"month": r.month, "revenue_cents": int(r.revenue), "revenue_dollars": int(r.revenue)/100} for r in rows]
    except Exception:
        return []

def mrr_arr(db: Session):
    # assumes subscriptions table exists and contains mrr_cents + status
    try:
        row = db.execute(text("""
            SELECT COALESCE(SUM(mrr_cents),0)::bigint FROM subscriptions WHERE status='active'
        """)).fetchone()
        mrr = int(row[0] or 0) if row else 0
    except Exception:
        # subscriptions table doesn't exist yet, return zeros
        mrr = 0
    return {
        "mrr_cents": mrr,
        "mrr_dollars": mrr/100,
        "arr_cents": mrr*12,
        "arr_dollars": (mrr*12)/100
    }
