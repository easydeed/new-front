"""Revenue reads — a zero here must mean zero, not "the query failed".

ADMIN1: every function in this module used to wrap its query in a bare
`try/except: return 0`, one of them with the comment "subscriptions table
doesn't exist yet, return zeros". The production check on 2026-08-03
found that table missing entirely — so the Revenue tab's $0 MRR was
never a real zero, it was the except branch, and no operator could tell
the two apart. That is invariant #4 (errors are never swallowed into
empty states) sitting on the money screen.

The tables are now in the one schema authority (`database.create_tables`),
so a missing table is no longer an expected condition — it is a real
failure, and it says so. Each read returns its value plus an `errors`
list; the router surfaces those, and the tab shows a banner instead of a
confident $0.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session

# Zero and unknown are different claims. `None` means "we could not
# read this", and every consumer must render it as such.
UNKNOWN = None


def _scalar(db: Session, sql: str, errors: list, label: str):
    """Run a scalar read. On failure, record WHY and return UNKNOWN —
    never a number the caller cannot distinguish from real data."""
    try:
        return int(db.execute(text(sql)).scalar() or 0)
    except Exception as e:
        db.rollback()  # a failed read leaves the session unusable otherwise
        errors.append(f"{label}: {type(e).__name__}: {str(e)[:200]}")
        return UNKNOWN


def get_revenue_overview(db: Session):
    errors: list = []

    total = _scalar(db, """
        SELECT COALESCE(SUM(amount_cents),0)::bigint FROM payment_history WHERE status='succeeded'
    """, errors, "total_revenue")

    monthly = _scalar(db, """
        SELECT COALESCE(SUM(amount_cents),0)::bigint FROM payment_history
        WHERE status='succeeded' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    """, errors, "monthly_revenue")

    fees = _scalar(db, """
        SELECT COALESCE(SUM(stripe_fee_cents),0)::bigint FROM payment_history
        WHERE status='succeeded' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    """, errors, "stripe_fees")

    refunded = _scalar(db, """
        SELECT COALESCE(SUM(refund_amount_cents),0)::bigint FROM payment_history
        WHERE status='refunded' AND refunded_at >= DATE_TRUNC('month', CURRENT_DATE)
    """, errors, "refunds")

    # Net is only meaningful if all three inputs are real.
    net = (monthly - fees - refunded
           if UNKNOWN not in (monthly, fees, refunded) else UNKNOWN)

    return {
        "total_revenue_cents": total,
        "monthly_revenue_cents": monthly,
        "stripe_fees_cents": fees,
        "refunds_cents": refunded,
        "net_monthly_revenue_cents": net,
        "errors": errors,
    }


def monthly_breakdown(db: Session):
    """Returns (rows, errors). An empty list from a FAILED query and an
    empty list from a business with no revenue yet are different facts."""
    try:
        rows = db.execute(text("""
            SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                   COALESCE(SUM(amount_cents),0)::bigint AS revenue
            FROM payment_history
            WHERE status='succeeded'
              AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
            GROUP BY 1 ORDER BY 1 DESC
        """)).fetchall()
        return [{"month": r.month, "revenue_cents": int(r.revenue),
                 "revenue_dollars": int(r.revenue) / 100} for r in rows], []
    except Exception as e:
        db.rollback()
        return [], [f"monthly_breakdown: {type(e).__name__}: {str(e)[:200]}"]


def mrr_arr(db: Session):
    errors: list = []
    mrr = _scalar(db, """
        SELECT COALESCE(SUM(mrr_cents),0)::bigint FROM subscriptions WHERE status='active'
    """, errors, "mrr")
    return {
        "mrr_cents": mrr,
        "mrr_dollars": mrr / 100 if mrr is not UNKNOWN else UNKNOWN,
        "arr_cents": mrr * 12 if mrr is not UNKNOWN else UNKNOWN,
        "arr_dollars": (mrr * 12) / 100 if mrr is not UNKNOWN else UNKNOWN,
        "errors": errors,
    }
