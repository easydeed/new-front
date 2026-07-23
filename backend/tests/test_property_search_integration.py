"""Property search suite, rewritten against the live SiteX contracts (T9-full).

Covers POST /api/property/search-v2 and POST /api/property/resolve-match by
mocking the sitex_service singleton (the endpoint's real collaborator).
"""
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app
from auth import get_current_user_id
from models.property_data import PropertyData, PropertyMatch, PropertySearchResult
from services.sitex_service import sitex_service

import pytest


@pytest.fixture(autouse=True)
def _auth_override():
    app.dependency_overrides[get_current_user_id] = lambda: "1"
    yield
    app.dependency_overrides.pop(get_current_user_id, None)


client = TestClient(app)


def sitex(result, configured=True):
    return patch.multiple(
        sitex_service,
        is_configured=lambda: configured,
        search_property=AsyncMock(return_value=result),
        search_by_fips_apn=AsyncMock(return_value=result),
    )


def make_success():
    return PropertySearchResult(
        status="success",
        data=PropertyData(
            address="123 Main St", city="Los Angeles", state="CA",
            zip_code="90001", apn="1234-567-890", county="Los Angeles",
            legal_description="LOT 1", owner_name="JOHN DOE",
        ),
        message="ok", match_count=1,
    )


def test_search_v2_success_passthrough():
    with sitex(make_success()):
        r = client.post("/api/property/search-v2", json={"address": "123 Main St", "city": "Los Angeles"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "success"
    assert body["data"]["apn"] == "1234-567-890"


def test_search_v2_multi_match_shape():
    result = PropertySearchResult(
        status="multi_match",
        matches=[PropertyMatch(address="1 A St", apn="1", fips="06037"),
                 PropertyMatch(address="2 B St", apn="2", fips="06037")],
        message="multiple", match_count=2,
    )
    with sitex(result):
        r = client.post("/api/property/search-v2", json={"address": "Main St"})
    body = r.json()
    assert body["status"] == "multi_match"
    assert body["match_count"] == 2
    assert len(body["matches"]) == 2
    assert body["data"] is None


def test_search_v2_not_found_passthrough():
    with sitex(PropertySearchResult(status="not_found", message="none", match_count=0)):
        r = client.post("/api/property/search-v2", json={"address": "nowhere"})
    assert r.json()["status"] == "not_found"


def test_search_v2_unconfigured_returns_error_status():
    with sitex(make_success(), configured=False):
        r = client.post("/api/property/search-v2", json={"address": "123 Main St"})
    body = r.json()
    assert body["status"] == "error"
    assert body["data"] is None


def test_search_v2_requires_address():
    r = client.post("/api/property/search-v2", json={"city": "LA"})
    assert r.status_code == 422


def test_resolve_match_passthrough():
    with sitex(make_success()):
        r = client.post("/api/property/resolve-match", json={"fips": "06037", "apn": "1234-567-890"})
    assert r.status_code == 200
    assert r.json()["status"] == "success"
