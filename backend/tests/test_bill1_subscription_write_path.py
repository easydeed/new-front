"""BILL1 — the subscription pipeline's third and final lock.

Lineage, because this pipeline has been broken three independent ways
and each break hid the next:

  1. T1 — a legacy inline webhook shadowed the phase23 router, so none
     of its handlers ran at all.
  2. ADMIN1 — the `subscriptions` table did not exist in production, so
     every statement in those handlers addressed nothing.
  3. BILL1 (here) — even with the router live and the table present, the
     lifecycle handler was UPDATE-only. `customer.subscription.created`
     had no row to update, wrote nothing, and returned {"ok": true}: a
     fabricated success sitting on the billing path.

The end-to-end test is the one that matters — event in, row out, and the
MRR the Revenue tab reads reflects it. That last hop was invisible until
ADMIN1 killed the silent-zero, because a missing row and a missing table
both rendered as $0.
"""
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text

from phase23_billing.deps import get_db
from phase23_billing.router_webhook import router

LIVE_DB = os.getenv("DATABASE_URL")

SUB_ID = "sub_bill1_test"
CUSTOMER_ID = "cus_bill1_test"
TEST_EMAIL = "bill1@subscription.test"


def _subscription_event(etype, status="active", unit_amount=2999,
                        cancel_at_period_end=False, nickname="Professional"):
    return {
        "type": etype,
        "data": {"object": {
            "id": SUB_ID,
            "customer": CUSTOMER_ID,
            "status": status,
            "cancel_at_period_end": cancel_at_period_end,
            "current_period_start": 1754179200,
            "current_period_end": 1756857600,
            "items": {"data": [{"price": {"unit_amount": unit_amount,
                                          "nickname": nickname}}]},
        }},
    }


def _post(client, event):
    stripe_stub = MagicMock()
    stripe_stub.Webhook.construct_event.return_value = event
    _settings = MagicMock()
    _settings.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    # MONEY1: the secret is set because this test is about what the
    # handler DOES with a verified event. Verification is now two
    # distinct refusals (not configured / mismatched), pinned in
    # test_phase23_webhook.py. Before that split, FIVE test files
    # exercised this endpoint with NO secret — proving handler
    # behaviour in exactly the configuration that refuses every
    # real Stripe event, which is why none of them could catch it.
    with patch("phase23_billing.router_webhook.init_stripe", return_value=stripe_stub), \
         patch("phase23_billing.router_webhook.get_settings", return_value=_settings):
        return client.post("/payments/webhook", json={},
                           headers={"stripe-signature": "t=1,v1=stub"})


# ── Structural: the write exists at all ──────────────────────────────

def test_an_insert_path_exists():
    """The defect in one line: there was no INSERT INTO subscriptions
    anywhere in the codebase."""
    import inspect
    from phase23_billing import router_webhook
    src = inspect.getsource(router_webhook)
    assert "INSERT INTO subscriptions" in src
    assert "ON CONFLICT (stripe_subscription_id) DO UPDATE" in src


def test_checkout_never_overwrites_an_observed_status():
    """Stripe does not guarantee event ordering. Checkout carries no
    subscription status, so it must not clobber one that already
    arrived — hence DO NOTHING, not DO UPDATE."""
    import inspect
    from phase23_billing.router_webhook import ensure_subscription_row
    src = inspect.getsource(ensure_subscription_row)
    assert "DO NOTHING" in src
    assert "'active'" not in src, "checkout must not claim a status it did not observe"


# ── End to end against a real database ───────────────────────────────

