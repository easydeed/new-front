"""Who may call this API from a browser, and with which methods.

═══ THE DEFECT THIS FILE IS BUILT AROUND ═══

`allow_methods` listed GET, POST, PUT, DELETE and OPTIONS. **It did not
list PATCH.** `frontend/src/lib/profileSave.ts` — the single save path
for the whole settings and onboarding surface — sends PATCH. So every
profile save died at the CORS PREFLIGHT, before the request existed as
far as the API was concerned: OPTIONS with `Access-Control-Request-
Method: GET` returned 200, the same request with PATCH returned 400.

The owner could not set his own recording county. The symptom reported
was "failed to fetch", which is what a browser says when a preflight is
refused, and which is indistinguishable from the API being down.

═══ WHY IT WAS INVISIBLE FOR SO LONG, AND THIS IS THE REAL LESSON ═══

The origin list contained `"*"`. Every origin was therefore already
accepted, which meant every CORS experiment "worked" and no origin
question could ever be the answer — while the METHOD list, which is where
the actual refusal lived, went unexamined.

Two rounds were spent on `ALLOWED_ORIGINS`, a variable that **nothing
read**. It was declared REQUIRED in the manifest on a claim about CORS
that was never true, the boot check dutifully reported it missing, the
owner set it, and setting it changed nothing — because `main.py`
hardcoded its list. The manifest was later corrected to OPTIONAL with the
note "Read by NOTHING today", and that correction was written before this
incident and read after it.

**A boot check verifies PRESENCE, not CONSUMPTION.** That is the shape
worth carrying: a variable can be declared, required, set, and reported
healthy while being wired to nothing. See the ledger entry.

═══ WHAT THIS MODULE DOES, AND WHAT IT DELIBERATELY DOES NOT ═══

It owns the origin list, the preview-deployment regex, and the method
list, so that all three are in ONE place with the reasoning attached, and
so that `test_cors_contract.py` can assert properties about them —
principally that **every method registered on any router is allowed**,
which is the pin that would have caught the original defect the day PATCH
was introduced.

It does NOT decide the middleware ORDER. See main.py: CORS is currently
the innermost of three middlewares, so every preflight opens and returns
a database connection before CORS answers it. That is reported, not
changed, in this ticket.
"""
from __future__ import annotations

import os
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

# ── The origins we know about ────────────────────────────────────────
#
# THE FLOOR, not the whole list: `ALLOWED_ORIGINS` may add to it (see
# `effective_origins`). Every entry is a real host this API is called
# from by a browser.
#
# `"*"` IS DELIBERATELY ABSENT. It was in the old list as a "fallback for
# development" and it is invalid in this configuration: the CORS spec
# forbids `Access-Control-Allow-Origin: *` together with
# `Access-Control-Allow-Credentials: true`, and browsers reject the pair
# on any credentialed request. It happened not to bite because the
# frontend authenticates with an `Authorization` header rather than
# cookies — so the pair was merely broken rather than breaking — but it
# is what made a wrong origin list unfalsifiable for two rounds.
DEFAULT_ORIGINS: Tuple[str, ...] = (
    "http://localhost:3000",
    "https://deedpro-frontend-new.vercel.app",
    # Owner-named, 2026-08-18: both the apex and the www host belong in
    # the list. Declared here rather than waiting for a dashboard value,
    # because an origin missing from this list is a total failure for
    # everyone browsing from that host.
    "https://deedpro.io",
    "https://www.deedpro.io",
)

# ── Preview deployments ──────────────────────────────────────────────
#
# The old list carried `"https://deedpro-frontend-new-*.vercel.app"` as a
# literal string. **Starlette does not glob `allow_origins`** — it
# compares them exactly, and globbing exists only through
# `allow_origin_regex`. That entry has therefore never matched a single
# preview deployment in its life; previews worked because of `"*"`, and
# would have stopped working the moment the wildcard was removed with the
# glob left in place.
PREVIEW_ORIGIN_REGEX = r"^https://deedpro-frontend-new-[a-z0-9-]+\.vercel\.app$"

# ── The methods this API answers ─────────────────────────────────────
#
# Written out rather than derived from the route table, and the choice is
# deliberate. Deriving would make any newly registered method allowed
# automatically — including one added by accident — whereas this list
# plus its pin makes widening the browser-facing surface a thing somebody
# WROTE DOWN. The pin (`test_cors_contract.py`) fails closed: a route
# registered with a method missing here turns CI red, which is exactly
# the event that did not happen when PATCH arrived.
ALLOWED_METHODS: Tuple[str, ...] = (
    "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
)

