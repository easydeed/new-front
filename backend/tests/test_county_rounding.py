"""RND0: both languages consume one corpus, not two expected tax tables.

Fixtures assume the caller already supplied a taxable calculation base;
they do not select exemptions or decide county/municipal applicability.
"""
import json
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from services.dtt_rates import compute_dtt
from routers.api_v1 import router as api

CORPUS = json.loads((Path(__file__).parent / "fixtures/county_rounding_cases.json").read_text())


@pytest.mark.parametrize("case", CORPUS["cases"], ids=lambda c: c["id"])
def test_county_uses_each_500_unit_or_fraction(case):
    result = compute_dtt(float(case["base"]), None)
    assert f'{result["county_tax"]:.2f}' == case["county"]
    assert result["city_tax"] == 0
    assert result["total_tax"] == result["county_tax"]


def test_public_calculator_uses_the_corrected_county_result_without_db_or_pdf(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("calculation reached deed persistence or renderer")
    monkeypatch.setattr(api, "get_db_connection", forbidden)
    monkeypatch.setattr(api, "render_pdf_async", forbidden)
    app = FastAPI()
    app.include_router(api.router)
    app.dependency_overrides[api.get_api_key] = lambda: {"id": "synthetic-calculation", "scopes": ["tax:calculate"]}
    with TestClient(app) as client:
        response = client.post("/api/v1/transfer-tax/calculate", json={
            "value": 21100, "county": "Los Angeles", "less_liens": 0,
        })
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["county_tax"] == 23.65
    assert data["total_tax"] == 23.65
    assert data["breakdown"]["county"]["rate"] == "$0.55 per $500 or fraction"
    assert "does not decide taxability or exemptions" in data["disclaimer"]


def test_existing_zero_clamp_and_municipal_calculation_are_not_reclassified():
    assert compute_dtt(0, None)["county_tax"] == 0
    assert compute_dtt(-1, None)["county_tax"] == 0
    # Pin existing municipal arithmetic, not its legal/current-rate accuracy.
    result = compute_dtt(21100, "Pomona")
    assert result["county_tax"] == 23.65
    assert result["city_tax"] == 46.42
    assert result["total_tax"] == 70.07
    assert compute_dtt(500000, "Fresno")["city_rate_known"] is False
    assert compute_dtt(6000000, "Los Angeles")["city_tier_measure"]
