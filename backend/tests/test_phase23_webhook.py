"""Regression tests for users.plan sync in the phase23 Stripe webhook.

The phase23 router owns POST /payments/webhook (it registers before main.py's
routes). These tests pin the plan-sync behavior ported from the legacy inline
webhook: checkout.session.completed applies the purchased plan, and
customer.subscription.deleted downgrades the user to 'free'.
"""
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from phase23_billing.router_webhook import router
from phase23_billing.deps import get_db


class RecordingSession:
    """Stands in for a SQLAlchemy Session, recording every execute()."""

    def __init__(self):
        self.statements = []

    def execute(self, stmt, params=None):
        self.statements.append((str(stmt), params or {}))
        result = MagicMock()
        result.fetchone.return_value = None
        return result

    def commit(self):
        pass

    def close(self):
        pass


def make_client(session):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: session
    return TestClient(app)


def post_event(session, event, secret="whsec_test"):
    """MONEY1: the secret is set here because these tests are about what
    the handler DOES with a verified event.

    Verification itself is now two distinct refusals — not configured,
    and configured-but-mismatched — pinned separately below. Before that
    split these tests passed an empty secret and relied on the stubbed
    verifier never looking at it, which is exactly how a production
    service ran for months refusing every real event."""
    stripe_stub = MagicMock()
    stripe_stub.Webhook.construct_event.return_value = event
    settings_stub = MagicMock()
    settings_stub.STRIPE_WEBHOOK_SECRET = secret
    with patch("phase23_billing.router_webhook.init_stripe", return_value=stripe_stub), \
         patch("phase23_billing.router_webhook.get_settings", return_value=settings_stub):
        client = make_client(session)
        return client.post(
            "/payments/webhook",
            content=b"{}",
            headers={"stripe-signature": "t=1,v1=stub"},
        )


def statements_matching(session, fragment):
    return [(sql, params) for sql, params in session.statements if fragment in sql]


def test_checkout_completed_applies_plan():
    session = RecordingSession()
    resp = post_event(session, {
        "type": "checkout.session.completed",
        "data": {"object": {
            "client_reference_id": "42",
            "metadata": {"plan": "professional", "user_id": "42"},
        }},
    })
    assert resp.status_code == 200
    updates = statements_matching(session, "UPDATE users SET plan = :plan")
    assert len(updates) == 1
    assert updates[0][1] == {"plan": "professional", "uid": 42}


def test_checkout_completed_without_metadata_is_safe():
    session = RecordingSession()
    resp = post_event(session, {
        "type": "checkout.session.completed",
        "data": {"object": {"client_reference_id": None, "metadata": {}}},
    })
    assert resp.status_code == 200
    assert statements_matching(session, "UPDATE users") == []


def test_subscription_deleted_downgrades_user_to_free():
    session = RecordingSession()
    resp = post_event(session, {
        "type": "customer.subscription.deleted",
        "data": {"object": {
            "id": "sub_123",
            "customer": "cus_abc",
            "status": "canceled",
            "cancel_at_period_end": False,
            "items": {"data": [{"price": {"unit_amount": 2999}}]},
        }},
    })
    assert resp.status_code == 200
    # BILL1 changed the statement shape deliberately: the handler was
    # UPDATE-only, so a subscription we had never seen had no row to
    # update and the event wrote nothing. It upserts now — the intent
    # this test guards (the subscriptions table is touched, and the user
    # is downgraded below) is unchanged.
    assert len(statements_matching(session, "INSERT INTO subscriptions")) == 1
    downgrades = statements_matching(session, "UPDATE users SET plan = 'free'")
    assert len(downgrades) == 1
    assert downgrades[0][1] == {"cust": "cus_abc"}


def test_subscription_updated_does_not_touch_users():
    session = RecordingSession()
    resp = post_event(session, {
        "type": "customer.subscription.updated",
        "data": {"object": {
            "id": "sub_123",
            "customer": "cus_abc",
            "status": "active",
            "cancel_at_period_end": False,
            "items": {"data": [{"price": {"unit_amount": 2999}}]},
        }},
    })
    assert resp.status_code == 200
    assert statements_matching(session, "UPDATE users") == []


# ══════════════════════════════════════════════════════════════════════
# MONEY1 — not configured is not a bad signature
# ══════════════════════════════════════════════════════════════════════

