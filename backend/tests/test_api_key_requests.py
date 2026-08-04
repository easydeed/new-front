"""A3 — the API-access inquiry funnel is real.

What it replaces: a form whose submit was a two-second timeout followed by
a success screen promising a review within 24 hours. Nothing was sent,
nothing was stored, nobody could perform the review — the
fabricated-success class aimed at prospective customers.

The invariant that matters here: the request is STORED before the email
is attempted, and a failed email is recorded on the row rather than
swallowed. A lost notification must never lose a sales lead.
"""
import inspect
import os
from unittest.mock import patch

import pytest
from tests.source_text import code_only

LIVE_DB = os.getenv("DATABASE_URL")

REQUEST_BODY = {
    "company_name": "  Pacific Coast Escrow  ",
    "business_type": "title_company",
    "contact_name": "Dana Reyes",
    "email": "Dana@PacificCoastEscrow.example",
    "phone": "555-0100",
    "use_case": "Generating grant deeds at closing from our escrow platform.",
    "expected_volume": "100-500/mo",
    "integration_timeline": "this quarter",
    "current_software": "Qualia",
    "additional_info": "",
}


# ── Structural (CI-safe) ─────────────────────────────────────────────

def test_store_happens_before_notify():
    """Order is the guarantee: a request that cannot be emailed is still
    a request we have."""
    from routers import api_key_requests
    src = inspect.getsource(api_key_requests.create_api_key_request)
    assert src.index("INSERT INTO api_key_requests") < src.index("notify_api_key_request"), \
        "the email must not be attempted before the row exists"


def test_notification_failure_is_recorded_not_swallowed():
    from routers import api_key_requests
    src = inspect.getsource(api_key_requests.create_api_key_request)
    assert "notify_error" in src
    assert "email_error" in src, "the S1 reason must reach the response too"


def test_admin_queue_requires_admin():
    from routers.api_key_requests import list_api_key_requests, update_api_key_request
    for fn in (list_api_key_requests, update_api_key_request):
        src = inspect.getsource(fn)
        assert "get_current_admin" in src or "admin=Depends(get_current_admin)" in src


def test_request_table_is_in_the_schema_authority():
    from pathlib import Path
    schema = code_only(Path(__file__).resolve().parents[1] / "database.py")
    assert "CREATE TABLE IF NOT EXISTS api_key_requests" in schema


def test_the_ops_email_uses_the_one_transport():
    """ADMIN3: same deliberate correction as in test_email_system — this
    matched the literal transport call inside the sender, so it broke
    when a recording step was inserted in front of the transport without
    changing anything it meant to protect. The property is that this
    sender reaches the ONE transport; it now does so through the choke
    point, which is where the outcome gets persisted."""
    from utils import notifications
    src = inspect.getsource(notifications.notify_api_key_request)
    assert '_send("admin_api_key_request"' in src
    assert "send_email_with_reason" in inspect.getsource(notifications._send)


# ── End to end (live DB) ─────────────────────────────────────────────

