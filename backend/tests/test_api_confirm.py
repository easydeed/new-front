"""API-CONFIRM — Model 2 pins.

The partner POST returns a draft. A named human sees the rendered deed
and approves or rejects it. A stored PDF exists only after approval.
These tests hold the rulings: reject-with-reason, named-for-record,
break v1, 7-day expiry, render-once-promote, and the idempotency pin
that a rejected key is not resurrected.
"""
import inspect
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from services import api_confirm as confirm
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
LIVE_DB = os.getenv("DATABASE_URL")


def test_allowlist_is_exact_and_named():
    src = code_only(BACKEND / "services" / "api_confirm.py")
    assert "CONFIRM_KEYS = frozenset(" in src
    assert set(confirm.CONFIRM_KEYS) == {
        "deed_type", "expires_at", "state", "preview_url",
        "approver", "can_approve", "can_reject", "reject_reasons",
    }
    assert confirm.APPROVER_KEYS == frozenset({"name", "role"})
    assert "email" not in confirm.APPROVER_KEYS


def test_package_key_set_equality_and_no_extra_facts():
    row = {
        "deed_type": "grant_deed",
        "status": confirm.STATUS_PENDING,
        "confirmation_token": "tok_abc",
        "confirmation_expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "approver_name": "Jane Roe",
        "approver_role": "escrow officer",
        "approver_email": "jane@secret.test",
        "property_address": "MUST NOT APPEAR",
        "property_apn": "MUST NOT APPEAR",
        "request_data": {"secret": True},
    }
    package = confirm.confirmation_package(row)
    confirm.assert_package_keys(package)
    assert package["approver"] == {"name": "Jane Roe", "role": "escrow officer"}
    dumped = str(package)
    assert "jane@secret.test" not in dumped
    assert "MUST NOT APPEAR" not in dumped
    assert "secret" not in dumped


def test_expired_pending_row_is_reported_expired_without_a_write():
    row = {
        "deed_type": "grant_deed",
        "status": confirm.STATUS_PENDING,
        "confirmation_token": "tok",
        "confirmation_expires_at": datetime.now(timezone.utc) - timedelta(hours=1),
        "approver_name": "Jane",
        "approver_role": "officer",
    }
    package = confirm.confirmation_package(row)
    assert package["state"] == confirm.STATUS_EXPIRED
    assert package["can_approve"] is False
    assert package["can_reject"] is False
    assert package["preview_url"] is None


def test_expiry_is_seven_days_share_class():
    assert confirm.CONFIRM_EXPIRY_DAYS == 7
    start = datetime(2026, 8, 1, tzinfo=timezone.utc)
    assert confirm.expires_at(start) == start + timedelta(days=7)


def test_retention_number_is_imported_not_copied():
    from services.signing_loop import CONTACT_RETENTION_DAYS
    from services.api_confirm_lifecycle import purge_approver_email
    src = inspect.getsource(purge_approver_email)
    assert "CONTACT_RETENTION_DAYS" in src
    lifecycle = code_only(BACKEND / "services" / "api_confirm_lifecycle.py")
    assert "CONTACT_RETENTION_DAYS = " not in lifecycle
    assert CONTACT_RETENTION_DAYS == 90


def test_reject_requires_a_catalog_reason_or_comment():
    with pytest.raises(ValueError):
        confirm.normalize_rejection(issues=[], comment="")
    with pytest.raises(ValueError):
        confirm.normalize_rejection(issues=["not_a_reason"], comment="")
    text = confirm.normalize_rejection(issues=["apn"], comment="wrong parcel")
    assert "APN" in text
    assert "wrong parcel" in text


def test_approve_path_does_not_re_render():
    src = code_only(BACKEND / "routers" / "api_confirm.py")
    assert "render_pdf" not in src
    assert "render_deed_html" not in src
    assert "pdf_data = preview_pdf_data" in src


def test_create_does_not_write_a_stored_instrument():
    src = inspect.getsource(
        __import__("routers.api_v1.router", fromlist=["create_deed"]).create_deed)
    assert "STATUS_PENDING" in src
    assert "preview_pdf_data" in src
    assert "document_authenticity" not in src
    assert "pdf_bytes" not in src