def test_an_unset_secret_says_it_is_a_deployment_problem():
    """THE FAILURE THAT COST A LIVE CHECKOUT.

    With no secret, `construct_event` fails and every legitimate Stripe
    event is refused — identically to a forged one, which is correct, and
    identically in the MESSAGE, which is not. The remedies share nothing:
    one is "set an environment variable", the other is "the two copies of
    the signing secret differ".

    §4 — an error that names its context ends an investigation in one
    run. This one was diagnosed by noticing a customer had been charged
    and not upgraded.
    """
    session = RecordingSession()
    response = post_event(session, {"type": "checkout.session.completed",
                                    "data": {"object": {}}}, secret="")
    assert response.status_code == 400
    detail = response.json()["detail"].lower()
    assert "not configured" in detail
    assert "deployment" in detail
    # And it does NOT claim the event was bad — the event was fine.
    assert "signature verification failed" not in detail


def test_a_mismatched_secret_says_the_secret_is_wrong():
    """The other half. The secret IS set, so this is two copies of a
    value disagreeing — and the message says so rather than sending
    somebody to check whether the variable exists."""
    session = RecordingSession()
    stripe_stub = MagicMock()
    stripe_stub.Webhook.construct_event.side_effect = ValueError("no match")
    settings_stub = MagicMock()
    settings_stub.STRIPE_WEBHOOK_SECRET = "whsec_wrong"
    with patch("phase23_billing.router_webhook.init_stripe", return_value=stripe_stub), \
         patch("phase23_billing.router_webhook.get_settings", return_value=settings_stub):
        response = make_client(session).post(
            "/payments/webhook", content=b"{}",
            headers={"stripe-signature": "t=1,v1=stub"})
    assert response.status_code == 400
    detail = response.json()["detail"].lower()
    assert "does not match" in detail
    assert "not configured" not in detail


def test_neither_refusal_writes_anything():
    """A refused event must leave no trace of having been believed."""
    for secret in ("", "whsec_wrong"):
        session = RecordingSession()
        stripe_stub = MagicMock()
        if secret:
            stripe_stub.Webhook.construct_event.side_effect = ValueError("no match")
        settings_stub = MagicMock()
        settings_stub.STRIPE_WEBHOOK_SECRET = secret
        with patch("phase23_billing.router_webhook.init_stripe", return_value=stripe_stub), \
             patch("phase23_billing.router_webhook.get_settings", return_value=settings_stub):
            make_client(session).post("/payments/webhook", content=b"{}",
                                      headers={"stripe-signature": "t=1,v1=stub"})
        assert session.statements == [], f"a refused event wrote rows (secret={secret!r})"


def test_invoice_created_actually_inserts():
    """MONEY1 — THIS HANDLER HAD NEVER ONCE SUCCEEDED.

    The insert ended `:items::jsonb`. In a SQLAlchemy `text()`, `::`
    collides with bind-parameter syntax and the statement never parses,
    so every `invoice.created` raised ProgrammingError and 500'd.

    IT SURVIVED BECAUSE NO TEST EVER POSTED THIS EVENT, and that is a
    lesson of its own. The suite covered checkout, subscriptions and
    payments — the important paths, tested well. "Did we cover the
    important paths" and "is there a path nothing touches" are DIFFERENT
    QUESTIONS with different answers, and only the second one finds a
    handler that has never run in its life. The inventory pin below asks
    the second.

    A trial invoice is used because that is what production sent: no
    number, no due_date, null tax, zero amounts.
    """
    session = RecordingSession()
    response = post_event(session, {"type": "invoice.created", "data": {"object": {
        "id": "in_TRIAL", "number": None, "customer": "cus_T",
        "amount_due": 0, "subtotal": 0, "total": 0, "tax": None,
        "currency": "usd", "status": "draft", "created": 1786000000,
        "period_start": 1786000000, "period_end": 1788592000,
        "due_date": None, "metadata": {},
        "lines": {"data": [{"description": "Trial", "quantity": 1, "amount": 0,
                            "price": {"unit_amount": None}}]},
    }}})
    assert response.status_code == 200, response.text
    assert statements_matching(session, "INSERT INTO invoices"), (
        "the handler returned 200 without inserting the invoice")


