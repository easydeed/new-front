"""P02: real HTTP refusals before render/persistence, with positive controls.

Auth is replaced only in this network-free boundary suite. Real-key/database
creation and no-artifact proofs live in test_api_v1_integration.
"""
from copy import deepcopy
from unittest.mock import AsyncMock, Mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from routers.api_v1 import router as api
from schemas.api_v1.deeds import CreateDeedRequest
from services.api_catalog import API_DEED_TYPES, rules_for
from services.required_fields import requirements


def payload(deed_type="grant_deed"):
    body = deepcopy(CreateDeedRequest.model_config["json_schema_extra"]["example"])
    body["deed_type"] = deed_type
    rule = rules_for(deed_type)
    if rule.fixed_vesting:
        body["grantee"].pop("vesting")
    if rule.required_entity_facts:
        body["grantor"]["entity"] = {
            "entity_state": "California", "partnership_type": "general partnership",
        }
    return body


REQUIRED_TEXT = [
    "property.address", "property.city", "property.zip",
    "property.county", "property.apn", "property.legal_description",
    "grantor.name", "grantee.name", "recording.requested_by",
    "recording.return_to.name", "recording.return_to.address",
    "recording.return_to.city", "recording.return_to.state", "recording.return_to.zip",
    "approver.name", "approver.role",
]


def change(body, path, value, *, omit=False):
    parts = path.split(".")
    parent = body
    for part in parts[:-1]:
        parent = parent[part]
    if omit:
        parent.pop(parts[-1])
    else:
        parent[parts[-1]] = value


@pytest.fixture
def boundary(monkeypatch):
    db = Mock(side_effect=AssertionError("invalid body reached persistence"))
    render = AsyncMock(side_effect=AssertionError("invalid body reached PDF rendering"))
    monkeypatch.setattr(api, "get_db_connection", db)
    monkeypatch.setattr(api, "render_pdf_async", render)
    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[api.get_api_key] = lambda: {"id": "synthetic-boundary-only"}
    with TestClient(app) as client:
        yield client, db, render


def assert_refused(boundary, body, field):
    client, db, render = boundary
    response = client.post("/api/v1/deeds", json=body)
    assert response.status_code == 422, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "VALIDATION_ERROR"
    assert any(item["field"] == "body." + field for item in detail["details"]), detail
    db.assert_not_called()
    render.assert_not_called()


def test_p02_held_tax_type_refuses_otherwise_usable_input(boundary):
    # Owner-approved scope: eight positive types plus an explicit refusal,
    # not an untested or silently skipped ninth rendering case.
    assert len(API_DEED_TYPES) == 8 and "tax_deed" not in API_DEED_TYPES
    assert_refused(boundary, payload("tax_deed"), "deed_type")


@pytest.mark.parametrize("deed_type", API_DEED_TYPES)
@pytest.mark.parametrize("path", REQUIRED_TEXT)
@pytest.mark.parametrize("case", ["absent", "empty", "whitespace", "null"])
def test_required_text_is_refused_before_side_effects(boundary, deed_type, path, case):
    body = payload(deed_type)
    value = {"absent": None, "empty": "", "whitespace": " \t\n\u00a0\u3000", "null": None}[case]
    change(body, path, value, omit=case == "absent")
    assert_refused(boundary, body, path)


@pytest.mark.parametrize("deed_type", API_DEED_TYPES)
def test_every_instrument_keeps_valid_unicode_values_and_lawful_optional_fields(deed_type):
    body = payload(deed_type)
    body["grantor"]["name"] = "  José María O’Neill / Société civile  "
    body["grantee"]["name"] = "Zoë García — Ελληνικά — 李明"
    body["approver"]["name"] = "Ольга Иванова"
    body["recording"]["return_to"].update(state="Québec", zip="H2X 1Y4", company="")
    body["grantor"]["address"] = {
        "line1": "1 Main Street", "line2": "", "city": "Montréal", "state": "QC", "zip": "H2X 1Y4",
    }
    body["recording"].update(title_order_no="", escrow_no=None)
    body["approver"]["email"] = None
    model = CreateDeedRequest.model_validate(body)
    for path in REQUIRED_TEXT:
        value = model
        for part in path.split("."):
            value = getattr(value, part)
        assert value
    assert model.grantor.name == body["grantor"]["name"]  # no silent normalization
    assert model.grantee.name == body["grantee"]["name"]


