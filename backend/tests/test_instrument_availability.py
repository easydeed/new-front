"""Owner-approved holds refuse new artifacts and preserve historical stored bytes."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, Mock
import asyncio

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from routers.api_v1 import router as api
from routers import api_confirm, deeds_crud, deeds_extra
from schemas.api_v1.deeds import CreateDeedRequest
from services.api_catalog import API_DEED_TYPES, REGISTERED_API_DEED_TYPES
from services.api_confirm import confirmation_package
from services.instrument_availability import POLICY, can_generate, hold_for

HELD_TYPES = ("tax-deed", "interspousal-transfer")
ALIASES = [variant for slug in HELD_TYPES
           for alias in [slug, *POLICY["held"][slug]["aliases"]]
           for variant in (alias, alias.replace("-", "_"), f" {alias.upper()} ")]
STORED = b"%PDF-1.4\nsynthetic previously stored bytes\n%%EOF"


def client_for(router):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[api.get_api_key] = lambda: {"id": "synthetic", "is_test": True}
    app.dependency_overrides[deeds_crud.get_current_user_id] = lambda: 7
    return TestClient(app)


@pytest.mark.parametrize("slug", ALIASES)
def test_public_api_refuses_held_type_before_deed_io(monkeypatch, slug):
    db = Mock(side_effect=AssertionError("deed DB reached"))
    render = AsyncMock(side_effect=AssertionError("renderer reached"))
    monkeypatch.setattr(api, "get_db_connection", db)
    monkeypatch.setattr(api, "render_pdf_async", render)
    body = deepcopy(CreateDeedRequest.model_config["json_schema_extra"]["example"])
    body["deed_type"] = slug
    response = client_for(api.router).post("/api/v1/deeds", json=body)
    assert response.status_code == 422, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "VALIDATION_ERROR"
    assert detail["details"][0]["field"] == "body.deed_type"
    assert hold_for(slug)["reason"] in detail["message"]
    db.assert_not_called()
    render.assert_not_called()


@pytest.mark.parametrize("slug", ALIASES)
def test_shared_pdf_pipeline_refuses_before_html_or_pdf_render(monkeypatch, slug):
    from services import deed_pdf
    html = Mock(side_effect=AssertionError("HTML render reached"))
    pdf = Mock(side_effect=AssertionError("PDF render reached"))
    monkeypatch.setattr(deed_pdf, "render_deed_html", html)
    monkeypatch.setattr(deed_pdf, "render_pdf", pdf)
    with pytest.raises(HTTPException) as refused:
        deed_pdf.render_deed_pdf({"deed_type": slug})
    assert refused.value.status_code == 409
    assert refused.value.detail["code"] == "INSTRUMENT_UNAVAILABLE"
    html.assert_not_called()
    pdf.assert_not_called()


@pytest.mark.parametrize("deed_type", HELD_TYPES)
def test_app_generation_refuses_before_saving(monkeypatch, deed_type):
    save = Mock(side_effect=AssertionError("save reached"))
    monkeypatch.setattr(deeds_crud, "create_deed", save)
    response = client_for(deeds_crud.router).post("/deeds", json={
        "deed_type": deed_type, "grantor_name": "SYNTHETIC SELLER", "grantee_name": "SYNTHETIC BUYER",
        "legal_description": "LOT 1", "vesting": "a single person", "dtt": {"basis": "full_value"},
    })
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "INSTRUMENT_UNAVAILABLE"
    save.assert_not_called()


@pytest.mark.parametrize("deed_type", HELD_TYPES)
def test_legacy_direct_generator_refuses_even_if_its_router_is_mounted(monkeypatch, deed_type):
    render = AsyncMock(side_effect=AssertionError("legacy renderer reached"))
    monkeypatch.setattr(deeds_extra, "_render_pdf", render)
    response = client_for(deeds_extra.router).post(f"/api/generate/{deed_type}-ca", json={})
    assert response.status_code == 409, response.text
    render.assert_not_called()


@pytest.mark.parametrize("deed_type", HELD_TYPES)
def test_internal_api_call_cannot_bypass_the_request_model(monkeypatch, deed_type):
    from types import SimpleNamespace
    db = Mock(side_effect=AssertionError("DB reached"))
    monkeypatch.setattr(api, "get_db_connection", db)
    with pytest.raises(HTTPException) as refused:
        asyncio.run(api.create_deed(Mock(), SimpleNamespace(deed_type=deed_type.replace("-", "_")), {}, None))
    assert refused.value.status_code == 409
    db.assert_not_called()


def test_capability_catalog_is_seven_active_types_and_preserves_registered_history(monkeypatch):
    assert len(API_DEED_TYPES) == 7
    assert len(REGISTERED_API_DEED_TYPES) == 9
    assert set(POLICY["held"]) == set(HELD_TYPES)
    assert all(can_generate(t) for t in API_DEED_TYPES)
    assert POLICY["held"]["tax-deed"]["reason"]
    from models.doc_types import get_document_types_registry
    monkeypatch.setenv("ENABLE_DEED_TYPES_EXTRA", "true")
    spec = client_for(api.router).get("/api/v1/openapi.json").json()
    for slug in HELD_TYPES:
        api_slug = slug.replace("-", "_")
        assert api_slug not in API_DEED_TYPES
        assert api_slug in REGISTERED_API_DEED_TYPES
        assert api_slug not in get_document_types_registry()
        assert api_slug not in spec["components"]["schemas"]["DeedType"]["enum"]


@pytest.mark.parametrize("deed_type", HELD_TYPES)
def test_existing_completed_api_pdf_is_still_streamed_byte_for_byte(monkeypatch, deed_type):
    conn = MagicMock()
    conn.cursor.return_value.fetchone.return_value = {
        "pdf_data": STORED, "document_id": "SYNTHETIC-HISTORICAL", "status": "completed",
    }
    monkeypatch.setattr(api, "get_db_connection", lambda: conn)
    response = client_for(api.router).get(f"/api/v1/deeds/historical-{deed_type}/pdf")
    assert response.status_code == 200
    assert response.content == STORED


@pytest.mark.parametrize("deed_type", HELD_TYPES)
def test_existing_completed_app_pdf_is_still_streamed_byte_for_byte(monkeypatch, deed_type):
    conn = MagicMock()
    deed_cursor, pdf_cursor = MagicMock(), MagicMock()
    deed_cursor.fetchone.return_value = {"id": 7, "status": "completed", "deed_type": deed_type}
    pdf_cursor.__enter__.return_value.fetchone.return_value = (STORED,)
    conn.cursor.side_effect = [deed_cursor, pdf_cursor]
    monkeypatch.setattr(deeds_crud.db, "conn", conn)
    response = client_for(deeds_crud.router).get("/deeds/7/download")
    assert response.status_code == 200
    assert response.content == STORED


def pending_held_row(deed_type):
    return {"deed_type": deed_type.replace("-", "_"), "status": "pending_confirmation", "confirmation_token": "synthetic",
            "confirmation_expires_at": datetime.now(timezone.utc) + timedelta(days=1), "preview_pdf_data": STORED}


@pytest.mark.parametrize("deed_type", HELD_TYPES)
def test_old_pending_held_preview_is_readable_but_cannot_be_promoted(monkeypatch, deed_type):
    row = pending_held_row(deed_type)
    pack = confirmation_package(row)
    assert not pack["can_approve"]
    assert pack["can_reject"]
    assert pack["preview_url"]
    conn, cursor = MagicMock(), MagicMock()
    monkeypatch.setattr(api_confirm, "_load", lambda *args: (conn, cursor, row))
    client = client_for(api_confirm.router)
    preview = client.get("/confirm/synthetic/preview")
    assert preview.status_code == 200
    assert preview.content == STORED
    refused = client.post("/confirm/synthetic/approve")
    assert refused.status_code == 409
    assert refused.json()["detail"]["code"] == "INSTRUMENT_UNAVAILABLE"
    cursor.execute.assert_not_called()
    conn.commit.assert_not_called()