def test_no_bind_parameter_is_followed_by_a_postgres_cast():
    """THE CLASS, swept.

    `:name::type` cannot be parsed by SQLAlchemy's `text()`. It is a
    silent trap: it looks like ordinary Postgres, it passes review, and
    it fails only when the statement actually runs — which for a webhook
    handler nothing tested meant "in production, forever".

    `CAST(:name AS type)` is the same thing and unambiguous.
    """
    import re
    from pathlib import Path

    from tests.source_text import code_only

    backend = Path(__file__).resolve().parents[1]
    offenders = []
    for path in backend.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv"} & set(path.parts):
            continue
        src = code_only(path)
        for i, line in enumerate(src.splitlines(), start=1):
            if re.search(r":[a-z_][a-z_0-9]*::", line):
                offenders.append(f"{path.relative_to(backend)}:{i}")
    assert offenders == [], (
        "a bind parameter is followed by a Postgres cast, which "
        "SQLAlchemy's text() cannot parse — use CAST(:name AS type): "
        + ", ".join(offenders))


def test_every_webhook_event_the_handler_claims_is_actually_exercised():
    """THE SECOND QUESTION: is there a path nothing touches?

    `invoice.created` had never succeeded — a plain SQL syntax error,
    500 on every event since it was written — and it survived because no
    test ever posted one. The suite covered the important paths and
    covered them well. It never asked whether some path was covered by
    nothing at all.

    So: every event type this router branches on must appear in a test.
    A handler nobody has ever posted to is a handler nobody has ever
    seen run, and "it looks right" is the only evidence it has.
    """
    import re
    from pathlib import Path

    from tests.source_text import code_only

    backend = Path(__file__).resolve().parents[1]
    handler = code_only(backend / "phase23_billing" / "router_webhook.py")
    handled = set(re.findall(r'etype (?:==|in) \(?["\']([a-z_.]+)["\']', handler))
    handled |= set(re.findall(r'["\']([a-z_]+\.[a-z_.]+)["\']', handler)) & {
        "customer.subscription.created", "customer.subscription.updated",
        "customer.subscription.deleted"}

    # ANY quoted event string in a test file, not only a `"type": "..."`
    # literal. The first draft matched the literal alone and reported six
    # false positives — BILL1 posts through `_subscription_event("...")`
    # and the payment tests build theirs the same way. A detector that
    # only sees one spelling of a call is the same mistake as a
    # string-presence pin, arriving in the auditor rather than the code.
    posted = set()
    for path in backend.glob("tests/test_*.py"):
        src = path.read_text(encoding="utf-8")
        posted |= set(re.findall(r'["\']([a-z_]+\.[a-z_.]+)["\']', src))

    untested = sorted(handled - posted)
    assert untested == [], (
        "these webhook events are handled and NEVER posted by any test: "
        + ", ".join(untested) +
        " — a handler nothing has ever exercised is one whose only "
        "evidence is that it looks right, which is exactly how "
        "invoice.created ran broken for its entire life")


# ══════════════════════════════════════════════════════════════════════
# The three handlers the inventory pin found untouched
# ══════════════════════════════════════════════════════════════════════
#
# `invoice.created` had never succeeded and nothing noticed, because
# nothing had ever posted one. The inventory pin above asked which OTHER
# handlers were in that position and named three. These are them.
#
# Smoke tests deliberately: post a realistic event, assert it does not
# throw and that it writes what it claims to. That is the bar
# `invoice.created` failed for its entire life.

def test_invoice_payment_succeeded_runs():
    session = RecordingSession()
    r = post_event(session, {"type": "invoice.payment_succeeded", "data": {"object": {
        "id": "in_paid", "amount_paid": 9900, "total": 9900, "currency": "usd",
        "payment_intent": "pi_1",
    }}})
    assert r.status_code == 200, r.text
    assert statements_matching(session, "INSERT INTO payment_history")


def test_payment_intent_succeeded_runs():
    session = RecordingSession()
    r = post_event(session, {"type": "payment_intent.succeeded", "data": {"object": {
        "id": "pi_2", "amount": 9900, "currency": "usd",
        "payment_method_types": ["card"], "charges": {"data": [{"id": "ch_1"}]},
    }}})
    assert r.status_code == 200, r.text
    assert statements_matching(session, "INSERT INTO payment_history")


def test_charge_refunded_runs():
    session = RecordingSession()
    r = post_event(session, {"type": "charge.refunded", "data": {"object": {
        "id": "ch_1",
        "refunds": {"data": [{"amount": 9900, "reason": "requested_by_customer"}]},
    }}})
    assert r.status_code == 200, r.text
    assert statements_matching(session, "UPDATE payment_history")
