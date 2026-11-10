"""Prepared contract only. No approved county wording or v2 generation."""
from datetime import datetime, timezone, timedelta
import importlib
import json
from unittest.mock import AsyncMock, Mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from routers.api_v2 import router as v2
from schemas.api_v2.deeds import PrepareDeedRequest
from services import tax_instructions, tax_profiles
from services.api_catalog import API_DEED_TYPES
from services.tax_instruction_evidence import instruction_receipt
from tests.test_api_input_validation import payload as v1_payload, change


def payload(deed_type="grant_deed"):
    body = v1_payload(deed_type)
    body["transfer_tax"] = {
        "profile_id": "synthetic-not-approved",
        "location": "city", "city_name": body["property"]["city"],
        "county": {"mode": "tax_due", "amount": "825.00", "basis": "full_value"},
        "city": {"mode": "no_tax_due", "amount": "0.00", "grounds": "Synthetic professional instruction, not a legal example"},
        "total_amount": "825.00",
    }
    return body


@pytest.fixture
def boundary(monkeypatch):
    legacy = importlib.import_module("routers.api_v1.router")
    db = Mock(side_effect=AssertionError("v2 preparation reached deed persistence"))
    render = AsyncMock(side_effect=AssertionError("v2 preparation reached renderer"))
    monkeypatch.setattr(legacy, "get_db_connection", db)
    monkeypatch.setattr(legacy, "render_pdf_async", render)
    app = FastAPI()
    app.include_router(v2.router)
    app.dependency_overrides[v2.get_api_key] = lambda: {"id": "synthetic-only"}
    with TestClient(app) as client:
        yield client, db, render
    db.assert_not_called()
    render.assert_not_called()


def refused(boundary, body, field):
    response = boundary[0].post("/api/v2/deeds", json=body)
    assert response.status_code == 422, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "VALIDATION_ERROR"
    assert any(d["field"] == "body." + field for d in detail["details"]), detail


@pytest.mark.parametrize("deed_type", API_DEED_TYPES)
def test_all_seven_structural_controls_are_profile_held(boundary, deed_type):
    body = payload(deed_type)
    model = PrepareDeedRequest.model_validate(body)
    assert model.transfer_tax.county.basis.value == "full_value"
    response = boundary[0].post("/api/v2/deeds", json=body)
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "TAX_PROFILE_REVIEW_REQUIRED"
    assert "data" not in response.json()


@pytest.mark.parametrize("deed_type", ["interspousal_transfer", "tax_deed"])
def test_instrument_holds_are_inherited(boundary, deed_type):
    refused(boundary, payload(deed_type), "deed_type")


def test_missing_tax_due_basis_is_refused(boundary):
    body = payload()
    body["transfer_tax"]["county"].pop("basis")
    refused(boundary, body, "transfer_tax.county.basis")


@pytest.mark.parametrize("path", [
    "transfer_tax.profile_id", "transfer_tax.location", "transfer_tax.county",
    "transfer_tax.county.mode", "transfer_tax.county.amount",
    "transfer_tax.county.basis", "transfer_tax.city", "transfer_tax.city_name",
    "transfer_tax.city.grounds", "transfer_tax.total_amount", "property.state",
])
@pytest.mark.parametrize("case", ["missing", "null", "blank"])
def test_missing_decisions_are_never_defaulted(boundary, path, case):
    body = payload()
    change(body, path, None if case != "blank" else " \t\u00a0", omit=case == "missing")
    refused(boundary, body, path)


@pytest.mark.parametrize("amount", ["-0", "-0.00", "$-0.00", "-1.00", "", " ", "NaN", "Infinity", "1.001", "100000000.00", "1,00.00", "0\x00", True, 0])
@pytest.mark.parametrize("component", ["county", "city", "total_amount"])
def test_amount_syntax_and_negative_presentations_refuse(boundary, amount, component):
    path = "transfer_tax." + component + (".amount" if component != "total_amount" else "")
    body = payload()
    change(body, path, amount)
    refused(boundary, body, path)


