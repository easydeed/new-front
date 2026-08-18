"""The browser-facing surface, checked against the routes it serves.

═══ THE DEFECT ═══

`allow_methods` listed GET, POST, PUT, DELETE, OPTIONS — and not PATCH.
`profileSave.ts` sends PATCH, and it is the single save path for the
settings and onboarding screens. Every save died at the preflight:
OPTIONS with `Access-Control-Request-Method: GET` returned 200, the same
request with PATCH returned 400. The owner could not set his own
recording county, and the browser's report — "failed to fetch" — is what
it says when a preflight is refused, which is indistinguishable from the
API being down.

═══ WHY NOTHING CAUGHT IT ═══

Two declarations of one contract with nothing comparing them: the route
table says which methods this API serves, `allow_methods` says which a
browser may use, and no third thing checked the second against the first.
That is the same shape as the drifted Shared Deeds row keys, the notary
package's advertised-but-unrouted links, and the render.yaml/manifest
split — and it is the reason the FIRST pin below is the one that matters.
It fails the moment a route is registered with a method a browser cannot
preflight, which is the event that happened silently when PATCH arrived.

═══ AND WHY IT STAYED INVISIBLE FOR MONTHS ═══

`"*"` was in the origin list. Every origin was already accepted, so no
CORS experiment could fail on origin grounds and the method list was
never the suspect. The wildcard did not cause the bug; it removed the
only signal that would have found it — while being, in combination with
`allow_credentials=True`, invalid per spec on every credentialed request.
"""
from __future__ import annotations

import pytest

from services import cors_policy as policy


def _app():
    import main
    return main.app


def _cors_options(app) -> dict:
    """The options actually handed to CORSMiddleware.

    Read off the app rather than off the source: a test that greps
    main.py for the string "PATCH" would pass while the middleware was
    configured from something else entirely (§14.1.1 — assert the
    property, not the line that currently expresses it).
    """
    for middleware in app.user_middleware:
        cls = getattr(middleware, "cls", None)
        if getattr(cls, "__name__", "") == "CORSMiddleware":
            options = getattr(middleware, "kwargs", None)
            if options is None:  # older Starlette
                options = getattr(middleware, "options", {})
            return dict(options)
    pytest.fail("no CORSMiddleware is installed on the app")


# ═══ THE PIN THIS FILE EXISTS FOR ════════════════════════════════════

def test_every_method_the_app_serves_may_be_preflighted():
    """The route table is the authority; `allow_methods` follows it.

    Returned `['PATCH']` for the entire life of the settings page.
    """
    app = _app()
    missing = policy.uncovered_methods(app.routes, _cors_options(app)["allow_methods"])
    assert missing == [], (
        "these methods are registered on routes but cannot be preflighted "
        f"by a browser: {missing}. Every request using one of them fails "
        "before it reaches the API, and the browser reports it as a "
        "network error."
    )


def test_patch_specifically():
    """Named on its own, because it is the one that was missing.

    Redundant with the sweep above by design: the sweep states the rule
    and this states the incident, so a future reader who breaks it sees
    the story rather than a set difference.
    """
    assert "PATCH" in _cors_options(_app())["allow_methods"]


def test_the_route_table_actually_has_patch_routes():
    """Guards the sweep against passing vacuously.

    A sweep over an empty set is green, and an import failure that left
    `app.routes` unpopulated would make the pin above meaningless while
    looking healthy (§14.2 — a control is checked before its result is
    believed).
    """
    assert "PATCH" in policy.route_methods(_app().routes)


# ═══ ORIGINS ═════════════════════════════════════════════════════════

def test_no_wildcard_origin():
    """`*` with `allow_credentials=True` is invalid per spec.

    Browsers reject the pair on credentialed requests; ours happened to
    survive it by authenticating with an `Authorization` header rather
    than cookies. It is removed as a broken pair, and because it made
    every origin misconfiguration unfalsifiable.
    """
    options = _cors_options(_app())
    assert options["allow_credentials"] is True
    assert "*" not in options["allow_origins"]


def test_the_real_domains_are_allowed():
    """Owner-named: the apex and the www host both belong in the list."""
    origins = _cors_options(_app())["allow_origins"]
    for origin in ("https://deedpro.io", "https://www.deedpro.io"):
        assert origin in origins


