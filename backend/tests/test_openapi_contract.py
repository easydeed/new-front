"""OpenAPI route contract (T8 gate).

The committed snapshot is the full sorted (method, path) surface of the app.
The T8 main.py split must leave this byte-identical. Any diff = stop and
report. Re-record deliberately with RECORD_OPENAPI=1 when a route change is
intentional (a reviewed PR doing so is the paper trail).

═══ WHAT THIS GATE DOES NOT COVER ═══

**(method, path). Nothing else.** Not request models, not response
shapes, not field types, not whether a field is required.

So a public endpoint's request body can change — a field added, renamed,
made optional, or removed — and this gate stays green without being
touched. ROLE1 step 3 did exactly that to `POST /users/register` and this
test passed, correctly.

That is not a defect: a route-surface snapshot is a useful thing and this
is one. It is written down because the name "OpenAPI contract" invites
the reader to assume it covers the schema too, and an unstated limit gets
over-cited — somebody will one day point at a green tick here as evidence
that an API shape did not change, and it is not evidence of that.

Request-shape changes are pinned by the tests that own the endpoint
(`test_role1_separation.py` for registration, and so on), and by the
frontend/backend pair tests that hold the two ends equal.
"""
import json
import os
from pathlib import Path

from main import app

SNAPSHOT = Path(__file__).parent / "snapshots" / "openapi_routes.json"


def current_routes():
    out = []
    for r in app.routes:
        for m in sorted(getattr(r, "methods", None) or set()):
            if m in ("HEAD", "OPTIONS"):
                continue
            out.append([m, r.path])
    return sorted(out)


def test_route_surface_matches_snapshot():
    routes = current_routes()
    if os.getenv("RECORD_OPENAPI") == "1" or not SNAPSHOT.exists():
        SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
        SNAPSHOT.write_text(json.dumps(routes, indent=1) + "\n")
    expected = json.loads(SNAPSHOT.read_text())
    added = [r for r in routes if r not in expected]
    removed = [r for r in expected if r not in routes]
    assert routes == expected, (
        f"Route surface changed. added={added} removed={removed} — "
        "if intentional, re-record with RECORD_OPENAPI=1 and justify in the PR."
    )


def test_only_the_partner_contract_is_published():
    """Admin routes stay callable behind auth, but are not advertised as
    part of the external integration product."""
    paths = {r.path for r in app.routes}
    assert "/api/v1/openapi.json" in paths
    assert "/api/v1/verify/{document_id}" in paths
    assert "/api/verify/{short_code}" not in paths
    for internal_spec in ["/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"]:
        assert internal_spec not in paths