@pytest.mark.parametrize("amount", ["0", "0.00", "$0.00", "+0.00"])
def test_zero_is_preserved_but_requires_a_no_tax_instruction(boundary, amount):
    body = payload()
    body["transfer_tax"]["county"] = {"mode": "no_tax_due", "amount": amount, "grounds": "  Faits fournis — 李明  "}
    body["transfer_tax"]["total_amount"] = amount
    model = PrepareDeedRequest.model_validate(body)
    assert model.transfer_tax.county.amount == amount
    assert model.transfer_tax.county.grounds == "  Faits fournis — 李明  "
    assert boundary[0].post("/api/v2/deeds", json=body).status_code == 409
    body["transfer_tax"]["county"]["mode"] = "tax_due"
    refused(boundary, body, "transfer_tax.county.amount")


@pytest.mark.parametrize("mode", ["no_tax_due", "statutory_exemption"])
@pytest.mark.parametrize("field,value", [("amount", "1.00"), ("basis", "full_value"), ("basis", None), ("supporting_loan", {"balance": "0"})])
def test_no_tax_contradictions_are_refused_not_discarded(boundary, mode, field, value):
    body = payload()
    component = {"mode": mode, "amount": "0.00", "grounds": "Synthetic grounds"}
    if mode == "statutory_exemption":
        component["citation"] = "Professional's citation — not verified"
    component[field] = value
    body["transfer_tax"]["county"] = component
    body["transfer_tax"]["total_amount"] = "0.00"
    refused(boundary, body, "transfer_tax.county." + field)


@pytest.mark.parametrize("field,value", [("grounds", "Synthetic"), ("citation", "anything"), ("grounds", None), ("supporting_loan", {"balance": "1"})])
def test_tax_due_refuses_incompatible_fields(boundary, field, value):
    body = payload()
    body["transfer_tax"]["county"][field] = value
    refused(boundary, body, "transfer_tax.county." + field)


def test_less_liens_preserves_support_without_inventing_county_requirements():
    body = payload()
    component = body["transfer_tax"]["county"]
    component.update(basis="less_liens", supporting_loan={"balance": "$1,000.00", "recording_reference": "  Loan reference supplied  "})
    model = PrepareDeedRequest.model_validate(body)
    assert model.transfer_tax.county.supporting_loan.model_dump() == component["supporting_loan"]
    assert model.transfer_tax.county.amount == "825.00"  # no subtraction/recalculation
    component["supporting_loan"] = {}
    with pytest.raises(ValidationError):
        PrepareDeedRequest.model_validate(body)


def test_statutory_claim_requires_citation_but_does_not_certify_its_contents(boundary):
    body = payload()
    body["transfer_tax"]["county"] = {"mode": "statutory_exemption", "amount": "0", "grounds": "Synthetic grounds"}
    body["transfer_tax"]["total_amount"] = "0.00"
    refused(boundary, body, "transfer_tax.county.citation")
    body["transfer_tax"]["county"]["citation"] = "Unverified professional citation, not a recommended code"
    assert boundary[0].post("/api/v2/deeds", json=body).json()["detail"]["code"] == "TAX_PROFILE_REVIEW_REQUIRED"
    body["transfer_tax"]["county"]["mode"] = "no_tax_due"
    refused(boundary, body, "transfer_tax.county.citation")


def test_mixed_components_and_exact_decimal_total(boundary):
    body = payload()
    body["transfer_tax"]["county"] = {"mode": "statutory_exemption", "amount": "0.00", "grounds": "Synthetic county grounds", "citation": "Unverified citation"}
    body["transfer_tax"]["city"] = {"mode": "tax_due", "amount": "0.10", "basis": "less_liens"}
    body["transfer_tax"]["total_amount"] = "0.10"
    assert boundary[0].post("/api/v2/deeds", json=body).status_code == 409
    body["transfer_tax"]["county"] = {"mode": "tax_due", "amount": "0.20", "basis": "full_value"}
    body["transfer_tax"]["total_amount"] = "0.30"
    PrepareDeedRequest.model_validate(body)
    body["transfer_tax"]["total_amount"] = "0.31"
    refused(boundary, body, "transfer_tax.total_amount")


@pytest.mark.parametrize("field,value", [("city_name", "Santa Monica"), ("location", "unknown")])
def test_city_conflicts_are_not_silently_chosen(boundary, field, value):
    body = payload()
    body["transfer_tax"][field] = value
    refused(boundary, body, "transfer_tax." + field)


