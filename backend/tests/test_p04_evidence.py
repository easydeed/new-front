"""P04 pure scheme tests: contact separation is not legal/identity clearance."""
from copy import deepcopy
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path

import pytest

from schemas.api_v1.deeds import CreateDeedRequest
from services import api_evidence as evidence
from services import api_contact_retention as retention
from utils.short_code import generate_content_hash


def model(email="dedicated-contact@example.invalid"):
    body = deepcopy(CreateDeedRequest.model_config["json_schema_extra"]["example"])
    body["approver"]["email"] = email
    return CreateDeedRequest.model_validate(body)


def row():
    snapshot = evidence.request_snapshot(model(), execution_date="November 10, 2026")
    return {"request_data": snapshot, "request_snapshot_version": evidence.SNAPSHOT_VERSION,
            "request_snapshot_sha256": evidence.digest(snapshot), "deed_id": "deed_synthetic",
            "document_id": "DOC-SYNTHETIC", "deed_type": "grant_deed",
            "approver_name": "  Named subject — 李明  ", "approver_role": "escrow officer"}


@pytest.mark.parametrize("email", [None, "", "  ", "dedicated-contact@example.invalid", "équipe@example.invalid"])
def test_new_snapshot_has_no_dedicated_contact(email):
    request = model(email)
    snapshot = evidence.request_snapshot(request, execution_date="November 10, 2026")
    assert "email" not in snapshot["approver"]
    assert request.approver.email == email  # compatibility input remains intact
    assert snapshot["_execution_date"] == "November 10, 2026"


def test_legal_facts_are_not_scrubbed_by_email_regex():
    request = model()
    request.grantor.name = "Name as entered — facts@example.invalid"
    snapshot = evidence.request_snapshot(request, execution_date="Pinned date")
    assert snapshot["grantor"]["name"] == request.grantor.name


def test_canonical_scheme_is_key_order_stable_but_preserves_raw_strings():
    assert evidence.digest({"a": 1, "b": 2}) == evidence.digest({"b": 2, "a": 1})
    assert evidence.digest({"name": " José "}) != evidence.digest({"name": "José"})
    assert "José" in evidence.canonical({"name": "José"})
    with pytest.raises(ValueError):
        evidence.digest({"value": float("nan")})


@pytest.mark.parametrize("tamper", ["hash", "version", "contact", "fact"])
def test_new_snapshot_integrity_is_checked(tamper):
    saved = row()
    if tamper == "hash":
        saved["request_snapshot_sha256"] = "0" * 64
    elif tamper == "version":
        saved["request_snapshot_version"] = "unknown"
    elif tamper == "contact":
        saved["request_data"]["approver"]["email"] = "forbidden@example.invalid"
        saved["request_snapshot_sha256"] = evidence.digest(saved["request_data"])
    else:
        saved["request_data"]["grantor"]["name"] = "Changed"
    with pytest.raises(ValueError):
        evidence.validate_snapshot(saved)


def test_approval_evidence_is_an_action_receipt_not_a_display_or_identity_claim():
    saved = row()
    receipt = evidence.approval_evidence(saved, pdf_sha256="a" * 64,
        approved_at=datetime(2026, 11, 10, tzinfo=timezone.utc), license_claimed="CLAIMED-123",
        client_digest_supplied=False, server_declarations=["Existing server statement"])
    assert receipt["claimed_approver"]["name"] == saved["approver_name"]
    assert receipt["claimed_approver"]["license_claimed"] == "CLAIMED-123"
    assert receipt["identity_verified"] is False and receipt["display_attested"] is False
    assert receipt["displayed_declaration"] is None
    assert receipt["client_pdf_digest_supplied"] is False
    assert receipt["server_artifact_declarations"] == ["Existing server statement"]
    assert "dedicated-contact@example.invalid" not in json.dumps(receipt)
    original = receipt["request_snapshot"]["grantor"]["name"]
    saved["request_data"]["grantor"]["name"] = "Changed later"
    assert receipt["request_snapshot"]["grantor"]["name"] == original


