"""OpenAPI route contract (T8 gate).

The committed snapshot is the full sorted (method, path) surface of the app.
The T8 main.py split must leave this byte-identical. Any diff = stop and
report. Re-record deliberately with RECORD_OPENAPI=1 when a route change is
intentional (a reviewed PR doing so is the paper trail).
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
