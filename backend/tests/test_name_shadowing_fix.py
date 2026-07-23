"""The name-shadowing fix: /users/profile/enhanced and /ai/deed-suggestions
must call database.get_user_profile (the DB helper), not the /users/profile
route handler that used to shadow it (returning an un-awaited coroutine)."""
import inspect

import database
from routers import property_cache_routes, users_auth


def test_both_modules_bind_the_database_helper():
    assert users_auth.get_user_profile is database.get_user_profile
    assert property_cache_routes.get_user_profile is database.get_user_profile
    assert not inspect.iscoroutinefunction(users_auth.get_user_profile)


def test_users_profile_route_still_registered():
    from main import app
    routes = {(m, r.path) for r in app.routes for m in (getattr(r, "methods", None) or set())}
    assert ("GET", "/users/profile") in routes
    assert ("GET", "/users/profile/enhanced") in routes
    assert ("POST", "/ai/deed-suggestions") in routes
