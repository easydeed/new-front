from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import text
import json

from .deps import get_db, get_settings, get_logger
from .services.stripe_helpers import init_stripe, calc_stripe_fee

router = APIRouter()

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
        # If metadata contains user_id or subscription id, you can store it
        return {"ok": True}

    # --- Subscription lifecycle (assumes 'subscriptions' table exists) ---
    if etype in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
        sub = obj
        # Best-effort update; adapt columns as needed
        db.execute(text("""
            UPDATE subscriptions
            SET status = :status,
                cancel_at_period_end = COALESCE(:cancel_at_period_end, cancel_at_period_end),
                mrr_cents = COALESCE(:mrr, mrr_cents),
                updated_at = now()
            WHERE stripe_subscription_id = :sid
        """), {
            "status": sub.get("status"),
            "cancel_at_period_end": sub.get("cancel_at_period_end"),
            "mrr": (sub.get("items", {}).get("data",[{}])[0].get("price",{}).get("unit_amount") or 0),
            "sid": sub.get("id")
        })
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