def test_legacy_projection_does_not_rewrite_or_reapprove_history():
    saved = row()
    saved["request_snapshot_version"] = None
    saved["request_data"]["approver"]["email"] = "legacy@example.invalid"
    before = deepcopy(saved)
    old_hash = generate_content_hash(json.dumps(saved["request_data"], default=str))
    plan = evidence.legacy_transition_plan(saved, legacy_content_hash=old_hash,
                                          prepared_at=datetime.now(timezone.utc))
    assert saved == before
    assert plan["original_content_hash"] == old_hash
    assert plan["original_hash_matches_current_serialization"] is True
    assert plan["original_hash_verifiable_from_redacted_snapshot"] is False
    assert plan["approval_event_created"] is False and plan["applied"] is False
    assert plan["requires_owner_batch_approval"] is True
    assert "email" not in plan["proposed_snapshot"]["approver"]
    mismatch = evidence.legacy_transition_plan(saved, legacy_content_hash="0" * 64,
                                               prepared_at=datetime.now(timezone.utc))
    assert mismatch["original_hash_matches_current_serialization"] is False


@pytest.mark.parametrize("fn", [evidence.utc, retention.event_now])
def test_no_naive_event_clock(fn):
    with pytest.raises(ValueError):
        fn(datetime(2026, 11, 10))


def test_operator_command_does_not_guess_a_database_or_accept_incomplete_write(monkeypatch, capsys):
    source = Path(__file__).resolve().parents[1] / "scripts/api_contact_review.py"
    spec = importlib.util.spec_from_file_location("p04_review", source)
    command = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(command)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert command.main([]) == 1
    assert "refusing to guess" in capsys.readouterr().err
    with pytest.raises(SystemExit) as result:
        command.main(["--hold", "synthetic", "--apply-hold"])
    assert result.value.code == 2


def test_contact_bearing_database_failure_is_not_returned_or_logged(monkeypatch, capsys, caplog):
    from unittest.mock import AsyncMock, Mock
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.api_v1 import router as api
    marker = "do-not-log-this-contact@example.invalid"
    cursor = Mock()
    cursor.execute.side_effect = RuntimeError("failing row includes " + marker)
    conn = Mock()
    conn.cursor.return_value = cursor
    monkeypatch.setattr(api, "get_db_connection", lambda: conn)
    monkeypatch.setattr(api.api_confirm_lifecycle, "sweep_if_due", lambda _: None)
    monkeypatch.setattr(api, "render_deed_html", lambda _: "synthetic")
    monkeypatch.setattr(api, "render_pdf_async", AsyncMock(return_value=b"synthetic"))
    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[api.get_api_key] = lambda: {"id": "synthetic", "scopes": ["deed:create"]}
    with TestClient(app) as client:
        response = client.post("/api/v1/deeds", json=model(marker).model_dump(mode="json"))
    assert response.status_code == 500
    output = capsys.readouterr()
    assert marker not in response.text + output.out + output.err + caplog.text
    assert "Draft creation failed" in response.text


def test_approval_database_failure_does_not_log_legacy_contact(monkeypatch, caplog, capsys):
    from unittest.mock import Mock
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers import api_confirm as api
    marker = "legacy-error-contact@example.invalid"
    saved = row()
    saved.update(status="pending_confirmation", preview_pdf_data=b"synthetic", demo_kind=None,
                 request_snapshot_version=None)
    saved["request_data"]["approver"]["email"] = marker
    cursor, conn = Mock(), Mock()
    cursor.execute.side_effect = RuntimeError("failing row includes " + marker)
    monkeypatch.setattr(api, "_load", lambda *_: (conn, cursor, saved))
    app = FastAPI()
    app.include_router(api.router)
    with TestClient(app) as client:
        response = client.post("/confirm/synthetic-token/approve")
    assert response.status_code == 500
    output = capsys.readouterr()
    assert marker not in response.text + output.out + output.err + caplog.text
    conn.rollback.assert_called_once()
