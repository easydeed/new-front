"""Route-contract tests for the T3 sharing collapse.

Pins two things: (1) the endpoints the Shared Deeds UI actually calls exist,
and (2) the deleted no-consumer routers are really gone from the app.
"""
from main import app


def route_set():
    routes = set()
    for r in app.routes:
        methods = getattr(r, "methods", None) or set()
        for m in methods:
            routes.add((m, r.path))
    return routes


def test_ui_sharing_endpoints_exist():
    routes = route_set()
    assert ("GET", "/shared-deeds") in routes
    assert ("POST", "/shared-deeds") in routes
    assert ("POST", "/shared-deeds/{shared_deed_id}/resend") in routes
    assert ("POST", "/shared-deeds/{shared_deed_id}/revoke") in routes
    assert ("GET", "/shared-deeds/{shared_deed_id}/feedback") in routes
    assert ("DELETE", "/shared-deeds/{shared_deed_id}") in routes
    # Public approval flow stays.
    assert ("GET", "/approve/{approval_token}") in routes
    assert ("POST", "/approve/{approval_token}") in routes


def test_removed_routers_are_gone():
    # Note: GET /deeds/available still exists as main.py's own inline endpoint
    # (kept — out of T3 scope); only the router-provided routes must be gone.
    routes = route_set()
    assert ("POST", "/deeds/{deed_id}/share") not in routes
    assert ("POST", "/deeds/shares/resend") not in routes
    assert ("GET", "/deed-shares/{share_id}/feedback") not in routes