def test_pdf_route_refuses_an_unapproved_draft():
    src = code_only(BACKEND / "routers" / "api_v1" / "router.py")
    assert "CONFIRMATION_REQUIRED" in src
    assert "409" in src


def test_confirm_surface_is_not_the_approve_route():
    src = code_only(BACKEND / "routers" / "api_confirm.py")
    assert "/confirm/{token}" in src
    assert "/approve/" not in src
    page = BACKEND.parent / "frontend" / "src" / "app" / "confirm" / "[token]" / "page.tsx"
    assert page.exists()


def test_schema_requires_a_named_approver():
    from pydantic import ValidationError
    from schemas.api_v1.deeds import CreateDeedRequest
    schema = CreateDeedRequest.model_json_schema()
    assert "approver" in schema["properties"]
    assert "approver" in schema.get("required", [])
    with pytest.raises(ValidationError):
        CreateDeedRequest(
            deed_type="grant_deed",
            property={"address": "1 A", "city": "X", "state": "CA", "zip": "90001",
                      "county": "Los Angeles", "apn": "1", "legal_description": "LOT 1"},
            grantor={"name": "G"},
            grantee={"name": "H", "vesting": "a single man"},
            transfer_tax={"exempt": False, "value": 1, "basis": "full_value"},
            recording={"requested_by": "E",
                       "return_to": {"name": "H", "address": "1", "city": "X",
                                     "state": "CA", "zip": "90001"}},
        )


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_rejected_idempotency_key_is_not_resurrected():
    from database import create_tables
    from fastapi.testclient import TestClient
    from main import app
    import psycopg2
    from utils.api_keys import extract_key_prefix

    create_tables()
    client = TestClient(app)
    email = "apiconfirm-reject@integration.test"
    client.post("/users/register", json={
        "email": email, "password": "Harness!Passw0rd",
        "confirm_password": "Harness!Passw0rd", "full_name": "Confirm",
        "job_title": "escrow_officer", "state": "CA", "agree_terms": True,
    })
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET role = 'admin' WHERE email = %s", (email,))
    conn.close()
    token = client.post("/users/login", json={
        "email": email, "password": "Harness!Passw0rd"}).json()["access_token"]
    key = client.post("/admin/api-keys",
                      headers={"Authorization": f"Bearer {token}"},
                      json={"name": "confirm-reject", "is_test": True}
                      ).json()["api_key"]["key"]
    body = {
        "deed_type": "grant_deed",
        "property": {
            "address": "1 Confirm Way", "city": "Los Angeles", "state": "CA",
            "zip": "90001", "county": "Los Angeles", "apn": "1-2-3",
            "legal_description": "LOT 1",
        },
        "grantor": {"name": "GRANTOR"},
        "grantee": {"name": "GRANTEE", "vesting": "a single man"},
        "transfer_tax": {"exempt": False, "value": 1000, "computed_amount": "1.10",
                         "basis": "full_value"},
        "recording": {
            "requested_by": "Escrow",
            "return_to": {"name": "GRANTEE", "address": "1 Confirm Way",
                          "city": "Los Angeles", "state": "CA", "zip": "90001"},
        },
        "approver": {"name": "Jane Roe", "role": "escrow officer"},
    }
    headers = {"Authorization": f"Bearer {key}", "Idempotency-Key": "reject-once"}
    first = client.post("/api/v1/deeds", json=body, headers=headers)
    assert first.status_code == 200, first.text
    confirm_url = first.json()["data"]["urls"]["confirmation"]
    ctoken = confirm_url.rsplit("/", 1)[-1]
    rejected = client.post(f"/confirm/{ctoken}/reject",
                           json={"issues": ["apn"], "comment": "wrong parcel"})
    assert rejected.status_code == 200, rejected.text

    replay = client.post("/api/v1/deeds", json=body, headers=headers)
    assert replay.status_code == 200
    assert replay.json()["data"]["deed_id"] == first.json()["data"]["deed_id"]
    assert replay.json()["data"]["status"] == "rejected"
    assert replay.json()["data"]["urls"]["pdf"] is None

    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM api_deeds ad
            JOIN api_keys ak ON ak.id = ad.api_key_id
            WHERE ak.key_prefix = %s AND ad.idempotency_key = %s
        """, (extract_key_prefix(key), "reject-once"))
        assert cur.fetchone()[0] == 1
    conn.close()