@pytest.mark.parametrize("field", ["city", "city_name"])
def test_unincorporated_forbids_city_fields_even_null(boundary, field):
    body = payload()
    body["transfer_tax"]["location"] = "unincorporated"
    body["transfer_tax"].pop("city")
    body["transfer_tax"].pop("city_name")
    PrepareDeedRequest.model_validate(body)
    body["transfer_tax"][field] = None
    refused(boundary, body, "transfer_tax." + field)


@pytest.mark.parametrize("field", ["exempt", "computed_amount", "city_tax", "approved", "profile_enabled"])
def test_v1_tax_fields_and_client_approval_switches_are_not_dropped(boundary, field):
    body = payload()
    body["transfer_tax"][field] = True
    refused(boundary, body, "transfer_tax." + field)


def test_profile_guard_mutation_is_detectable_and_release_guard_still_holds(boundary, monkeypatch):
    monkeypatch.setattr(tax_profiles, "require_reviewed_profile", lambda _: None)
    response = boundary[0].post("/api/v2/deeds", json=payload())
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "V2_RELEASE_REVIEW_REQUIRED"


def test_registry_is_empty_and_environment_cannot_enable_it(monkeypatch):
    monkeypatch.setenv("DEEDPRO_TAX_PROFILES_ENABLED", "true")
    monkeypatch.setenv("DEEDPRO_V2_ENABLED", "true")
    assert tax_profiles.disabled_registry()["profiles"] == {}


@pytest.mark.parametrize("contents", ["not json", "[]", '{}', '{"profiles":{"Los Angeles":{"approved":true}}}',
    '{"contract_version":"P03-v2-preparation-2026-11-10","release_state":"domain_review_required","profiles":{},"enabled":true}'])
def test_modified_or_malformed_registry_fails_closed(tmp_path, monkeypatch, contents):
    file = tmp_path / "profiles.json"
    file.write_text(contents, encoding="utf-8")
    monkeypatch.setattr(tax_profiles, "REGISTRY_PATH", file)
    with pytest.raises((ValueError, RuntimeError)):
        tax_profiles.require_reviewed_profile("anything")


def test_capabilities_and_candidate_schema_do_not_advertise_generation(boundary):
    client = boundary[0]
    caps = client.get("/api/v2/capabilities").json()
    assert caps["generation_enabled"] is False and caps["approved_tax_profiles"] == []
    post = client.get("/openapi.json").json()["paths"]["/api/v2/deeds"]["post"]
    assert "200" not in post["responses"] and "201" not in post["responses"]
    assert set(post["responses"]) == {"409", "422"}
    from main import app
    assert not any(getattr(r, "path", "").startswith("/api/v2") for r in app.routes)


def test_receipt_preserves_raw_instructions_without_contact_or_approval():
    body = payload()
    body["transfer_tax"]["county"]["amount"] = "  $825.00  "
    body["approver"]["email"] = "purgeable-contact@example.test"
    model = PrepareDeedRequest.model_validate(body)
    when = datetime(2026, 11, 10, 12, 0, tzinfo=timezone(timedelta(hours=-8)))
    receipt = instruction_receipt(model, received_at=when)
    assert receipt["original_instructions"] == body["transfer_tax"]
    assert receipt["received_at"] == "2026-11-10T20:00:00+00:00"
    assert receipt["claimed_actor"] == {"name": body["approver"]["name"], "role": body["approver"]["role"]}
    assert receipt["identity_verified"] is False
    for field in ("approval", "preview_sha256", "displayed_declaration", "reviewed_profile_version"):
        assert receipt[field] is None
    assert body["approver"]["email"] not in json.dumps(receipt)
    original_hash = receipt["instruction_sha256"]
    model.transfer_tax.county.amount = "825.00"
    assert receipt["original_instructions"]["county"]["amount"] == "  $825.00  "
    assert instruction_receipt(model, received_at=when)["instruction_sha256"] != original_hash
    with pytest.raises(ValueError):
        instruction_receipt(model, received_at=when.replace(tzinfo=None))
