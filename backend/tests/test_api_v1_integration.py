"""A1 — the live-DB integration harness the partner API never had.

The whole reason /api/v1 shipped broken and stayed broken is that its only
tests (test_api_v1_render.py) exercise the render mapping in isolation and
never touch the HTTP + database layers — which is exactly where both
defects lived (auth read dict-rows as tuples → every key 401'd;
create referenced an unassigned `full_address` → every create 500'd). This
file drives the real app against a real Postgres, end to end:

    mint key (real admin endpoint) → create deed → download PDF → verify

plus the two guarantees A1 adds — idempotent retries and honest auth
failures. CI has no database, so the whole module skips without
DATABASE_URL, same contract as test_poisoned_connection.py.
"""
import os

import pytest

LIVE_DB = os.getenv("DATABASE_URL")
pytestmark = pytest.mark.skipif(not LIVE_DB, reason="live test DB required")

API_EMAIL = "apiharness@integration.test"
API_PASSWORD = "Harness!Passw0rd"


def _deed_request_body():
    return {
        "deed_type": "grant_deed",
        "property": {
            "address": "742 Evergreen Terrace", "city": "Springfield", "state": "CA",
            "zip": "90210", "county": "Los Angeles", "apn": "5551-234-007",
            "legal_description": "LOT 7, BLOCK 2, EVERGREEN TRACT 4412",
        },
        "grantor": {"name": "MARGARET T. SIMPSON"},
        "grantee": {"name": "ROBERT E. TERWILLIGER", "vesting": "a single man"},
        "transfer_tax": {
            "exempt": False, "value": 640000.0, "computed_amount": "704.00",
            "basis": "full_value", "city_tax": False,
        },
        "recording": {
            "requested_by": "Integration Escrow",
            "return_to": {"name": "ROBERT E. TERWILLIGER", "address": "742 Evergreen Terrace",
                          "city": "Springfield", "state": "CA", "zip": "90210"},
            "title_order_no": "TO-INT-1", "escrow_no": "ESC-INT-2",
        },
        "approver": {"name": "Jane Roe", "role": "escrow officer",
                     "email": "jane@integration.test"},
    }


@pytest.fixture(scope="module")
def client():
    from database import create_tables
    create_tables()  # H1: schema comes only from the one authority
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture(scope="module")
def admin_token(client):
    """Register a user, promote to admin via SQL (harness setup — NOT via
    the register endpoint's role field), and log in for an admin JWT."""
    import psycopg2
    client.post("/users/register", json={
        "email": API_EMAIL, "password": API_PASSWORD, "confirm_password": API_PASSWORD,
        "full_name": "API Harness", "job_title": "escrow_officer", "state": "CA", "agree_terms": True,
    })
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET role = 'admin' WHERE email = %s", (API_EMAIL,))
    conn.close()
    resp = client.post("/users/login", json={"email": API_EMAIL, "password": API_PASSWORD})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def api_key(client, admin_token):
    """Mint a live API key through the real admin endpoint — exercises the
    same key-creation path the admin UI (A3) will use."""
    resp = client.post("/admin/api-keys",
                       headers={"Authorization": f"Bearer {admin_token}"},
                       json={"name": "integration-harness", "is_test": True})
    assert resp.status_code == 200, resp.text
    key = resp.json()["api_key"]["key"]
    assert key.startswith("dp_test_")
    return key


def test_full_lifecycle_mint_create_confirm_download_verify(client, api_key):
    create = client.post("/api/v1/deeds", json=_deed_request_body(),
                         headers={"Authorization": f"Bearer {api_key}"})
    assert create.status_code == 200, create.text
    data = create.json()["data"]
    deed_id, document_id = data["deed_id"], data["document_id"]
    assert deed_id.startswith("deed_")
    assert document_id.startswith("DOC-")
    assert data["status"] == "pending_confirmation"
    assert data["urls"]["pdf"] is None
    assert data["urls"]["confirmation"]
    assert data["property"]["address"] == "742 Evergreen Terrace, Springfield, CA 90210"

    too_soon = client.get(f"/api/v1/deeds/{deed_id}/pdf",
                          headers={"Authorization": f"Bearer {api_key}"})
    assert too_soon.status_code == 409
    assert too_soon.json()["detail"]["code"] == "CONFIRMATION_REQUIRED"

    token = data["urls"]["confirmation"].rsplit("/", 1)[-1]
    preview = client.get(f"/confirm/{token}/preview")
    assert preview.status_code == 200
    assert preview.content[:5] == b"%PDF-"
    approved = client.post(f"/confirm/{token}/approve")
    assert approved.status_code == 200, approved.text

    pdf = client.get(f"/api/v1/deeds/{deed_id}/pdf",
                     headers={"Authorization": f"Bearer {api_key}"})
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.content[:5] == b"%PDF-"
    assert pdf.content == preview.content

    got = client.get(f"/api/v1/deeds/{deed_id}",
                     headers={"Authorization": f"Bearer {api_key}"})
    assert got.status_code == 200
    assert got.json()["data"]["status"] == "completed"

    verify = client.get(f"/api/v1/verify/{document_id}")
    assert verify.status_code == 200
    assert verify.json()["valid"] is True


def test_idempotent_create_returns_original_deed(client, api_key):
    body = _deed_request_body()
    headers = {"Authorization": f"Bearer {api_key}", "Idempotency-Key": "harness-fixed-key-001"}
    first = client.post("/api/v1/deeds", json=body, headers=headers)
    second = client.post("/api/v1/deeds", json=body, headers=headers)
    assert first.status_code == second.status_code == 200
    # Same key, same Idempotency-Key → the SAME deed, not a duplicate.
    assert first.json()["data"]["deed_id"] == second.json()["data"]["deed_id"]


def test_missing_key_is_401_not_500(client):
    resp = client.post("/api/v1/deeds", json=_deed_request_body(),
                       headers={"Authorization": "Bearer dp_live_nonexistentkey000"})
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == "UNAUTHORIZED"


def test_usage_is_metered(client, api_key):
    """Flag-3 ruling: metering from day one. Every authenticated call
    writes an api_usage_log row so pricing later prices from data."""
    import psycopg2
    from utils.api_keys import extract_key_prefix
    client.get("/api/v1/deeds", headers={"Authorization": f"Bearer {api_key}"})
    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM api_usage_log ul
            JOIN api_keys ak ON ak.id = ul.api_key_id
            WHERE ak.key_prefix = %s
        """, (extract_key_prefix(api_key),))
        count = cur.fetchone()[0]
    conn.close()
    assert count >= 1
