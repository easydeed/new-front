"""FLOW1 item 6 — NOTARY1's write path is retired, and stays retired.

═══ WHAT WAS REMOVED, AND WHY IT WAS STILL THERE ═══

`POST /signing-requests` created a signing as a `deed_shares` row with
`share_kind='signing_request'` and a JSONB list of windows the OFFICER
had guessed at. §13.1 reversed that model: the notary posts her own
availability, the signers answer, convergence books it — one aggregate
across four tables, created by `POST /signing-requests/v2`.

Its UI was deleted when NOTARY2 shipped and #156 migrated its rows. What
survived was a LIVE ENDPOINT WITH NO CLIENT: writable by anyone with a
session, exercised by no screen, producing rows in a model the product
had stopped believing in. Nothing would have been lost — a later
migration run would have carried any such row across — and that is not
the objection. The objection is that two writable models for one act is
one model too many, and the one nobody can see is the one that rots.

═══ RETIRED ON EVIDENCE ═══

The owner ran `migrate_notary1_signings.py --dry-run` against production:
found 0, migrated 0, "no NOTARY1 signing requests remain to migrate", on
database `deedpro` at 10.26.62.147 — the instance confirmed by the
script's own identity line. The removal is safe because that number was
checked, not because enough time had passed.

═══ WHAT THIS PIN DOES AND DOES NOT CLAIM ═══

It forbids the ROUTE and the WRITE. It does not claim NOTARY1 data
cannot exist: the `deed_shares` columns stay (a column drop is
irreversible, production is not the only database this schema runs on,
and the migration script must keep being able to read a row it might
find elsewhere), and the read-side routes stay and are now unreachable
by construction — `_signing_share_by_token` 404s anything that is not a
signing share, and nothing can create one.

Those three residual routes are FLAGGED, not removed. Retiring them is a
second deletion with its own blast radius and its own doctrine tests,
and it is not what this ticket ruled.
"""
from __future__ import annotations

import re
from pathlib import Path

from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]


def _routes():
    import main

    out = set()
    for route in main.app.routes:
        for method in getattr(route, "methods", set()) or set():
            out.add((method, getattr(route, "path", "")))
    return out


def _backend_sources():
    for path in BACKEND.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv"} & set(path.parts):
            continue
        yield path


def test_the_notary1_create_route_is_gone():
    routes = _routes()
    assert ("POST", "/signing-requests") not in routes, (
        "NOTARY1's write path is back. The signing model is "
        "`POST /signing-requests/v2` — one aggregate over four tables, "
        "with the notary posting her own availability (§13.1).")
    # And the one that replaced it is present, so this pin cannot pass by
    # the whole feature having been deleted.
    assert ("POST", "/signing-requests/v2") in routes


def test_nothing_writes_a_notary1_signing_share():
    """The route is the door; this is the act.

    A new handler could create `share_kind='signing_request'` under a
    different path and satisfy the route pin above. What must not come
    back is the WRITE, so this matches the property — an INSERT or UPDATE
    putting the signing kind on a `deed_shares` row — rather than one
    path string.
    """
    offenders = []
    for path in _backend_sources():
        src = code_only(path)
        if "deed_shares" not in src:
            continue
        for match in re.finditer(
                r"(INSERT INTO deed_shares|UPDATE deed_shares)", src):
            # The statement, up to its terminating quote-ish boundary.
            chunk = src[match.start(): match.start() + 1200]
            if re.search(r"share_kind", chunk):
                line = src[: match.start()].count("\n") + 1
                offenders.append(f"{path.relative_to(BACKEND)}:{line}")
    assert offenders == [], (
        "something writes deed_shares.share_kind again — NOTARY1's model "
        f"is retired: {offenders}")


def test_the_signing_kind_constant_survives_for_readers():
    """Retiring the writer is not retiring the vocabulary.

    `SHARE_KIND_SIGNING` is still how `_signing_share_by_token`,
    `scheduling_label()` and the migration script RECOGNISE a NOTARY1 row.
    Deleting it would break the ability to read data we deliberately did
    not delete, which is a different and worse thing than removing the
    ability to make more.
    """
    from services import signing

    assert signing.SHARE_KIND_SIGNING == "signing_request"
    src = code_only(BACKEND / "routers" / "sharing.py")
    assert "SHARE_KIND_SIGNING" in src, (
        "the reader lost its ability to recognise a NOTARY1 row")


def test_the_columns_are_not_dropped():
    """A column drop is irreversible and was not ruled. The migration
    script must keep being able to read a row it might find in a database
    that is not production."""
    src = code_only(BACKEND / "database.py")
    for column in ("share_kind", "proposed_windows", "scheduled_at",
                   "scheduled_by", "scheduled_asserted_at"):
        assert f"ADD COLUMN IF NOT EXISTS {column}" in src, (
            f"deed_shares.{column} is no longer created — NOTARY1 rows "
            "elsewhere would become unreadable")
    assert "DROP COLUMN" not in src


def test_the_orphaned_template_went_with_the_route():
    """`share_signing_request`'s only caller was the removed route.

    #155's precedent: a template nothing sends passes every rendering pin
    in the suite while being unreachable, which is the most convincing
    kind of dead code. The orphan pin in test_admin3_email_outcomes.py is
    what caught it, and the count trip-wire fired DOWNWARD for the first
    time — 19 to 18.
    """
    from utils import notifications

    assert "share_signing_request" not in notifications.TEMPLATES
    src = code_only(BACKEND / "utils" / "email_templates.py")
    assert "def share_signing_request(" not in src


def test_the_dead_modal_is_deleted():
    """Its file, not its imports. `SigningRequestModal` had no importers
    for two tickets and was still shipped in every bundle — and, more to
    the point, reviving a dead file makes its violations live again."""
    modal = (BACKEND.parent / "frontend" / "src" / "features" / "signing"
             / "SigningRequestModal.tsx")
    assert not modal.exists(), (
        "NOTARY1's modal is back — it posts to a route that no longer "
        "exists")


def test_the_residual_read_routes_are_flagged_not_forgotten():
    """The three NOTARY1 routes that remain are unreachable by
    construction, and this asserts somebody said so in the source rather
    than leaving a reader to work it out.

    They are not removed because that was not ruled. They are recorded
    because an endpoint that cannot fire, with nothing saying why, is
    indistinguishable from one nobody has looked at.
    """
    routes = _routes()
    for residual in (("POST", "/approve/{approval_token}/schedule"),
                     ("POST", "/shared-deeds/{shared_deed_id}/schedule"),
                     ("GET", "/approve/{approval_token}/pcor")):
        assert residual in routes, (
            f"{residual} was removed — that is a second deletion this "
            "ticket did not rule; if it is now intended, say so here")
    src = (BACKEND / "routers" / "sharing.py").read_text(encoding="utf-8")
    assert "unreachable by\n# construction" in src, (
        "the note explaining why the residual routes cannot fire is gone")
