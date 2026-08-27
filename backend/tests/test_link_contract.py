"""A link this product hands out is a link this product can serve.

═══ THE DEFECT THIS GENERALISES ═══

`notary_package` advertised `pcor_url` and `pdf_url` from the day NOTARY2
shipped. The notary's screen rendered both as download buttons. **Neither
handler existed.** Two live 404s, for a feature's entire lifetime, on a
surface whose audience has no account and no way to tell a broken product
from a broken link.

Nothing caught it because nothing compared the two lists — the links a
payload hands out, and the routes the app serves. That is the same shape
as the eight drifted Shared Deeds row keys: two declarations, and no
third thing checking them against each other.

Owner-ruled 2026-08-12: **any payload that hands out links gets its
advertised URLs checked against what actually resolves.** This file is
that check, in both directions a link can point.

═══ TWO KINDS OF LINK, TWO DIFFERENT AUTHORITIES ═══

 1. AN API PATH — `/signing/{token}/pcor`. Resolves against this app's
    own route table, and a miss is a 404 from our own server.

 2. A FRONTEND PAGE — `{FRONTEND_URL}/approve/{token}`, built in Python
    and posted into somebody's INBOX. Resolves against the Next.js app
    router, in a different language, in a different deployment, on a
    different host. A miss here is worse than a broken button: an email
    is immutable, so the 404 is permanent and arrives at a customer.

The second is the reason this file reaches across the repository
boundary. Nothing else in either test suite does, and the justification
is that nothing else has to: a link is the one artifact whose two halves
are deployed separately and must still agree.

═══ WHAT THE SWEEP FOUND ═══

No second instance. Every frontend link the backend emits — the approval
page, the signing token page, the share focus link, the password-reset
and verify-email pages, the Stripe return URLs, the welcome email's
builder link, the QR verification page — resolves to a real route today.

That is the point at which a pin is worth most and feels least urgent.
"No second instance" is not a property of the code; it is a snapshot of
it, and the thing that changes it is a route rename nobody connects to an
email template written eight months earlier.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
FRONTEND_APP = BACKEND.parent / "frontend" / "src" / "app"


def _backend_sources():
    for folder in ("services", "routers", "api", "utils"):
        for path in (BACKEND / folder).rglob("*.py"):
            if "__pycache__" in path.parts:
                continue
            yield path


def _shape(path: str) -> str:
    """One route, however its parameters are spelled.

    `/signing/{token}/pcor`, `/signing/{tok}/pcor` and Next's
    `/signing/[token]/pcor` are the same route. What is being compared is
    the SHAPE — the literal segments and where the holes are — not the
    name somebody gave a variable.
    """
    out = []
    for segment in path.split("/"):
        if not segment:
            out.append(segment)
        elif "{" in segment or segment.startswith("["):
            out.append("{}")
        else:
            out.append(segment)
    return "/".join(out)


# ══════════════════════════════════════════════════════════════════════
# 1. API paths a payload hands out
# ══════════════════════════════════════════════════════════════════════

#: Two shapes, because the first draft of this pin only had the first and
#: missed three real links — including the PCOR download URL, which is
#: PASSED as an argument rather than written into a dict:
#:
#:     "pcor_url": f"/signing/{token}/pcor"      keyed into a payload
#:     pcor_offer.status(deed, f"/signing/{token}/pcor.pdf")   handed over
#:
#: The second pattern is any f-string that looks like an absolute API
#: path. It also matches route decorators, which is harmless — a route
#: trivially resolves to itself — and it produced no false positives over
#: the whole backend, because nothing else in this codebase writes an
#: f-string beginning with `/`.
#:
#: Only values starting with `/`: an absolute URL is somebody else's
#: server and not ours to resolve.
API_LINK = re.compile(
    r'"[a-z_]*(?:url|link)":\s*f?"(/[^"]*)"'
    r'|f"(/[A-Za-z0-9_\-/{}\[\].]*)"')


def _app_routes():
    import main
    return {_shape(getattr(r, "path", "")) for r in main.app.routes}


def test_every_api_path_a_payload_advertises_is_a_route_that_exists():
    """THE PIN THAT WOULD HAVE CAUGHT THE PCOR BUTTON.

    A payload advertising a link the app cannot serve is a promise made
    by a surface that cannot keep it — and the surface that made it is
    never the surface that discovers it.
    """
    routes = _app_routes()
    offenders = []
    for path in _backend_sources():
        src = code_only(path)
        for match in API_LINK.finditer(src):
            url = (match.group(1) or match.group(2)).split("?")[0]
            if _shape(url) not in routes:
                line = src[: match.start()].count("\n") + 1
                offenders.append(f"{path.relative_to(BACKEND)}:{line} → {url}")
    assert offenders == [], (
        "a payload hands out API links this app does not serve:\n  "
        + "\n  ".join(offenders) +
        "\nEither build the route or stop advertising it — a button that "
        "404s is worse than one that is absent.")


def test_the_pin_is_looking_at_something():
    """A sweep that matches nothing passes forever.

    The regex has to keep finding the links it was written for; if a
    refactor changes how payloads spell them, this fails rather than
    going quietly green.
    """
    found = sum(len(API_LINK.findall(code_only(p))) for p in _backend_sources())
    assert found >= 6, (
        f"the API-link sweep found only {found} links — the payload shape "
        "has changed and this pin is no longer reading anything")


# ══════════════════════════════════════════════════════════════════════
# 2. Frontend pages the backend puts in emails
# ══════════════════════════════════════════════════════════════════════

#: The base-URL expressions this backend builds frontend links from. Named
#: explicitly rather than matched loosely: a pattern broad enough to catch
#: every f-string is a pattern that reports half the codebase.
BASES = (r"APP_URL\(\)", r"app_url", r"base_url", r"url", r"app",
         r"_FRONTEND_URL_\(\)", r"_verification_base_url\(\)",
         r"os\.getenv\(['\"]FRONTEND_URL['\"][^)]*\)")

FRONTEND_LINK = re.compile(
    r"\{(?:" + "|".join(BASES) + r")\}(/[A-Za-z0-9_\-/{}\[\]]*)")


def _frontend_routes():
    """Every page the Next.js app router serves, as a shape."""
    routes = set()
    for page in FRONTEND_APP.rglob("page.tsx"):
        rel = page.relative_to(FRONTEND_APP).parent
        path = "/" + "/".join(rel.parts) if rel.parts else "/"
        routes.add(_shape(path))
    return routes


def test_every_frontend_link_the_backend_emails_resolves_to_a_page():
    """AN EMAIL IS IMMUTABLE, and that is the whole reason this exists.

    A broken button gets fixed and the next click works. A broken link in
    somebody's inbox stays broken for as long as they keep the message,
    and the person who finds it is a customer rather than a developer.

    This reaches into the frontend deliberately. The two halves of a link
    are deployed separately and must still agree, and nothing else was
    comparing them.
    """
    pages = _frontend_routes()
    assert pages, "found no frontend pages — has the app directory moved?"

    offenders = []
    for path in _backend_sources():
        src = code_only(path)
        for match in FRONTEND_LINK.finditer(src):
            url = (match.group(1) or match.group(2)).split("?")[0].rstrip("/")
            if not url:
                continue          # the bare host is always fine
            if _shape(url) not in pages:
                line = src[: match.start()].count("\n") + 1
                offenders.append(f"{path.relative_to(BACKEND)}:{line} → {url}")
    assert offenders == [], (
        "the backend builds links to frontend pages that do not exist:\n  "
        + "\n  ".join(offenders) +
        "\nIf a route was renamed, the alias has to be permanent — an "
        "email already sent cannot be edited (docs/DASH1_REQUESTS_MERGE.md).")


def test_the_frontend_sweep_is_looking_at_something():
    found = sum(len(FRONTEND_LINK.findall(code_only(p)))
                for p in _backend_sources())
    assert found >= 5, (
        f"the frontend-link sweep found only {found} links — it is no "
        "longer reading the emails it was written to guard")


@pytest.mark.parametrize("known", [
    "/approve/{token}",      # the review and signing link, in two emails
    "/signing/{token}",      # NOTARY2's consumer surface
    "/confirm/{token}",      # API-CONFIRM — partner draft, human approval
    "/shared-deeds",         # THE ALIAS — see the note below
    "/signings",             # THE OTHER ALIAS — the schedule notice is an email
    "/requests",             # where both focus links point NOW
    "/account-settings",     # THE STRIPE RETURN URLS
    "/verify/{code}",        # the QR code printed on nothing, read by anyone
])
def test_the_links_that_matter_most_are_among_the_ones_checked(known):
    """A sweep is only as good as its reach, and these are the ones whose
    failure is least recoverable: some are in emails already sent, one is
    where a paying customer lands after checkout, and one is printed into
    a QR code.

    `/shared-deeds` and `/signings` are in this list even though the
    backend no longer builds a single link to either. THAT IS THE POINT.
    They are the pages whose only remaining job is to catch the mail that
    went out before the rename, so the sweep above — which only sees
    links the backend still emits — would stop guarding them the moment
    they stopped being emitted.
    This entry is what keeps the alias alive after the last emitter is
    gone: the case where deleting it looks free is exactly the case where
    it costs somebody a 404 they cannot report.
    """
    assert _shape(known) in _frontend_routes(), (
        f"{known} is not a page any more — every link already sent to it "
        "is now a 404 in somebody's inbox")


def test_no_new_link_is_minted_at_the_retired_path():
    """The alias is permanent BECAUSE SENT MAIL CANNOT BE EDITED — and
    that argument covers exactly the mail that was already sent.

    A backend that keeps emitting `/shared-deeds?focus=` would grow the
    population of legacy links forever and make the alias self-
    justifying: every year there would be more inboxes holding the old
    path, because we had spent that year putting it there. New mail gets
    the canonical route; the alias serves history and stops growing it.
    """
    offenders = []
    for path in _backend_sources():
        src = code_only(path)
        for i, line in enumerate(src.splitlines(), start=1):
            for retired in ("/shared-deeds?focus=", "/signings?focus="):
                if retired in line:
                    offenders.append(f"{path.relative_to(BACKEND)}:{i} -> {retired}")
    assert offenders == [], (
        "these build a fresh link at a retired path instead of "
        "/requests?kind=...&focus=:\n  " + "\n  ".join(offenders))


def test_the_focus_link_says_which_table_the_id_came_from():
    """`?focus=42` on the merged tracker names two different rows.

    A review is a `deed_shares.id` and a signing is a
    `signing_requests.id`. The old paths carried that distinction in the
    path itself; the merged one cannot, so whoever builds the link
    supplies it. A `?focus=` with no `?kind=` is ambiguous and the page
    correctly refuses to guess — which means a link built without the
    kind lands on an unfiltered list, the exact defect DASH1 found.
    """
    bare = []
    for path in _backend_sources():
        src = code_only(path)
        for i, line in enumerate(src.splitlines(), start=1):
            if "/requests?" in line and "focus=" in line and "kind=" not in line:
                bare.append(f"{path.relative_to(BACKEND)}:{i}")
    assert bare == [], (
        "these send the officer to the merged tracker with an id but no "
        "kind, so the page cannot tell which list to open:\n  "
        + "\n  ".join(bare))
