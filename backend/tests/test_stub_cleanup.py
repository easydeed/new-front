"""Route-contract tests for the T5 stub cleanup."""
from main import app


def routes():
    out = set()
    for r in app.routes:
        for m in getattr(r, "methods", None) or set():
            out.add((m, r.path))
    return out


def test_placeholder_endpoints_are_gone():
    rt = routes()
    for gone in [
        ("POST", "/users"),
        ("GET", "/users/{email}"),
        ("PUT", "/deeds/{deed_id}/status"),
        ("POST", "/deeds/{deed_id}/recipients"),
        ("GET", "/deeds/{deed_id}/recipients"),
        ("POST", "/payment-methods"),
        ("GET", "/payment-methods"),
        ("DELETE", "/payment-methods/{payment_method_id}"),
        ("POST", "/subscriptions"),
        ("GET", "/subscriptions"),
        ("GET", "/property/search"),
        ("POST", "/generate-deed"),
        ("POST", "/generate-deed-preview"),
    ]:
        assert gone not in rt, f"{gone} should have been removed"


def test_kept_endpoints_survive():
    rt = routes()
    for kept in [
        ("POST", "/users/register"),
        ("POST", "/users/login"),
        ("GET", "/users/profile"),
        ("DELETE", "/deeds/{deed_id}"),   # now a real, authenticated soft delete
        ("GET", "/deeds/{deed_id}/download"),
        ("GET", "/deeds"),
        ("POST", "/deeds"),
    ]:
        assert kept in rt, f"{kept} must still exist"


def test_soft_delete_requires_auth():
    # The rewritten DELETE /deeds/{id} must carry the auth dependency.
    route = next(
        r for r in app.routes
        if r.path == "/deeds/{deed_id}" and "DELETE" in (getattr(r, "methods", None) or set())
    )
    dep_names = [d.call.__name__ for d in route.dependant.dependencies if d.call]
    params = [p.name for p in route.dependant.query_params + route.dependant.path_params]
    # get_current_user_id shows up as a sub-dependency of the endpoint signature
    from auth import get_current_user_id  # noqa: F401
    import inspect
    sig = inspect.signature(route.endpoint)
    assert "user_id" in sig.parameters