#: Rejected out of hand if it appears in `ALLOWED_ORIGINS`. See above:
#: with credentials enabled this is not a permissive setting, it is an
#: invalid one, and it hides every other origin mistake.
WILDCARD = "*"


def parse_origins(raw: Optional[str]) -> Tuple[List[str], List[str]]:
    """Split a comma-separated `ALLOWED_ORIGINS` into (accepted, refused).

    Refused entries are returned rather than dropped so the boot report
    can NAME them. A value silently ignored is how the last two rounds
    went.
    """
    accepted: List[str] = []
    refused: List[str] = []
    for piece in (raw or "").split(","):
        origin = piece.strip().rstrip("/")
        if not origin:
            continue
        if origin == WILDCARD:
            refused.append(origin)
        elif "*" in origin:
            # A glob here is not a permissive rule, it is a string that
            # matches nothing — the exact defect the old list carried.
            refused.append(origin)
        else:
            accepted.append(origin)
    return accepted, refused


def effective_origins(env: Optional[Dict[str, str]] = None) -> List[str]:
    """The list handed to the middleware: the floor, plus whatever the
    deploy config adds.

    ═══ WHY UNION AND NOT REPLACEMENT — FLAGGED, NOT DECIDED ═══

    The ruling was that the deploy config should OWN the origin list.
    Replacement is one line from here and it is deliberately not taken
    yet, for a reason that is about this specific moment rather than
    about the design:

    `render.yaml` declares `ALLOWED_ORIGINS` as a single origin
    (`https://deedpro-frontend-new.vercel.app`), the dashboard value is
    not readable from this repository, and the variable has never been
    consumed — so nobody has ever had a reason to keep it correct. Under
    replacement, the first deploy of this file would hand the middleware
    whatever that stale value happens to be and could remove
    `deedpro.io` from the allowed set: a total outage for every browser
    on the real domain, shipped by the ticket that fixed a CORS bug.

    So the env can ADD but not REMOVE until the value is known good. The
    boot report prints the effective list, which is how it becomes known
    good. Flipping to replacement is: `return accepted or list(DEFAULT_
    ORIGINS)`.
    """
    source = os.environ if env is None else env
    accepted, _ = parse_origins(source.get("ALLOWED_ORIGINS"))
    merged = list(DEFAULT_ORIGINS)
    for origin in accepted:
        if origin not in merged:
            merged.append(origin)
    return merged


def route_methods(routes: Iterable) -> List[str]:
    """Every HTTP method registered on the app, HEAD excluded.

    HEAD is added automatically by Starlette beside every GET and is not
    something a browser sends through a preflight, so it is not part of
    the surface this policy governs.
    """
    found = set()
    for route in routes:
        for method in (getattr(route, "methods", None) or ()):
            if method != "HEAD":
                found.add(method)
    return sorted(found)


def uncovered_methods(routes: Iterable,
                      allowed: Sequence[str] = ALLOWED_METHODS) -> List[str]:
    """Methods the app serves that a browser is not allowed to preflight.

    This is the whole ticket in one function. It returned `['PATCH']` for
    the entire life of the settings page.
    """
    allow = {m.upper() for m in allowed}
    return [m for m in route_methods(routes) if m.upper() not in allow]


def policy_report(env: Optional[Dict[str, str]] = None) -> str:
    """What this API will accept, printed at boot.

    The origin list has been wrong in production for months and no log
    line anywhere said what it was. This is that line — and it is also
    how the `ALLOWED_ORIGINS` value becomes known good enough to switch
    `effective_origins` to replacement.
    """
    source = os.environ if env is None else env
    accepted, refused = parse_origins(source.get("ALLOWED_ORIGINS"))
    lines = ["", "-" * 72, "CORS policy in effect:"]
    for origin in effective_origins(source):
        where = "env + code" if origin in accepted else "code"
        lines.append(f"  {origin}   [{where}]")
    lines.append(f"  preview deployments matching  {PREVIEW_ORIGIN_REGEX}")
    lines.append(f"  methods: {', '.join(ALLOWED_METHODS)}")
    if refused:
        lines.append("")
        lines.append("  !! IGNORED entries in ALLOWED_ORIGINS — a wildcard is "
                     "invalid with credentials,")
        lines.append("     and a glob matches nothing (Starlette globs only "
                     "via allow_origin_regex):")
        for origin in refused:
            lines.append(f"       {origin}")
    lines.append("-" * 72)
    lines.append("")
    return "\n".join(lines)
