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

Plan mapping is self-sufficient — no extra env vars required. For each active
subscription the script derives the plan from, in order: the optional
STRIPE_*_PRICE_ID env vars if present, the price's metadata.plan / nickname,
then the Stripe product's metadata.plan / name (matched against the known
plan tokens 'professional' / 'enterprise'). Prices it cannot confidently map
are listed in an "UNMAPPED — needs owner decision" section of the report
instead of blocking the run.
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

    KNOWN_PLANS = ("professional", "enterprise")

    # Optional env override, same vars /users/upgrade uses — fine if absent.
    price_to_plan = {}
    for env_var, plan in (("STRIPE_PROFESSIONAL_PRICE_ID", "professional"),
                          ("STRIPE_ENTERPRISE_PRICE_ID", "enterprise")):
        price_id = os.getenv(env_var)
        if price_id:
            price_to_plan[price_id] = plan

    product_cache = {}

    def plan_token(*texts):
        """Return the first known plan whose name appears in any given text."""
        for text in texts:
            lowered = (text or "").lower()
            for plan in KNOWN_PLANS:
                if plan in lowered:
                    return plan
        return None

    def resolve_plan(price):
        """Derive a plan name for a Stripe price without requiring env config."""
        if not price:
            return None
        if price.get("id") in price_to_plan:
            return price_to_plan[price["id"]]
        plan = plan_token((price.get("metadata") or {}).get("plan"),
                          price.get("nickname"), price.get("lookup_key"))
        if plan:
            return plan
        product_id = price.get("product")
        if isinstance(product_id, str):
            if product_id not in product_cache:
                try:
                    product_cache[product_id] = stripe.Product.retrieve(product_id)
                except Exception:
                    product_cache[product_id] = {}
            product = product_cache[product_id]
            return plan_token((product.get("metadata") or {}).get("plan"),
                              product.get("name"))
        return None

    # Authoritative state: every active/trialing subscription in Stripe.
    expected = {}  # stripe_customer_id -> (plan, subscription created datetime)
    unmapped = {}  # price_id -> example (nickname/product hint, customer)
    for status in ("active", "trialing"):
        for sub in stripe.Subscription.list(status=status, limit=100).auto_paging_iter():
            items = sub.get("items", {}).get("data", [])
            price = items[0].get("price") if items else None
            plan = resolve_plan(price)
            if plan is None:
                if price:
                    unmapped[price.get("id")] = (price.get("nickname") or price.get("product"),
                                                 sub.get("customer"))
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

    unmapped_customers = {cust for _, cust in unmapped.values() if cust}
    matched_customers = set()
    for user_id, email, current_plan, customer_id in rows:
        if customer_id in expected:
            matched_customers.add(customer_id)
            expected_plan, sub_created = expected[customer_id]
            if current_plan != expected_plan:
                missed_upgrades.append((user_id, email, current_plan, expected_plan, sub_created))
        elif customer_id in unmapped_customers:
            # Has an active subscription on a price we couldn't map — never
            # treat as a downgrade candidate; surfaced in the UNMAPPED section.
            continue
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
    if unmapped:
        print(f"\nUNMAPPED — needs owner decision ({len(unmapped)} price(s); these "
              f"subscriptions were skipped and their users protected from downgrade):")
        for price_id, (hint, customer) in sorted(unmapped.items()):
            print(f"  price {price_id} (hint: {hint}) — e.g. customer {customer}")
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
