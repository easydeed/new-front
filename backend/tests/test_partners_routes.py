"""F1 regression: /partners/selectlist must never fall into /partners/{partner_id}.

The selectlist route was registered after the id route, so any request that
didn't carry the exact trailing slash matched /{partner_id} and died on the
'selectlist'::uuid cast. Route order inside a FastAPI router is registration
order — these tests pin the fixed order and both path spellings.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from auth import get_current_user_id
from main import app

FAKE_PARTNERS = [
    {"id": "11111111-1111-1111-1111-111111111111",
     "company_name": "Pacific Coast Title", "category": "title"},
]


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user_id] = lambda: 1
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)


def _route_index(method, path):
    for i, r in enumerate(app.routes):
        if r.path == path and method in (getattr(r, "methods", None) or set()):
            return i
    raise AssertionError(f"route {method} {path} not registered")


def test_selectlist_registered_before_partner_id():
    id_route = _route_index("GET", "/partners/{partner_id}")
    assert _route_index("GET", "/partners/selectlist/") < id_route
    assert _route_index("GET", "/partners/selectlist") < id_route


@pytest.mark.parametrize("path", ["/partners/selectlist/", "/partners/selectlist"])
def test_selectlist_resolves_to_selectlist_handler(client, path):
    with patch("routers.partners.list_partners", return_value=FAKE_PARTNERS):
        res = client.get(path, headers={"Authorization": "Bearer x"})
    assert res.status_code == 200
    assert res.json() == [
        {"id": "11111111-1111-1111-1111-111111111111",
         "name": "Pacific Coast Title", "category": "title"},
    ]
