"""Bug #7 class-killer: EVERY /admin/* and /usage/* route, across every
router, must carry a real admin-auth dependency. This is the third time an
always-true auth stub was found guarding admin surfaces (verify_admin in
PR #17, phase23's require_admin here) — this test makes a fourth impossible
to ship silently."""
import inspect

from main import app
import auth
from routers import admin_partners


REAL_ADMIN_DEPS = {auth.get_current_admin, admin_partners.require_admin}


def flatten_dependencies(dependant, acc=None):
    acc = acc if acc is not None else set()
    for dep in dependant.dependencies:
        if dep.call is not None:
            acc.add(dep.call)
        flatten_dependencies(dep, acc)
    return acc


def admin_routes():
    for route in app.routes:
        path = getattr(route, "path", "")
        if path.startswith("/admin") or path.startswith("/usage"):
            if getattr(route, "dependant", None) is not None:
                yield route


def test_every_admin_and_usage_route_has_real_admin_auth():
    unprotected = []
    for route in admin_routes():
        deps = flatten_dependencies(route.dependant)
        if not (deps & REAL_ADMIN_DEPS):
            unprotected.append(sorted(route.methods)[0] + " " + route.path)
    assert not unprotected, (
        "Routes lacking real admin auth (get_current_admin or "
        f"admin_partners.require_admin): {unprotected}"
    )


def test_the_guards_are_not_stubs():
    # A guard that never touches its arguments or raises is the disease.
    for guard in REAL_ADMIN_DEPS:
        source = inspect.getsource(guard)
        assert "return True" not in source, f"{guard.__name__} looks like a stub"
        assert "403" in source or "HTTPException" in source, (
            f"{guard.__name__} never rejects anyone"
        )