@pytest.fixture
def live_client():
    """Real session, real table, real SQL — the layer where all three
    breaks in this pipeline lived."""
    from phase23_billing.deps import SessionLocal

    session = SessionLocal()
    session.execute(text("DELETE FROM subscriptions WHERE stripe_subscription_id = :s"),
                    {"s": SUB_ID})
    session.execute(text("DELETE FROM users WHERE email = :e"), {"e": TEST_EMAIL})
    session.execute(text("""
        INSERT INTO users (email, password_hash, full_name, role, state, plan, stripe_customer_id)
        VALUES (:e, 'x', 'BILL1 Tester', 'escrow_officer', 'CA', 'free', :c)
    """), {"e": TEST_EMAIL, "c": CUSTOMER_ID})
    session.commit()

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: session
    yield TestClient(app), session

    session.execute(text("DELETE FROM subscriptions WHERE stripe_subscription_id = :s"),
                    {"s": SUB_ID})
    session.execute(text("DELETE FROM users WHERE email = :e"), {"e": TEST_EMAIL})
    session.commit()
    session.close()


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_created_event_inserts_a_row(live_client):
    client, session = live_client
    assert _post(client, _subscription_event("customer.subscription.created")).status_code == 200

    row = session.execute(text("""
        SELECT status, plan_name, mrr_cents, user_id, current_plan_price_cents
        FROM subscriptions WHERE stripe_subscription_id = :s
    """), {"s": SUB_ID}).fetchone()
    assert row is not None, "the created event still wrote nothing"
    assert row[0] == "active"
    assert row[1] == "Professional"
    assert row[2] == 2999
    assert row[3] is not None, "the Stripe customer should resolve to our user"
    assert row[4] == 2999


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_the_revenue_tab_sees_it(live_client):
    """The whole point: event in → row exists → MRR reflects it. This hop
    was unobservable before ADMIN1, because a missing row and a missing
    table both rendered as a confident $0."""
    from phase23_billing.services.revenue import mrr_arr

    client, session = live_client
    baseline = mrr_arr(session)["mrr_cents"]
    assert baseline is not None, "revenue reads should not be failing"

    _post(client, _subscription_event("customer.subscription.created"))

    after = mrr_arr(session)
    assert after["errors"] == []
    assert after["mrr_cents"] == baseline + 2999
    assert after["arr_cents"] == (baseline + 2999) * 12


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_subsequent_events_update_rather_than_duplicate(live_client):
    client, session = live_client
    _post(client, _subscription_event("customer.subscription.created"))
    _post(client, _subscription_event("customer.subscription.updated",
                                      unit_amount=9999, cancel_at_period_end=True))

    rows = session.execute(text("""
        SELECT status, mrr_cents, cancel_at_period_end
        FROM subscriptions WHERE stripe_subscription_id = :s
    """), {"s": SUB_ID}).fetchall()
    assert len(rows) == 1, "the upsert must not duplicate on repeat events"
    assert rows[0][1] == 9999
    assert rows[0][2] is True


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_cancellation_zeroes_mrr_and_downgrades_the_user(live_client):
    client, session = live_client
    _post(client, _subscription_event("customer.subscription.created"))
    _post(client, _subscription_event("customer.subscription.deleted", status="canceled"))

    row = session.execute(text("""
        SELECT status, mrr_cents FROM subscriptions WHERE stripe_subscription_id = :s
    """), {"s": SUB_ID}).fetchone()
    assert row[0] == "canceled"
    assert row[1] == 0, "a cancelled subscription contributes no recurring revenue"

    plan = session.execute(text("SELECT plan FROM users WHERE email = :e"),
                           {"e": TEST_EMAIL}).fetchone()[0]
    assert plan == "free"


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_checkout_ensures_a_row_when_the_subscription_event_is_missing(live_client):
    """Belt and braces: if `customer.subscription.created` is delayed or
    lost, the checkout still leaves us a subscription we can see."""
    client, session = live_client
    _post(client, {
        "type": "checkout.session.completed",
        "data": {"object": {
            "subscription": SUB_ID, "customer": CUSTOMER_ID,
            "client_reference_id": None,
            "metadata": {"plan": "professional"},
        }},
    })

    row = session.execute(text("""
        SELECT status, plan_name, user_id FROM subscriptions
        WHERE stripe_subscription_id = :s
    """), {"s": SUB_ID}).fetchone()
    assert row is not None
    assert row[0] == "incomplete", "checkout must not claim an unobserved status"
    assert row[1] == "professional"
    assert row[2] is not None

    # ...and the real event, arriving later, corrects it without duplicating.
    _post(client, _subscription_event("customer.subscription.created"))
    rows = session.execute(text("""
        SELECT status, plan_name FROM subscriptions WHERE stripe_subscription_id = :s
    """), {"s": SUB_ID}).fetchall()
    assert len(rows) == 1
    assert rows[0][0] == "active"
    assert rows[0][1] == "Professional"