def test_shared_required_corpus_substance_is_covered_not_redeclared_as_legal_policy():
    aliases = {"grantor": "grantor.name", "grantee": "grantee.name",
               "legal_description": "property.legal_description"}
    for deed_type in API_DEED_TYPES:
        for requirement in requirements("deed", deed_type.replace("_", "-")):
            if requirement.population == "substance":
                assert aliases[requirement.field] in REQUIRED_TEXT


@pytest.mark.parametrize("deed_type", API_DEED_TYPES)
def test_instrument_specific_required_fields_keep_precise_refusals(boundary, deed_type):
    rule = rules_for(deed_type)
    paths = (["grantee.vesting"] if rule.requires_vesting else [])
    paths += ["grantor.entity." + name for name in rule.required_entity_facts]
    for path in paths:
        for value in (None, "", " \t\u00a0"):
            body = payload(deed_type)
            change(body, path, value)
            assert_refused(boundary, body, path)
        body = payload(deed_type)
        change(body, path, None, omit=True)
        assert_refused(boundary, body, path)


@pytest.mark.parametrize("path,limit", [
    ("property.city", 100), ("property.county", 100), ("property.apn", 50),
    ("grantor.name", 10000), ("grantee.name", 10000), ("approver.name", 10000),
    ("approver.role", 10000), ("recording.requested_by", 10000),
    ("recording.return_to.address", 10000), ("property.legal_description", 1000000),
])
def test_text_bounds_refuse_instead_of_truncating(boundary, path, limit):
    body = payload()
    change(body, path, "A" * limit)
    CreateDeedRequest.model_validate(body)
    change(body, path, "A" * (limit + 1))
    assert_refused(boundary, body, path)


def test_long_multiline_description_preserved_exactly():
    body = payload()
    description = ("LOT 7 — SUBJECT TO THE RECORDED EASEMENTS.\n" * 3000) + "END OF EXHIBIT A"
    body["property"]["legal_description"] = description
    assert CreateDeedRequest.model_validate(body).property.legal_description == description


@pytest.mark.parametrize("path", REQUIRED_TEXT)
def test_nul_text_fails_at_the_boundary_not_postgres(boundary, path):
    body = payload()
    change(body, path, "value\x00value")
    assert_refused(boundary, body, path)


@pytest.mark.parametrize("value", ["NaN", "Infinity", "-Infinity", "1e999", True, False])
def test_nonfinite_transfer_value_refused(boundary, value):
    body = payload()
    body["transfer_tax"]["value"] = value
    assert_refused(boundary, body, "transfer_tax.value")


@pytest.mark.parametrize("value", ["NaN", "Infinity", "1e10", "1,2.00", "1.001", "100000000.00", "not money"])
def test_unstorable_or_malformed_amount_refused_before_render(boundary, value):
    body = payload()
    body["transfer_tax"]["computed_amount"] = value
    assert_refused(boundary, body, "transfer_tax.computed_amount")


@pytest.mark.parametrize("value", [None, "", " ", "0", "0.00", "550.00", "$1,234.50", "99999999.99", "-1.00"])
def test_optional_amount_presence_and_tax_sign_policy_are_not_changed(value):
    body = payload()
    body["transfer_tax"]["computed_amount"] = value
    assert CreateDeedRequest.model_validate(body).transfer_tax.computed_amount == value


def test_p02_does_not_choose_or_require_a_new_tax_instruction():
    body = payload()
    body["transfer_tax"] = {"exempt": True, "value": 0}
    model = CreateDeedRequest.model_validate(body)
    assert model.transfer_tax.basis is None
    assert model.transfer_tax.exempt_code is None


