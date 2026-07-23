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


def post_event(session, event):
    stripe_stub = MagicMock()
    stripe_stub.Webhook.construct_event.return_value = event
    with patch("phase23_billing.router_webhook.init_stripe", return_value=stripe_stub):
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
    assert len(statements_matching(session, "UPDATE subscriptions")) == 1
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
