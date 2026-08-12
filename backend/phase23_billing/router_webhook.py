from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import text
import json
import os

from .deps import get_db, get_settings, get_logger
from .services.stripe_helpers import init_stripe, calc_stripe_fee

router = APIRouter()


def _ts(value):
    """Stripe sends unix seconds; the columns are timestamps."""
    try:
        return datetime.utcfromtimestamp(int(value)) if value else None
    except (TypeError, ValueError, OSError):
        return None


def _first_price(sub: dict) -> dict:
    try:
        return (sub.get("items", {}).get("data") or [{}])[0].get("price") or {}
    except (AttributeError, IndexError, TypeError):
        return {}


def _resolve_user_id(db: Session, customer_id):
    """Map a Stripe customer back to our user. None when unknown — the
    row is still worth storing; an orphaned subscription we can see beats
    one we cannot."""
    if not customer_id:
        return None
    row = db.execute(
        text("SELECT id FROM users WHERE stripe_customer_id = :cust LIMIT 1"),
        {"cust": customer_id},
    ).fetchone()
    return row[0] if row else None


def upsert_subscription(db: Session, sub: dict):
    """BILL1 — the write that never existed.

    Lineage, for the record: this pipeline has been broken three
    independent ways, each hidden behind the last.
      1. T1 — a legacy inline webhook shadowed this router, so none of
         these handlers ran at all.
      2. ADMIN1 — the `subscriptions` table did not exist in production,
         so every statement here addressed nothing.
      3. This — even with the router live and the table present, the
         handler was UPDATE-only. `customer.subscription.created` had no
         row to update, so it wrote nothing and returned {"ok": true}.
         A fabricated success on the billing path.

    Now an upsert: insert on first sight, update on every event after.
    `plan_name` and `status` are NOT NULL, so both always resolve to
    something real or to an explicitly-marked placeholder — never to an
    invented claim about the customer's state.
    """
    price = _first_price(sub)
    sid = sub.get("id")
    if not sid:
        return 0

    user_id = _resolve_user_id(db, sub.get("customer"))

    # plan_name is NOT NULL. Prefer Stripe's own label; fall back to the
    # plan we already recorded on the user; last resort is a marker that
    # reads as unknown rather than as a plan someone chose.
    plan_name = price.get("nickname")
    if not plan_name and user_id is not None:
        row = db.execute(text("SELECT plan FROM users WHERE id = :uid"),
                         {"uid": user_id}).fetchone()
        plan_name = row[0] if row and row[0] else None
    plan_name = plan_name or "unknown"

    result = db.execute(text("""
        INSERT INTO subscriptions (
            user_id, stripe_subscription_id, status, plan_name,
            current_period_start, current_period_end,
            current_plan_price_cents, mrr_cents, cancel_at_period_end,
            created_at, updated_at
        ) VALUES (
            :uid, :sid, :status, :plan,
            :period_start, :period_end,
            :price_cents, :mrr, :cancel_at_period_end,
            now(), now()
        )
        ON CONFLICT (stripe_subscription_id) DO UPDATE SET
            user_id = COALESCE(EXCLUDED.user_id, subscriptions.user_id),
            status = EXCLUDED.status,
            plan_name = CASE WHEN EXCLUDED.plan_name = 'unknown'
                             THEN subscriptions.plan_name
                             ELSE EXCLUDED.plan_name END,
            current_period_start = COALESCE(EXCLUDED.current_period_start, subscriptions.current_period_start),
            current_period_end = COALESCE(EXCLUDED.current_period_end, subscriptions.current_period_end),
            current_plan_price_cents = COALESCE(EXCLUDED.current_plan_price_cents, subscriptions.current_plan_price_cents),
            mrr_cents = COALESCE(EXCLUDED.mrr_cents, subscriptions.mrr_cents),
            cancel_at_period_end = COALESCE(EXCLUDED.cancel_at_period_end, subscriptions.cancel_at_period_end),
            updated_at = now()
        RETURNING id
    """), {
        "uid": user_id,
        "sid": sid,
        "status": sub.get("status") or "incomplete",
        "plan": plan_name,
        "period_start": _ts(sub.get("current_period_start")),
        "period_end": _ts(sub.get("current_period_end")),
        "price_cents": price.get("unit_amount"),
        # A cancelled subscription contributes no recurring revenue. Left
        # as the raw amount otherwise; MRR normalisation across billing
        # intervals is not attempted here and is not claimed to be.
        "mrr": 0 if sub.get("status") in ("canceled", "incomplete_expired")
               else price.get("unit_amount"),
        "cancel_at_period_end": sub.get("cancel_at_period_end"),
    })
    return 1 if result.fetchone() else 0