def test_omitted_property_state_keeps_the_existing_ca_default():
    body = payload()
    body["property"].pop("state")
    assert CreateDeedRequest.model_validate(body).property.state == "CA"


def test_openapi_exposes_text_bounds_without_changing_routes():
    app = FastAPI()
    app.include_router(api.router)
    spec = TestClient(app).get("/api/v1/openapi.json").json()
    schemas = spec["components"]["schemas"]
    assert schemas["PropertyModel"]["properties"]["apn"]["maxLength"] == 50
    assert schemas["PropertyModel"]["properties"]["legal_description"]["maxLength"] == 1000000
    assert schemas["GrantorModel"]["properties"]["name"]["minLength"] == 1
    assert schemas["CreateDeedRequest"]["x-deedpro-validation-revision"] == "P02-2026-11-09"


@pytest.mark.parametrize("path", ["line1", "city", "state", "zip"])
@pytest.mark.parametrize("case", ["absent", "empty", "whitespace", "null"])
def test_optional_grantor_address_requires_usable_fields_only_when_present(boundary, path, case):
    body = payload()
    body["grantor"]["address"] = {
        "line1": "1 Main Street", "city": "Montréal", "state": "QC", "zip": "H2X 1Y4",
    }
    value = {"absent": None, "empty": "", "whitespace": " \t\u00a0", "null": None}[case]
    change(body, "grantor.address." + path, value, omit=case == "absent")
    assert_refused(boundary, body, "grantor.address." + path)


@pytest.mark.parametrize("field", ["value", "less_liens"])
@pytest.mark.parametrize("value", ["NaN", "Infinity", "-Infinity", "1e999", True, False])
def test_calculator_refuses_nonfinite_numbers_before_calculating(boundary, monkeypatch, field, value):
    compute = Mock(side_effect=AssertionError("invalid value reached calculation"))
    monkeypatch.setattr(api, "compute_dtt", compute)
    body = {"value": 500000, "less_liens": 0, "county": "Los Angeles"}
    body[field] = value
    response = boundary[0].post("/api/v1/transfer-tax/calculate", json=body)
    assert response.status_code == 422
    assert any(e["field"] == "body." + field for e in response.json()["detail"]["details"])
    compute.assert_not_called()


@pytest.mark.parametrize("case", ["absent", "empty", "whitespace", "null"])
def test_calculator_county_is_substantive(boundary, case):
    body = {"value": 500000, "county": "Los Angeles"}
    change(body, "county", {"absent": None, "empty": "", "whitespace": " \t\u00a0", "null": None}[case],
           omit=case == "absent")
    response = boundary[0].post("/api/v1/transfer-tax/calculate", json=body)
    assert response.status_code == 422
    assert any(e["field"] == "body.county" for e in response.json()["detail"]["details"])


def test_multiple_invalid_fields_report_their_actual_paths_without_echoing_values(boundary):
    body = payload()
    body["grantor"]["name"] = " \t"
    body["approver"]["role"] = " \n"
    body["property"]["apn"] = "A" * 51
    response = boundary[0].post("/api/v1/deeds", json=body)
    assert response.status_code == 422
    fields = {e["field"] for e in response.json()["detail"]["details"]}
    assert {"body.grantor.name", "body.approver.role", "body.property.apn"} <= fields
    assert "A" * 51 not in response.text


def test_presence_is_not_a_name_or_identity_verification(boundary):
    # A nonblank label is still only a caller's statement, not proof of a person.
    body = payload()
    body["approver"]["name"] = "Automated integration label 123"
    assert CreateDeedRequest.model_validate(body).approver.name == body["approver"]["name"]


def test_exemption_text_remains_an_optional_free_form_instruction():
    body = payload()
    text = "Officer supplied basis — référence libre — 非预设说明"
    body["transfer_tax"].update(exempt=True, exempt_code=text)
    assert CreateDeedRequest.model_validate(body).transfer_tax.exempt_code == text
