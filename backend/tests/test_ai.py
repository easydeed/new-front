"""Route-contract tests for the consolidated AI surface (T4).

One router owns /api/ai/*: api/ai_assist.py, exposing only /chat (the sole
AI route the frontend consumes). The legacy no-auth /assist (root
ai_assist.py), /multi-document, and routers/ai.py's chain-of-title /
profile-request are gone.
"""
from main import app


def ai_routes():
    routes = set()
    for r in app.routes:
        for m in getattr(r, "methods", None) or set():
            routes.add((m, r.path))
    return routes


def test_chat_is_the_only_ai_route():
    routes = ai_routes()
    assert ("POST", "/api/ai/chat") in routes
    ai_paths = sorted({p for _, p in routes if p.startswith("/api/ai")})
    assert ai_paths == ["/api/ai/chat"]


def test_removed_ai_routes_are_gone():
    paths = {p for _, p in ai_routes()}
    assert "/api/ai/assist" not in paths
    assert "/api/ai/multi-document" not in paths
    assert "/api/ai/chain-of-title" not in paths
    assert "/api/ai/profile-request" not in paths


def test_helper_functions_survive_for_main_endpoints():
    # main.py's /ai/deed-suggestions and /generate-deed-preview still use these.
    from ai_assist import suggest_defaults, validate_deed_data
    assert callable(suggest_defaults)
    assert callable(validate_deed_data)