def ensure_subscription_row(db: Session, subscription_id, customer_id, plan):
    """Checkout completed: make sure the subscription exists even if the
    `customer.subscription.created` event is delayed or lost.

    Deliberately DO NOTHING on conflict — checkout carries no
    subscription status, so it must never overwrite a real one that
    already arrived. The placeholder status is Stripe's own
    `incomplete` ("created, not confirmed"), corrected by the first
    subscription event. We do not write `active` here: we have not
    observed it.
    """
    if not subscription_id:
        return 0
    user_id = _resolve_user_id(db, customer_id)
    result = db.execute(text("""
        INSERT INTO subscriptions (
            user_id, stripe_subscription_id, status, plan_name, created_at, updated_at
        ) VALUES (:uid, :sid, 'incomplete', :plan, now(), now())
        ON CONFLICT (stripe_subscription_id) DO NOTHING
        RETURNING id
    """), {"uid": user_id, "sid": subscription_id, "plan": plan or "unknown"})
    return 1 if result.fetchone() else 0


@router.post("/payments/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    s = get_settings()
    stripe = init_stripe()

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=s.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook verification failed: {e}")

    etype = event.get("type")
    obj = event.get("data", {}).get("object", {})

    # --- Checkout completed ---
    if etype == "checkout.session.completed":
        # Apply the purchased plan to the user. Ported from the legacy inline
        # webhook this router shadows — without this, paid upgrades never
        # change users.plan. /users/upgrade sets client_reference_id and
        # metadata={plan, user_id} on the checkout session.
        sess = obj
        user_id = sess.get("client_reference_id") or (sess.get("metadata") or {}).get("user_id")
        plan = (sess.get("metadata") or {}).get("plan")
        try:
            uid = int(user_id) if user_id is not None else None
        except (TypeError, ValueError):
            uid = None
        if uid is not None and plan:
            db.execute(text(
                "UPDATE users SET plan = :plan, updated_at = now() WHERE id = :uid"
            ), {"plan": plan, "uid": uid})
        elif uid is not None and not plan:
            # PRICING1 — THE FOUNDING-RATE TRAP, made loud.
            #
            # A Stripe PAYMENT LINK carries `client_reference_id` if you
            # set one, but it carries `metadata.plan` only if you set
            # that TOO. With the reference alone this branch used to fall
            # through and return {"ok": true}: Stripe recorded a
            # successful payment, the customer was charged, the plan
            # stayed 'free', and nothing anywhere said so.
            #
            # Verified against the live handler before this was written —
            # client_reference_id alone gives HTTP 200 and plan
            # unchanged.
            #
            # We do NOT guess the plan from the price. Inferring which
            # product somebody bought is the same class of move the whole
            # doctrine refuses, and a founding-rate price ID would not
            # match the standard one anyway. So: refuse silently to
            # guess, and refuse loudly to be quiet.
            print(f"[billing] PAID BUT NOT UPGRADED: checkout completed for "
                  f"user {uid} with no metadata.plan — the Payment Link or "
                  f"Checkout session must set metadata={{'plan': '<key>'}}. "
                  f"The customer has been charged and their plan is unchanged.")
        # BILL1: a subscription checkout must leave a subscription row.
        # Previously nothing here or downstream ever inserted one.
        #
        # The outcome is deliberately NOT added to the response body:
        # that body is Stripe's, it only needs a 2xx, and the six-flow
        # baseline pins its shape. Our evidence that the write happened
        # belongs in the database and on the Revenue tab — which is
        # exactly where the BILL1 harness looks for it.
        ensure_subscription_row(
            db, sess.get("subscription"), sess.get("customer"), plan)
        db.commit()
        return {"ok": True}

    # --- Subscription lifecycle ---
    # BILL1: this was UPDATE-only, so `customer.subscription.created`
    # had nothing to update and silently wrote nothing. It upserts now.
    if etype in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
        sub = obj
        upsert_subscription(db, sub)
        if etype == "customer.subscription.deleted" and sub.get("customer"):
            # Ported from the legacy webhook: a cancelled subscription
            # downgrades the user back to the free plan.
            db.execute(text(
                "UPDATE users SET plan = 'free', updated_at = now() WHERE stripe_customer_id = :cust"
            ), {"cust": sub.get("customer")})
        db.commit()
        return {"ok": True}

    # --- Invoice created ---
    if etype == "invoice.created":
        inv = obj
        stripe_invoice_id = inv["id"]
        number = inv.get("number") or stripe_invoice_id
        user_id = inv.get("metadata", {}).get("user_id")
        try:
            user_id = int(user_id) if user_id else None
        except Exception:
            user_id = None

        items = []
        for l in (inv.get("lines", {}).get("data") or []):
            items.append({
                "description": l.get("description",""),
                "quantity": l.get("quantity", 1),
                "unit_price_cents": (l.get("price") or {}).get("unit_amount") or l.get("amount") or 0,
                "total_cents": l.get("amount") or 0
            })

        billing_start = datetime.fromtimestamp((inv.get("period_start") or inv.get("created")))
        billing_end = datetime.fromtimestamp((inv.get("period_end") or inv.get("created")))

        db.execute(text("""
            INSERT INTO invoices (
                user_id, api_key_prefix, invoice_number, stripe_invoice_id, subtotal_cents, tax_cents, discount_cents,
                total_cents, amount_paid_cents, amount_due_cents, currency, status,
                billing_period_start, billing_period_end, due_date, line_items, notes
            ) VALUES (
                :user_id, NULL, :num, :sid, :subtotal, :tax, 0,
                :total, 0, :amount_due, :currency, :status,
                :bstart, :bend, :due, :items::jsonb, NULL
            )
            ON CONFLICT (stripe_invoice_id) DO NOTHING
        """), {
            "user_id": user_id,
            "num": number,
            "sid": stripe_invoice_id,
            "subtotal": inv.get("subtotal") or 0,
            "tax": inv.get("tax") or 0,
            "total": inv.get("total") or 0,
            "amount_due": inv.get("amount_due") or 0,
            "currency": (inv.get("currency") or "usd").upper(),
            "status": inv.get("status") or "draft",
            "bstart": billing_start,
            "bend": billing_end,
            "due": datetime.fromtimestamp(inv.get("due_date")) if inv.get("due_date") else billing_end,
            "items": json.dumps({"items": items})
        })
        db.commit()
        return {"ok": True}

    # --- Invoice paid ---
    if etype == "invoice.payment_succeeded":
        inv = obj
        sid = inv.get("id")
        amount_paid = inv.get("amount_paid") or inv.get("total") or 0
        currency = (inv.get("currency") or "usd").upper()

        row = db.execute(text("SELECT id FROM invoices WHERE stripe_invoice_id=:sid"), {"sid": sid}).fetchone()
        invoice_id = row.id if row else None

        # Mark invoice paid
        if invoice_id:
            db.execute(text("""
                UPDATE invoices SET status='paid', paid_at=now(), amount_paid_cents=:amt, amount_due_cents=GREATEST(total_cents - :amt, 0) WHERE id=:id
            """), {"amt": amount_paid, "id": invoice_id})
            db.commit()

        # PaymentHistory
        # PaymentIntent id may be on the charge or invoice; best-effort mapping
        intent_id = inv.get("payment_intent")
        charge_id = None
        fee = calc_stripe_fee(int(amount_paid))
        db.execute(text("""
            INSERT INTO payment_history (invoice_id, user_id, stripe_payment_intent_id, stripe_charge_id, amount_cents, currency, status, payment_method, stripe_fee_cents, net_amount_cents)
            VALUES (:invoice_id, NULL, :pi, :cid, :amt, :cur, 'succeeded', 'card', :fee, :net)
        """), {"invoice_id": invoice_id, "pi": intent_id, "cid": charge_id, "amt": amount_paid, "cur": currency, "fee": fee, "net": int(amount_paid) - fee})
        db.commit()
        return {"ok": True}

    # --- Payment intent success/failure ---
    if etype == "payment_intent.succeeded":
        pi = obj
        amount = int(pi.get("amount") or 0)
        currency = (pi.get("currency") or "usd").upper()
        fee = calc_stripe_fee(amount)
        db.execute(text("""
            INSERT INTO payment_history (invoice_id, user_id, stripe_payment_intent_id, stripe_charge_id, amount_cents, currency, status, payment_method, stripe_fee_cents, net_amount_cents)
            VALUES (NULL, NULL, :pi, :cid, :amt, :cur, 'succeeded', :pm, :fee, :net)
        """), {
            "pi": pi.get("id"),
            "cid": (pi.get("charges", {}).get("data") or [{}])[0].get("id"),
            "amt": amount,
            "cur": currency,
            "pm": (pi.get("payment_method_types") or ["card"])[0],
            "fee": fee,
            "net": amount - fee
        })
        db.commit()
        return {"ok": True}

    # ── Renewal failure — the event dunning actually runs on ──────────
    #
    # TRIAL1. `payment_intent.payment_failed` was handled below, and it is
    # the WRONG event for a subscription: it fires for one-off payment
    # intents and wrote a payment_history row with user_id NULL, so a
    # failed RENEWAL produced an unattributable row and no notification.
    # A customer whose card expired kept full access, silently, forever.
    #
    # This is invoice.payment_failed: it carries the subscription and the
    # customer, so the user can actually be resolved and told.
    if etype == "invoice.payment_failed":
        inv = obj
        customer_id = inv.get("customer")
        user_id = _resolve_user_id(db, customer_id)
        amount = int(inv.get("amount_due") or 0)
        currency = (inv.get("currency") or "usd").upper()

        db.execute(text("""
            INSERT INTO payment_history (invoice_id, user_id, stripe_payment_intent_id,
                                         amount_cents, currency, status, payment_method,
                                         failure_code, failure_message)
            VALUES (NULL, :uid, :pi, :amt, :cur, 'failed', 'card', :code, :msg)
        """), {
            "uid": user_id,
            "pi": inv.get("payment_intent"),
            "amt": amount,
            "cur": currency,
            "code": "invoice_payment_failed",
            "msg": (inv.get("last_finalization_error") or {}).get("message")
                   or "Subscription renewal payment failed",
        })
        db.commit()

        # Tell them. Through the E1 transport, so the attempt is on the
        # record even when the send fails — a dunning email we cannot
        # prove we sent is ADMIN3's problem all over again.
        #
        # Wrapped because notifying is strictly less important than
        # returning 2xx to Stripe: an exception here would make Stripe
        # retry an event we already recorded.
        if user_id:
            try:
                row = db.execute(text(
                    "SELECT email, full_name FROM users WHERE id = :uid"
                ), {"uid": user_id}).mappings().first()
                if row and row.get("email"):
                    from utils.notifications import send_payment_failed_with_reason
                    amount_text = f" of ${amount / 100:,.2f}" if amount else ""
                    # A payment-failed email whose "update your card" link
                    # points at localhost is worse than no email: it looks
                    # like the product is broken rather than the card.
                    from services.environment import require
                    base = require("FRONTEND_URL")
                    ok, reason = send_payment_failed_with_reason(
                        row["email"], row.get("full_name") or "",
                        amount_text, f"{base}/account-settings",
                        user_id=user_id)
                    if not ok:
                        print(f"[billing] payment-failed email not sent "
                              f"(user={user_id}): {reason}")
            except Exception as e:
                print(f"[billing] payment-failed notification error "
                      f"(user={user_id}): {e}")

        return {"ok": True}

    if etype == "payment_intent.payment_failed":
        pi = obj
        amount = int(pi.get("amount") or 0)
        currency = (pi.get("currency") or "usd").upper()
        db.execute(text("""
            INSERT INTO payment_history (invoice_id, user_id, stripe_payment_intent_id, amount_cents, currency, status, payment_method, failure_code, failure_message)
            VALUES (NULL, NULL, :pi, :amt, :cur, 'failed', :pm, :code, :msg)
        """), {
            "pi": pi.get("id"),
            "amt": amount,
            "cur": currency,
            "pm": (pi.get("payment_method_types") or ["card"])[0],
            "code": (pi.get("last_payment_error") or {}).get("code"),
            "msg": (pi.get("last_payment_error") or {}).get("message"),
        })
        db.commit()
        return {"ok": True}

    # --- Refunds ---
    if etype == "charge.refunded":
        ch = obj
        refunds = (ch.get("refunds", {}).get("data") or [])
        if refunds:
            ref = refunds[-1]
            amt = int(ref.get("amount") or 0)
            db.execute(text("""
                UPDATE payment_history
                SET status='refunded', refunded_at=now(), refund_amount_cents=:amt, refund_reason=:reason
                WHERE stripe_charge_id=:cid
            """), {"amt": amt, "reason": ref.get("reason"), "cid": ch.get("id")})
            db.commit()
        return {"ok": True}

    # --- Unhandled ---
    return {"ok": True}
