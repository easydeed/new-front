"""Marked-disposable-DB P04 proofs. No production cleanup authorization."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from uuid import uuid4

import pytest

from services import api_evidence as evidence
from services import api_contact_retention as retention
from services import api_confirm_lifecycle as lifecycle
from tests.test_api_v1_integration import admin_token, api_key, _deed_request_body

LIVE_DB = os.getenv("DATABASE_URL")
pytestmark = pytest.mark.skipif(not LIVE_DB, reason="marked disposable DB required")
NOW = datetime(2020, 1, 1, tzinfo=timezone.utc)


@pytest.fixture(scope="module")
def p04_schema_ready():
    # Wait for the one authority already started by the session fixture.
    # Do not issue a second lock-taking convergence in the middle of a suite.
    import database
    import threading
    for worker in threading.enumerate():
        if worker.name == "schema-convergence":
            worker.join(30)
            if worker.is_alive():
                raise RuntimeError("P04 schema convergence did not finish")


@pytest.fixture(scope="module")
def client(p04_schema_ready):
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture
def records(p04_schema_ready):
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from services.db_identity import assert_scratch
    conn = psycopg2.connect(LIVE_DB, cursor_factory=RealDictCursor)
    assert_scratch(conn)
    ids = []

    def create(**overrides):
        deed_id = "deed_p04_" + uuid4().hex
        snapshot = {"approver": {"name": "Preserved subject", "role": "officer"}}
        values = {"deed_id": deed_id, "document_id": "P04-" + uuid4().hex[:12],
                  "deed_type": "grant_deed", "status": "completed",
                  "approved_at": NOW - timedelta(days=91), "rejected_at": None,
                  "confirmation_expires_at": None, "approver_name": "Preserved subject",
                  "approver_role": "officer", "approver_email": "unique-" + uuid4().hex + "@example.invalid",
                  "request_data": json.dumps(snapshot), "request_snapshot_version": evidence.SNAPSHOT_VERSION,
                  "request_snapshot_sha256": evidence.digest(snapshot), "retention_hold": False,
                  "pdf_data": b"synthetic-immutable-bytes", "preview_pdf_data": None,
                  "contact_purged_at": None, "demo_kind": None, "approval_evidence": None}
        values.update(overrides)
        with conn.cursor() as cur:
            cur.execute("INSERT INTO api_deeds (" + ",".join(values) + ") VALUES (" +
                        ",".join(["%s"] * len(values)) + ")", list(values.values()))
        conn.commit()
        ids.append(deed_id)
        return deed_id

    yield conn, create
    conn.rollback()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM api_contact_hold_events WHERE deed_id=ANY(%s)", (ids,))
        cur.execute("DELETE FROM api_deeds WHERE deed_id=ANY(%s)", (ids,))
    conn.commit()
    conn.close()


def stored(conn, deed_id):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM api_deeds WHERE deed_id=%s", (deed_id,))
        return cur.fetchone()


def test_new_contact_purge_preserves_evidence_and_is_idempotent(records):
    conn, create = records
    deed_id = create(contact_purged_at=NOW - timedelta(days=1))
    before = stored(conn, deed_id)
    assert lifecycle.purge_approver_email(conn, now=NOW) == 1
    after = stored(conn, deed_id)
    assert after["approver_email"] is None and after["contact_purged_at"] == NOW
    for field in ("request_data", "request_snapshot_sha256", "pdf_data", "approver_name", "approver_role"):
        assert after[field] == before[field]
    assert lifecycle.purge_approver_email(conn, now=NOW) == 0


@pytest.mark.parametrize("offset,expected", [(-1, True), (0, True), (1, False)])
@pytest.mark.parametrize("status", ["completed", "rejected", "expired"])
def test_exact_terminal_window_not_creation_time(records, offset, expected, status):
    conn, create = records
    event = NOW - timedelta(days=90) + timedelta(microseconds=offset)
    deed_id = create(status=status, approved_at=event if status == "completed" else None,
                     rejected_at=event if status == "rejected" else None,
                     confirmation_expires_at=event if status == "expired" else None)
    lifecycle.purge_approver_email(conn, now=NOW)
    assert (stored(conn, deed_id)["approver_email"] is None) is expected


def test_stamped_json_copy_stays_visible_and_is_not_auto_redacted(records):
    conn, create = records
    before_counts = retention.inventory(conn, now=NOW)
    raw = {"approver": {"name": "Preserved subject", "email": "stranded@example.invalid"}}
    deed_id = create(approver_email=None, request_data=json.dumps(raw), request_snapshot_version=None,
                     contact_purged_at=NOW - timedelta(days=1))
    assert lifecycle.purge_approver_email(conn, now=NOW) == 0
    counts = lifecycle.purge_status(conn, now=NOW)
    assert counts["json_contact_rows"] == before_counts["json_contact_rows"] + 1
    assert counts["overdue"] == before_counts["overdue"] + 1
    assert counts["stamped_contact_remaining"] == before_counts["stamped_contact_remaining"] + 1
    assert stored(conn, deed_id)["request_data"] == raw


def test_legacy_column_and_evidence_copy_are_review_not_automatic_cleanup(records):
    conn, create = records
    before = retention.inventory(conn, now=NOW)
    legacy = create(request_snapshot_version=None)
    stranded = create(approval_evidence=json.dumps({"request_snapshot": {"approver": {"email": "evidence-copy@example.invalid"}}}))
    assert retention.purge_new_contact(conn, now=NOW) == 0
    counts = retention.inventory(conn, now=NOW)
    assert counts["legacy_transition_required"] == before["legacy_transition_required"] + 2
    assert counts["evidence_contact_rows"] == before["evidence_contact_rows"] + 1
    assert stored(conn, legacy)["approver_email"] and stored(conn, stranded)["approver_email"]


def test_owner_hold_blocks_purge_and_release_is_audited(records):
    conn, create = records
    deed_id = create()
    assert retention.set_retention_hold(conn, deed_id, held=True, operator_claim="owner-1", case_reference="CASE-1", now=NOW)
    assert not retention.set_retention_hold(conn, deed_id, held=True, operator_claim="owner-1", case_reference="CASE-1", now=NOW)
    assert retention.purge_new_contact(conn, now=NOW) == 0
    assert stored(conn, deed_id)["approver_email"]
    assert retention.set_retention_hold(conn, deed_id, held=False, operator_claim="owner-1", case_reference="CASE-1", now=NOW)
    assert retention.purge_new_contact(conn, now=NOW) == 1
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM api_contact_hold_events WHERE deed_id=%s", (deed_id,))
        assert cur.fetchone()["n"] == 2


def test_hold_preserves_expired_preview_and_marked_demo_bytes(records):
    conn, create = records
    deed_id = create(status="pending_confirmation", approved_at=None, retention_hold=True,
                     confirmation_expires_at=NOW - timedelta(days=1), preview_pdf_data=b"preview",
                     demo_kind="try")
    with conn.cursor() as cur:
        cur.execute("UPDATE api_deeds SET created_at=%s WHERE deed_id=%s", (NOW - timedelta(days=1), deed_id))
    lifecycle.expire_unapproved_drafts(conn, now=NOW)
    lifecycle.delete_demo_drafts(conn, now=NOW)
    assert bytes(stored(conn, deed_id)["preview_pdf_data"]) == b"preview"


def test_unknown_or_contradictory_clock_is_not_guessed(records):
    conn, create = records
    before = retention.inventory(conn, now=NOW)
    missing = create(approved_at=None)
    conflict = create(rejected_at=NOW - timedelta(days=91))
    assert retention.purge_new_contact(conn, now=NOW) == 0
    counts = retention.inventory(conn, now=NOW)
    assert counts["unknown_clock_rows"] == before["unknown_clock_rows"] + 2
    assert stored(conn, missing)["approver_email"] and stored(conn, conflict)["approver_email"]


def test_restored_contact_snapshot_cannot_release_serving(records):
    conn, create = records
    marker = "restored-copy@example.invalid"
    create(approver_email=None, request_snapshot_version=None,
           request_data=json.dumps({"approver": {"email": marker}}))
    review = retention.restore_review(conn, now=NOW)
    assert review["technical_contact_checks_passed"] is False
    assert review["ready_for_serving"] is False
    assert review["requires_owner_backup_and_hold_reconciliation"] is True
    assert marker not in json.dumps(review)


def test_new_api_roundtrip_keeps_email_once_and_binds_approval_without_rewriting_pdf(client, api_key):
    import psycopg2
    from psycopg2.extras import RealDictCursor
    marker = "roundtrip-" + uuid4().hex + "@example.invalid"
    body = _deed_request_body()
    body["approver"]["email"] = marker
    body["retention_hold"] = True
    body["approval_evidence"] = {"email": marker}
    headers = {"Authorization": f"Bearer {api_key}", "Idempotency-Key": uuid4().hex}
    first = client.post("/api/v1/deeds", json=body, headers=headers)
    assert first.status_code == 200, first.text
    data = first.json()["data"]
    token = data["urls"]["confirmation"].rsplit("/", 1)[-1]
    preview = client.get(f"/confirm/{token}/preview")
    approved = client.post(f"/confirm/{token}/approve", json={"license": "CLAIM-123"})
    assert approved.status_code == 200, approved.text
    artifact = client.get(f"/confirm/{token}/artifact")
    assert artifact.status_code == 200 and marker not in artifact.text
    conn = psycopg2.connect(LIVE_DB, cursor_factory=RealDictCursor)
    try:
        row = stored(conn, data["deed_id"])
        assert row["approver_email"] == marker
        assert row["retention_hold"] is False  # callers cannot set owner controls
        assert marker not in json.dumps(row["request_data"])
        assert marker not in json.dumps(row["approval_evidence"])
        assert row["approval_evidence_sha256"] == evidence.digest(row["approval_evidence"])
        assert row["request_snapshot_sha256"] == evidence.digest(row["request_data"])
        assert row["approval_evidence"]["pdf_sha256"] == hashlib.sha256(preview.content).hexdigest()
        assert bytes(row["pdf_data"]) == preview.content
        original_receipt = deepcopy(row["approval_evidence"])
        retention.purge_new_contact(conn, now=row["approved_at"] + timedelta(days=90))
        conn.commit()
        after = stored(conn, data["deed_id"])
        assert after["approver_email"] is None
        assert after["approval_evidence"] == original_receipt and bytes(after["pdf_data"]) == preview.content
        replay = client.post("/api/v1/deeds", json=body, headers=headers)
        got = client.get(f"/api/v1/deeds/{data['deed_id']}", headers=headers)
        assert replay.status_code == got.status_code == 200
        assert replay.json()["data"]["deed_id"] == data["deed_id"]
    finally:
        conn.close()


def test_api_rejects_tampered_new_snapshot_without_promotion(client, api_key):
    import psycopg2
    from psycopg2.extras import RealDictCursor
    first = client.post("/api/v1/deeds", json=_deed_request_body(), headers={"Authorization": f"Bearer {api_key}"})
    assert first.status_code == 200, first.text
    data = first.json()["data"]
    token = data["urls"]["confirmation"].rsplit("/", 1)[-1]
    with psycopg2.connect(LIVE_DB, cursor_factory=RealDictCursor) as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE api_deeds SET request_data=jsonb_set(request_data,'{grantor,name}', '\"Tampered\"'::jsonb) WHERE deed_id=%s", (data["deed_id"],))
    response = client.post(f"/confirm/{token}/approve")
    assert response.status_code == 409 and response.json()["detail"]["code"] == "EVIDENCE_INTEGRITY"
    with psycopg2.connect(LIVE_DB, cursor_factory=RealDictCursor) as conn:
        row = stored(conn, data["deed_id"])
        assert row["status"] == "pending_confirmation" and row["pdf_data"] is None
        assert row["approval_evidence"] is None


def test_owner_command_requires_exact_database_and_never_releases_restore(records, capsys):
    from scripts.api_contact_review import main
    conn, create = records
    deed_id = create()
    marker = stored(conn, deed_id)["approver_email"]
    db_name = conn.info.dbname
    args = ["--hold", deed_id, "--apply-hold", "--operator", "owner-1",
            "--case-reference", "CASE-CLI", "--confirm-database", db_name]
    assert main(args) == 0
    assert stored(conn, deed_id)["retention_hold"] is True
    assert main(["--restore-review"]) == 2
    assert marker not in capsys.readouterr().out
    assert main([*args[:-1], "wrong-database"]) == 1
    assert main(["--release-hold", deed_id, "--apply-hold", "--operator", "owner-1",
                 "--case-reference", "CASE-CLI", "--confirm-database", db_name]) == 0
    assert stored(conn, deed_id)["retention_hold"] is False


def test_lifecycle_job_runs_without_http_requests_and_throttles_its_own_window(records):
    conn, create = records
    deed_id = create()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM system_jobs WHERE job_name=%s", (lifecycle.JOB_NAME,))
    conn.commit()
    result = lifecycle.sweep_if_due(conn, now=NOW)
    assert result["emails_purged"] == 1
    assert stored(conn, deed_id)["approver_email"] is None
    assert lifecycle.sweep_if_due(conn, now=NOW + timedelta(minutes=1)) is None
    assert lifecycle.sweep_if_due(conn, now=NOW + timedelta(hours=1))["emails_purged"] == 0


def test_existing_purge_command_status_and_dry_run_use_the_real_identity_guard(records, monkeypatch, capsys):
    from scripts import purge_api_confirm
    conn, create = records
    marker = stored(conn, create())["approver_email"]
    for flag in ("--status", "--dry-run"):
        monkeypatch.setattr("sys.argv", ["purge_api_confirm.py", flag])
        assert purge_api_confirm.main() == 0
    assert marker not in capsys.readouterr().out


@pytest.mark.parametrize("payload", [json.dumps({"approver": {"email": "encoded@example.invalid"}}),
                                    {"approver": "encoded@example.invalid"}])
def test_unclassified_old_snapshot_is_review_not_a_false_clean_result(records, payload):
    conn, create = records
    before = retention.inventory(conn, now=NOW)
    deed_id = create(approver_email=None, request_data=json.dumps(payload), request_snapshot_version=None)
    assert retention.purge_new_contact(conn, now=NOW) == 0
    report = retention.restore_review(conn, now=NOW)
    assert report["counts"]["unclassified_snapshot_rows"] == before["unclassified_snapshot_rows"] + 1
    assert report["technical_contact_checks_passed"] is False
    assert stored(conn, deed_id)["request_data"] == payload


@pytest.mark.parametrize("payload", [{"request_snapshot": {"approver": "encoded@example.invalid"}},
                                    {"claimed_approver": "encoded@example.invalid"}])
def test_unclassified_evidence_copy_blocks_contact_cleanup_and_restore_review(records, payload):
    conn, create = records
    before = retention.inventory(conn, now=NOW)
    deed_id = create(approval_evidence=json.dumps(payload))
    assert retention.purge_new_contact(conn, now=NOW) == 0
    report = retention.restore_review(conn, now=NOW)
    assert report["counts"]["unclassified_snapshot_rows"] == before["unclassified_snapshot_rows"] + 1
    assert report["technical_contact_checks_passed"] is False
    assert stored(conn, deed_id)["approver_email"] is not None
