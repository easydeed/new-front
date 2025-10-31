#!/usr/bin/env python3
from datetime import datetime, timedelta
from sqlalchemy import text
from phase23.billing.deps import SessionLocal, get_settings
from phase23.billing.services.stripe_helpers import init_stripe

if __name__ == "__main__":
    s = get_settings()
    stripe = init_stripe()
    db = SessionLocal()
    try:
        since = int((datetime.utcnow() - timedelta(days=1)).timestamp())
        charges = stripe.Charge.list(created={ "gte": since }, limit=100)
        stripe_total = sum(int(ch.get("amount") or 0) for ch in charges)
        db_total = db.execute(text("""
            SELECT COALESCE(SUM(amount_cents),0)::bigint FROM payment_history WHERE status='succeeded' AND created_at >= now() - interval '1 day'
        """)).scalar() or 0
        print(f"Stripe 24h: {stripe_total} vs DB 24h: {db_total}")
    finally:
        db.close()
