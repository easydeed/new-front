"""DX-BRUTAL — the public API fails in the shape its docs teach.

The first external evaluation called ``GET /api/v1/deeds`` without a key.
FastAPI returned its default 422 validation array, while the docs promised a
401 carrying ``detail.code`` and ``detail.message``. The published Node
client then threw ``undefined: undefined`` instead of the original reason.
"""

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.testclient import TestClient

from routers.api_v1.router import PublicAPIRoute, get_api_key, router


def _client(*, authenticated: bool = False) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    if authenticated:
        app.dependency_overrides[get_api_key] = lambda: {
            "id": "test-key",
            "rate_limit_hour": 100,
            "rate_limit_remaining": 99,
        }
    return TestClient(app)


def _assert_documented_error(response, *, status: int, code: str):
    assert response.status_code == status, response.text
    detail = response.json()["detail"]
    assert isinstance(detail, dict), detail
    assert detail["code"] == code
    assert isinstance(detail["message"], str) and detail["message"]


def test_missing_key_is_401_in_the_documented_envelope():
    response = _client().get("/api/v1/deeds")
    _assert_documented_error(response, status=401, code="UNAUTHORIZED")


def test_authentication_fails_before_an_invalid_body_is_considered():
    response = _client().post("/api/v1/deeds", json={})
    _assert_documented_error(response, status=401, code="UNAUTHORIZED")


def test_validation_errors_use_the_same_stable_envelope():
    response = _client(authenticated=True).post("/api/v1/deeds", json={})
    _assert_documented_error(response, status=422, code="VALIDATION_ERROR")
    details = response.json()["detail"]["details"]
    assert details
    assert all(set(item) == {"field", "message"} for item in details)
    assert any(item["field"] == "body.deed_type" for item in details)


def test_malformed_authorization_is_401_not_validation_error():
    response = _client().get(
        "/api/v1/deeds",
        headers={"Authorization": "Token not-a-bearer-key"},
    )
    _assert_documented_error(response, status=401, code="UNAUTHORIZED")


def test_auth_first_does_not_make_auth_optional_in_the_public_spec():
    spec = _client().get("/api/v1/openapi.json").json()
    assert spec["info"]["version"] == "1.0.0"
    assert all(path.startswith("/api/v1/") for path in spec["paths"])
    assert not any("/admin" in path for path in spec["paths"])
    schemes = spec["components"]["securitySchemes"]
    bearer_name = next(
        name for name, value in schemes.items()
        if value.get("type") == "http" and value.get("scheme") == "bearer"
    )
    assert {bearer_name: []} in spec["paths"]["/api/v1/deeds"]["get"]["security"]


def test_a_plain_http_exception_cannot_escape_as_a_fourth_shape():
    test_router = APIRouter(
        prefix="/api/v1",
        route_class=PublicAPIRoute,
    )

    @test_router.get("/plain-error")
    async def plain_error():
        raise HTTPException(status_code=400, detail="Bad request")

    app = FastAPI()
    app.include_router(test_router)
    response = TestClient(app).get("/api/v1/plain-error")
    _assert_documented_error(response, status=400, code="INVALID_REQUEST")


def test_an_unhandled_exception_uses_the_same_envelope_without_leaking_it():
    test_router = APIRouter(
        prefix="/api/v1",
        route_class=PublicAPIRoute,
    )

    @test_router.get("/crash")
    async def crash():
        raise RuntimeError("secret implementation detail")

    app = FastAPI()
    app.include_router(test_router)
    response = TestClient(app).get("/api/v1/crash")
    _assert_documented_error(response, status=500, code="INTERNAL_ERROR")
    assert "secret implementation detail" not in response.text