def test_no_glob_is_left_in_the_origin_list():
    """Starlette compares origins EXACTLY; only `allow_origin_regex` globs.

    `https://deedpro-frontend-new-*.vercel.app` sat in the list as a
    literal string and matched nothing for its entire life. Previews
    worked because of the wildcard, so removing the wildcard without
    noticing this would have broken every preview deployment.
    """
    options = _cors_options(_app())
    assert not [o for o in options["allow_origins"] if "*" in o]
    assert options.get("allow_origin_regex"), (
        "preview deployments need a regex — a glob in allow_origins is a "
        "string that matches nothing"
    )


@pytest.mark.parametrize("origin,expected", [
    ("https://deedpro-frontend-new-git-main-easydeed.vercel.app", True),
    ("https://deedpro-frontend-new.vercel.app", False),   # exact-match entry
    ("https://deedpro-frontend-new-evil.attacker.com", False),
    ("https://evil.com/deedpro-frontend-new-x.vercel.app", False),
])
def test_the_preview_regex_matches_previews_and_nothing_else(origin, expected):
    """Anchored at both ends, which is the difference between a preview
    rule and an open door."""
    import re
    assert bool(re.match(policy.PREVIEW_ORIGIN_REGEX, origin)) is expected


# ═══ THE ENV VARIABLE THAT WAS THEATRE ═══════════════════════════════

def test_allowed_origins_is_read_now():
    """It was declared, classified REQUIRED, set by hand, reported
    healthy by the boot check — and consumed by nothing."""
    assert "https://extra.example.com" in policy.effective_origins(
        {"ALLOWED_ORIGINS": "https://extra.example.com"})


def test_the_env_can_add_but_not_remove():
    """Deliberate, and flagged rather than decided — see
    `effective_origins`. A stale single-origin dashboard value would
    otherwise take the real domain offline on the deploy that fixed
    CORS."""
    origins = policy.effective_origins({"ALLOWED_ORIGINS": "https://extra.example.com"})
    for floor in policy.DEFAULT_ORIGINS:
        assert floor in origins


def test_a_wildcard_in_the_env_is_ignored_and_named():
    """Ignoring it silently is how a value nobody reads gets set twice."""
    accepted, refused = policy.parse_origins("*, https://ok.example.com")
    assert accepted == ["https://ok.example.com"]
    assert refused == ["*"]
    assert "*" not in policy.effective_origins({"ALLOWED_ORIGINS": "*"})
    assert "*" in policy.policy_report({"ALLOWED_ORIGINS": "*"})


def test_a_glob_in_the_env_is_ignored_and_named():
    """Same reason as the list in code: it matches nothing, and looking
    like a rule is worse than being absent."""
    accepted, refused = policy.parse_origins("https://*.example.com")
    assert accepted == []
    assert refused == ["https://*.example.com"]


def test_the_boot_report_states_the_effective_policy():
    """The origin list has been wrong in production for months and no log
    line anywhere said what it was. This is that line — and it is the
    precondition for switching to replace-semantics."""
    text = policy.policy_report({"ALLOWED_ORIGINS": ""})
    for origin in policy.DEFAULT_ORIGINS:
        assert origin in text
    assert "PATCH" in text


# ═══ THE PREFLIGHT ITSELF, THROUGH THE REAL STACK ════════════════════
#
# Everything above reads configuration. This sends the request the
# browser sent — the one that returned 400 — through the actual
# middleware stack, because a configuration assertion is a claim about
# what the middleware will do and this is the thing it does (§14.2).

@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "PATCH", "DELETE"])
def test_a_real_preflight_is_answered_for_every_method(method):
    from fastapi.testclient import TestClient
    client = TestClient(_app())
    response = client.options(
        "/users/profile",
        headers={
            "Origin": "https://deedpro.io",
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200, (
        f"preflight for {method} was refused with {response.status_code} — "
        "this is the exact failure the settings page hit, and the browser "
        "reports it as 'failed to fetch'"
    )
    assert response.headers["access-control-allow-origin"] == "https://deedpro.io"


def test_a_preflight_from_an_unknown_origin_is_refused():
    """The other half: removing the wildcard has to have MEANT something.

    A test suite that only proves things are allowed cannot tell an
    open door from a correct list.
    """
    from fastapi.testclient import TestClient
    client = TestClient(_app())
    response = client.options(
        "/users/profile",
        headers={
            "Origin": "https://not-ours.example.com",
            "Access-Control-Request-Method": "PATCH",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_a_preview_deployment_is_allowed_through_the_regex():
    from fastapi.testclient import TestClient
    client = TestClient(_app())
    origin = "https://deedpro-frontend-new-git-main-easydeed.vercel.app"
    response = client.options(
        "/users/profile",
        headers={"Origin": origin, "Access-Control-Request-Method": "PATCH"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
