"""Backfill users.plan from Stripe after the plan-sync webhook gap.

Background: from the moment phase23_billing's webhook shadowed the legacy
handler, checkout.session.completed stopped updating users.plan (and
subscription cancellations stopped downgrading). This script diffs Stripe's
active subscriptions (the source of truth) against users.plan and reports —
and optionally corrects — the discrepancies.

Usage (run where DATABASE_URL and STRIPE_SECRET_KEY are configured, e.g. a
Render shell):

    python scripts/backfill_plan_sync.py                    # dry-run report
    python scripts/backfill_plan_sync.py --apply            # fix missed upgrades
    python scripts/backfill_plan_sync.py --apply-downgrades # also downgrade
                                                            # paid-plan users
                                                            # with no active sub

Plan mapping comes from STRIPE_PROFESSIONAL_PRICE_ID / STRIPE_ENTERPRISE_PRICE_ID
(the same env vars /users/upgrade uses).
"""
import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2
import stripe


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="write missed plan upgrades to users.plan")
    parser.add_argument("--apply-downgrades", action="store_true",
                        help="also downgrade paid users with no active subscription")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_URL")
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if not db_url or not stripe.api_key:
        sys.exit("DATABASE_URL and STRIPE_SECRET_KEY are required")

    price_to_plan = {}
    for env_var, plan in (("STRIPE_PROFESSIONAL_PRICE_ID", "professional"),
                          ("STRIPE_ENTERPRISE_PRICE_ID", "enterprise")):
        price_id = os.getenv(env_var)
        if price_id:
            price_to_plan[price_id] = plan
    if not price_to_plan:
        sys.exit("No STRIPE_*_PRICE_ID env vars set — cannot map prices to plans")

    # Authoritative state: every active/trialing subscription in Stripe.
    expected = {}  # stripe_customer_id -> (plan, subscription created datetime)
    unknown_prices = set()
    for status in ("active", "trialing"):
        for sub in stripe.Subscription.list(status=status, limit=100).auto_paging_iter():
            items = sub.get("items", {}).get("data", [])
            price_id = items[0]["price"]["id"] if items else None
            plan = price_to_plan.get(price_id)
            if plan is None:
                if price_id:
                    unknown_prices.add(price_id)
                continue
            created = datetime.fromtimestamp(sub["created"], tz=timezone.utc)
            customer = sub["customer"]
            if customer not in expected or created > expected[customer][1]:
                expected[customer] = (plan, created)

    conn = psycopg2.connect(db_url)
    missed_upgrades = []   # (user_id, email, current_plan, expected_plan, sub_created)
    downgrade_candidates = []  # (user_id, email, current_plan)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, email, COALESCE(plan, 'free'), stripe_customer_id
            FROM users WHERE stripe_customer_id IS NOT NULL
        """)
        rows = cur.fetchall()

    matched_customers = set()
    for user_id, email, current_plan, customer_id in rows:
        if customer_id in expected:
            matched_customers.add(customer_id)
            expected_plan, sub_created = expected[customer_id]
            if current_plan != expected_plan:
                missed_upgrades.append((user_id, email, current_plan, expected_plan, sub_created))
        elif current_plan not in ("free", None):
            downgrade_candidates.append((user_id, email, current_plan))

    orphan_customers = set(expected) - matched_customers

    print(f"Active/trialing Stripe subscriptions mapped to plans: {len(expected)}")
    print(f"Users with a stripe_customer_id: {len(rows)}")
    print()
    print(f"MISSED UPGRADES (Stripe says paid, users.plan disagrees): {len(missed_upgrades)}")
    for user_id, email, cur_p, exp_p, created in sorted(missed_upgrades, key=lambda r: r[4]):
        print(f"  user {user_id} <{email}>: '{cur_p}' -> '{exp_p}' (subscribed {created:%Y-%m-%d %H:%M UTC})")
    if missed_upgrades:
        window = sorted(r[4] for r in missed_upgrades)
        print(f"  time window: {window[0]:%Y-%m-%d} .. {window[-1]:%Y-%m-%d}")
    print()
    print(f"DOWNGRADE CANDIDATES (paid plan, no active Stripe subscription): {len(downgrade_candidates)}")
    for user_id, email, cur_p in downgrade_candidates:
        print(f"  user {user_id} <{email}>: '{cur_p}' -> 'free'")
    if unknown_prices:
        print(f"\nWARNING: subscriptions on unmapped price IDs (ignored): {sorted(unknown_prices)}")
    if orphan_customers:
        print(f"WARNING: {len(orphan_customers)} paying Stripe customers have no matching "
              f"users.stripe_customer_id row: {sorted(orphan_customers)}")

    if args.apply and missed_upgrades:
        with conn.cursor() as cur:
            for user_id, _, _, exp_p, _ in missed_upgrades:
                cur.execute("UPDATE users SET plan = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                            (exp_p, user_id))
        conn.commit()
        print(f"\nAPPLIED {len(missed_upgrades)} plan upgrades.")
    if args.apply_downgrades and downgrade_candidates:
        with conn.cursor() as cur:
            for user_id, _, _ in downgrade_candidates:
                cur.execute("UPDATE users SET plan = 'free', updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                            (user_id,))
        conn.commit()
        print(f"APPLIED {len(downgrade_candidates)} downgrades.")
    if not args.apply:
        print("\nDry run — nothing written. Re-run with --apply (and/or --apply-downgrades).")
    conn.close()


if __name__ == "__main__":
    main()
