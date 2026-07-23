"""API resilience suite, rewritten against current contracts (T9-full)."""
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_check_endpoint():
    r = client.get("/health")
    assert r.status_code == 200


def test_api_documentation_availability():
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_protected_endpoints_reject_missing_token():
    # No Authorization header -> HTTPBearer rejects before any DB access.
    assert client.get("/deeds").status_code in (401, 403)
    assert client.get("/deeds/1/download").status_code in (401, 403)
    assert client.post("/deeds", json={}).status_code in (401, 403)
    assert client.get("/admin/dashboard").status_code in (401, 403)


def test_unknown_route_is_404():
    assert client.get("/definitely/not/a/route").status_code == 404


def test_deed_create_validates_payload():
    # Authenticated-but-invalid payload -> 422 from DeedCreate validation.
    from auth import get_current_user_id
    app.dependency_overrides[get_current_user_id] = lambda: 1
    try:
        r = client.post("/deeds", json={"deed_type": "grant-deed"})
        assert r.status_code == 422  # missing required legal/grantor/grantee
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)