@pytest.fixture
def client_and_token():
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    email = "funnel@apirequest.test"
    password = "Funnel!Passw0rd"
    import psycopg2
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("DELETE FROM api_key_requests WHERE email = %s", ("dana@pacificcoastescrow.example",))
        cur.execute("""DELETE FROM api_key_requests WHERE user_id IN
                       (SELECT id FROM users WHERE email = %s)""", (email,))
        cur.execute("""DELETE FROM user_profiles WHERE user_id IN
                       (SELECT id FROM users WHERE email = %s)""", (email,))
        cur.execute("DELETE FROM users WHERE email = %s", (email,))
    conn.close()
    client.post("/users/register", json={
        "email": email, "password": password, "confirm_password": password,
        "full_name": "Funnel Tester", "role": "escrow_officer", "state": "CA",
        "agree_terms": True,
    })
    token = client.post("/users/login", json={
        "email": email, "password": password}).json()["access_token"]
    return client, token


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_request_is_stored_and_owner_is_notified(client_and_token):
    client, token = client_and_token
    with patch("routers.api_key_requests.notify_api_key_request",
               return_value=(True, None)) as notify:
        res = client.post("/api-key-requests", json=REQUEST_BODY,
                          headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["email_sent"] is True
    assert body["request_id"] > 0
    # The user is told what actually happens — not a 24-hour promise.
    assert "reach out" in body["message"].lower()
    assert notify.called

    import psycopg2
    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("""SELECT company_name, email, status, notified_at, notify_error
                       FROM api_key_requests WHERE id = %s""", (body["request_id"],))
        row = cur.fetchone()
    conn.close()
    assert row is not None
    assert row[0] == "Pacific Coast Escrow"   # whitespace normalized
    assert row[1] == "dana@pacificcoastescrow.example"  # lowercased
    assert row[2] == "new"
    assert row[3] is not None
    assert row[4] is None


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_a_failed_email_still_keeps_the_request(client_and_token):
    """The whole point of storing first."""
    client, token = client_and_token
    with patch("routers.api_key_requests.notify_api_key_request",
               return_value=(False, "SENDGRID_API_KEY is not set in the environment")):
        res = client.post("/api-key-requests", json=REQUEST_BODY,
                          headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["email_sent"] is False
    assert "SENDGRID_API_KEY" in body["email_error"]

    import psycopg2
    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("SELECT notified_at, notify_error FROM api_key_requests WHERE id = %s",
                    (body["request_id"],))
        notified_at, notify_error = cur.fetchone()
    conn.close()
    assert notified_at is None
    assert "SENDGRID_API_KEY" in notify_error


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_the_queue_lists_it_for_an_admin_only(client_and_token):
    client, token = client_and_token
    with patch("routers.api_key_requests.notify_api_key_request", return_value=(True, None)):
        client.post("/api-key-requests", json=REQUEST_BODY,
                    headers={"Authorization": f"Bearer {token}"})

    # A non-admin cannot read the queue.
    assert client.get("/admin/api-key-requests",
                      headers={"Authorization": f"Bearer {token}"}).status_code == 403

    import psycopg2
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET role = 'admin' WHERE email = %s", ("funnel@apirequest.test",))
    conn.close()
    admin_token = client.post("/users/login", json={
        "email": "funnel@apirequest.test", "password": "Funnel!Passw0rd"}).json()["access_token"]

    listed = client.get("/admin/api-key-requests",
                        headers={"Authorization": f"Bearer {admin_token}"})
    assert listed.status_code == 200
    companies = [i["company_name"] for i in listed.json()["items"]]
    assert "Pacific Coast Escrow" in companies


# ── The public path (ruled after A4) ─────────────────────────────────

INQUIRY_BODY = {
    "company_name": "  Coastline Title  ",
    "email": "Ops@CoastlineTitle.example",
    "use_case": "Generating grant deeds at closing from our title platform.",
}


def test_public_inquiry_has_no_auth_dependency():
    """The developer docs are public; their call to action cannot lead to
    a login wall. A platform engineer must be able to start a
    conversation without first creating an account they may never use."""
    from routers.api_key_requests import create_api_key_inquiry
    sig = inspect.signature(create_api_key_inquiry)
    for param in sig.parameters.values():
        assert "Depends" not in str(param.default), \
            f"public inquiry gained an auth dependency: {param}"
    src = inspect.getsource(create_api_key_inquiry)
    assert "get_current_user_id" not in src


def test_public_inquiry_stores_before_notifying_too():
    from routers import api_key_requests
    src = inspect.getsource(api_key_requests.create_api_key_inquiry)
    assert src.index("INSERT INTO api_key_requests") < src.index("notify_api_key_request")


def test_public_inquiry_caps_field_lengths():
    """No captcha by ruling — the length caps and the email validator are
    the whole defence, so they must actually be there."""
    from routers.api_key_requests import ApiKeyInquiryIn
    fields = ApiKeyInquiryIn.model_fields
    assert any(getattr(m, "max_length", None) == 200 for m in fields["company_name"].metadata)
    assert any(getattr(m, "max_length", None) == 2000 for m in fields["use_case"].metadata)


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_anonymous_inquiry_is_stored_and_queued():
    from fastapi.testclient import TestClient
    from main import app
    import psycopg2

    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("DELETE FROM api_key_requests WHERE email = %s", ("ops@coastlinetitle.example",))
    conn.close()

    client = TestClient(app)
    with patch("routers.api_key_requests.notify_api_key_request",
               return_value=(True, None)) as notify:
        # No Authorization header at all.
        res = client.post("/api-key-inquiries", json=INQUIRY_BODY)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["email_sent"] is True
    assert "reach out" in body["message"].lower()
    assert notify.called

    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("""SELECT user_id, company_name, email, status
                       FROM api_key_requests WHERE id = %s""", (body["request_id"],))
        row = cur.fetchone()
    conn.close()
    assert row[0] is None            # anonymous — no account
    assert row[1] == "Coastline Title"
    assert row[2] == "ops@coastlinetitle.example"
    assert row[3] == "new"           # same queue as the authenticated form


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_anonymous_inquiry_survives_a_failed_email():
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    with patch("routers.api_key_requests.notify_api_key_request",
               return_value=(False, "SENDGRID_API_KEY is not set in the environment")):
        res = client.post("/api-key-inquiries", json=INQUIRY_BODY)
    assert res.status_code == 200
    assert res.json()["email_sent"] is False
    # An anonymous inquiry has no account to trace it back to, so losing
    # the row would lose the lead entirely.
    assert res.json()["request_id"] > 0
