"""DEEDPREVIEW-FIX — the instrument is served, and a draft is not made one.

═══ THE DEFECT ═══

Two officer surfaces displayed "the deed" and only one displayed the
deed. `/deed-builder/{type}/success` fetched `/deeds/{id}/download`,
which serves the bytes in `deed_pdfs`. `/deeds/{id}/preview` POSTed the
deed's fields to the generate endpoint on every visit and displayed the
result, handing that blob over as Download.

`deed_pdfs` is one row per deed, INSERT-OR-REFUSE under §9, with a
sha256 stamped on the deed row — immutable on purpose, because §3
removed QR codes from recorded pages on the reasoning that
"verification survives as data" and that hash is the data.

The two agree until a template, the rate registry, or the deed's own
fields change after generation. Nothing compared them, and the registry
version is a known mover (RED-S4 is queued because it is not yet stamped
at generation time).

═══ AND THE TRAP IN THE OBVIOUS FIX ═══

Pointing the preview at `/download` and letting it render when nothing
is stored would have been worse than the defect it repaired.

`store_deed_pdf` sets `status = 'completed'`, stamps `completed_at`, and
is INSERT-OR-REFUSE. So rendering a draft on demand does not preview
it — **it finalises it**, permanently, with whatever half-entered fields
it had at that moment, and refuses every later correction.

Nothing in the API prevented that. What prevented it was a BUTTON: Past
Deeds renders Download only for `status === "completed"`. A rule that
lives in a screen is a rule the next screen does not have — and this
ticket adds a second screen that wants the same document.
"""
from __future__ import annotations

import os
import uuid

import pytest

from services.deed_pdf import DraftHasNoInstrument, may_self_heal

dbonly = pytest.mark.skipif(not os.getenv("DATABASE_URL"),
                            reason="needs a database")


# ══════════════════════════════════════════════════════════════════════
# 1. Who may be rendered on demand
# ══════════════════════════════════════════════════════════════════════

def test_a_completed_deed_may_be_rendered_on_demand():
    """It HAS an instrument; we merely failed to keep the bytes.

    This is the legacy row the self-heal was written for — completed
    before the stored-PDF pipeline existed.
    """
    assert may_self_heal({"status": "completed", "completed_at": None})


def test_a_deed_stamped_completed_may_be_rendered_whatever_its_status_says():
    """`completed_at` is stamped at store time and never cleared.

    Read separately from `status` because the two disagreeing is a REAL
    state — a deleted deed keeps its completion — and a row that has been
    through generation has a document regardless of what its status
    column now says.
    """
    assert may_self_heal({"status": "deleted", "completed_at": "2026-01-01T00:00:00Z"})


def test_a_draft_may_not():
    """THE PIN THIS FILE EXISTS FOR.

    Rendering a draft on demand stamps `completed`, stores bytes that
    can never be replaced, and turns a half-entered form into the
    instrument of record. The honest answer is that it has none yet.
    """
    for row in ({"status": "draft", "completed_at": None},
                {"status": None, "completed_at": None},
                {"status": "", "completed_at": None},
                {}):
        assert not may_self_heal(row), (
            f"{row!r} would be rendered and permanently finalised")


def test_the_refusal_says_what_to_do_about_it():
    """§4 read forwards: a refusal that does not name its remedy is an
    error message the officer can only escalate."""
    message = str(DraftHasNoInstrument(41))
    assert "41" in message
    assert "builder" in message.lower()
    # And it says WHY it cannot simply be produced — generating is the
    # act that creates an instrument, and it happens once.
    assert "once" in message.lower()


# ══════════════════════════════════════════════════════════════════════
# 2. The rule is the one the endpoint uses
# ══════════════════════════════════════════════════════════════════════

def test_the_download_endpoint_asks_the_rule():
    """A rule is only the rule if the handler calls it.

    CALLED rather than grepped for a spelling would be better, and needs
    a database; the end-to-end half is below under `dbonly`. This is the
    cheap belt that fails loudly if the handler grows its own opinion.
    """
    from pathlib import Path

    from tests.source_text import code_only

    src = code_only(Path(__file__).resolve().parents[1] / "routers" / "deeds_crud.py")
    handler = src[src.index("def download_deed_endpoint("):]
    handler = handler[: handler.index("\n@router.")]
    assert "may_self_heal(" in handler, (
        "the download endpoint decides for itself whether to render, so "
        "the draft-finalising path is open again")
    # And it does not re-list the vocabulary beside the call.
    assert "'completed'" not in handler and '"completed"' not in handler, (
        "the endpoint names statuses itself; that judgement belongs to "
        "may_self_heal and nowhere else")


@pytest.fixture
def world():
    """One officer and one DRAFT deed — the row this ticket protects."""
    import psycopg2
    from database import create_tables
    from db_rows import ROW_FACTORY
    create_tables()
    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    conn.autocommit = True
    tag = uuid.uuid4().hex[:8]
    made = {"conn": conn}
    with conn.cursor() as cur:
        cur.execute("INSERT INTO users (email, password_hash, full_name, role) "
                    "VALUES (%s, 'x', 'Olivia Officer', 'user') RETURNING id",
                    (f"officer-{tag}@instrument.test",))
        made["officer"] = cur.fetchone()["id"]
        cur.execute("""INSERT INTO deeds (user_id, deed_type, property_address,
                                          county, status)
                       VALUES (%s, 'grant_deed', '1 Draft Way, Los Angeles, CA',
                               'Los Angeles', 'draft') RETURNING id""",
                    (made["officer"],))
        made["draft"] = cur.fetchone()["id"]
    return made


def _client_for(user_id: int):
    from fastapi.testclient import TestClient
    from auth import create_access_token
    from main import app
    client = TestClient(app)
    client.headers.update({
        "Authorization": f"Bearer {create_access_token({'sub': str(user_id), 'email': 'x@instrument.test'})}"})
    return client


@dbonly
def test_downloading_a_draft_is_refused_and_the_draft_stays_a_draft(world):
    """The end-to-end half: the deed is NOT finalised by being asked for.

    The assertion that matters is the second one. A 409 that had already
    stamped `completed` on the way to refusing would satisfy a
    status-code check and still have destroyed the thing it was
    protecting.
    """
    deed_id = world["draft"]
    response = _client_for(world["officer"]).get(f"/deeds/{deed_id}/download")
    assert response.status_code == 409, response.text
    assert "builder" in response.json()["detail"].lower()

    with world["conn"].cursor() as cur:
        cur.execute("SELECT status, completed_at FROM deeds WHERE id = %s", (deed_id,))
        row = cur.fetchone()
        cur.execute("SELECT 1 FROM deed_pdfs WHERE deed_id = %s", (deed_id,))
        stored = cur.fetchone()

    assert row["status"] == "draft", (
        "asking a draft for its document finalised it — which is worse "
        "than the divergence this ticket set out to fix")
    assert row["completed_at"] is None
    assert stored is None, "a draft was given a permanent instrument"


# ══════════════════════════════════════════════════════════════════════
# 3. The advice we give points somewhere that can help
# ══════════════════════════════════════════════════════════════════════

def test_the_admin_pdf_message_names_an_endpoint_that_can_fix_it():
    """§4 REACHES HELP STRINGS.

    This handler used to tell an admin: "PDF not available. Use
    /api/generate/{deed_type} to regenerate." Those handlers take a
    render CONTEXT rather than a deed id and store NOTHING — so the
    admin got a document that is not the instrument, and the deed still
    had no stored PDF. Advice that cannot fix the problem it is offered
    for, which is worse than no advice: it spends an afternoon first.

    The same defect DEEDPREVIEW-FIX closed on the officer's side,
    arriving as a help string.
    """
    from pathlib import Path

    from tests.source_text import code_only

    src = code_only(Path(__file__).resolve().parents[1] / "routers" / "admin_api_v2.py")
    handler = src[src.index("def admin_get_deed_pdf("):]
    handler = handler[: handler.index("\n@router.")]

    assert "/api/generate/" not in handler, (
        "the admin is being sent to a render endpoint that stores nothing, "
        "so following the advice leaves the deed exactly as it was")
    assert "/download" in handler, (
        "the message names no endpoint that repairs the row")
    # And the recoverable case is told apart from the draft, using the
    # SAME rule the download endpoint asks rather than a second opinion.
    assert "may_self_heal(" in handler


def test_the_admin_message_does_not_promise_to_generate_for_her():
    """A draft with no document is not a fault, and an admin tool that
    offered to produce one would be asserting an instrument on the
    officer's behalf — the §9 write dressed as a convenience."""
    from pathlib import Path

    from tests.source_text import code_only

    src = code_only(Path(__file__).resolve().parents[1] / "routers" / "admin_api_v2.py")
    handler = src[src.index("def admin_get_deed_pdf("):]
    handler = handler[: handler.index("\n@router.")]
    assert "draft" in handler.lower()
    assert "builder" in handler.lower()


# ══════════════════════════════════════════════════════════════════════
# 4. MONEY1 — a limit nothing enforces is not advertised
# ══════════════════════════════════════════════════════════════════════

def test_the_profile_does_not_report_a_cap_nothing_enforces():
    """ADDED BECAUSE A MUTATION PROBE FOUND NOTHING HELD IT.

    `/users/profile` returned `max_deeds_per_month: 5` from a hardcoded
    fallback whenever `plan_limits` had no row — which is always, because
    the table is never seeded. Meanwhile `check_plan_limits` sits in
    main.py with ZERO call sites, so nothing has ever counted a deed
    against a cap.

    A number in a payload reads as a rule. An officer on Free was told by
    the API that she has five a month, and it was untrue in both
    directions: nothing stopped her at five, and nothing had decided she
    should be.

    Same class TRIAL1 deleted from the pricing copy, surviving in a
    payload — the harder place to see it, because copy is read by people
    and payloads are not.

    THIS PIN CUTS BOTH WAYS. If enforcement is ever wired up, it fails
    and tells you to restore the number: a cap that is enforced SHOULD be
    reported, and the defect was only ever the mismatch.
    """
    from pathlib import Path

    from tests.source_text import code_only

    backend = Path(__file__).resolve().parents[1]
    calls = []
    for path in backend.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv"} & set(path.parts):
            continue
        src = code_only(path)
        for i, line in enumerate(src.splitlines(), start=1):
            if "check_plan_limits(" in line and "def check_plan_limits" not in line:
                calls.append(f"{path.relative_to(backend)}:{i}")

    profile = code_only(backend / "routers" / "users_auth.py")
    advertises = 'if limits else 5' in profile or 'if limits else 100' in profile

    if calls:
        assert advertises, (
            "check_plan_limits is called from " + ", ".join(calls) +
            " — the cap is enforced now, so the profile should report it "
            "rather than null. Enforcement and disclosure move together.")
    else:
        assert not advertises, (
            "the profile advertises a plan limit as a number while "
            "check_plan_limits has no call sites — nothing counts against "
            "it, so the number is a rule nobody enforces")
        # And it says WHY the values are absent, so a consumer does not
        # read null as "failed to load" and substitute its own default.
        assert '"enforced"' in profile


# ══════════════════════════════════════════════════════════════════════
# 5. MONEY1 — a column only in the CREATE never reaches an old database
# ══════════════════════════════════════════════════════════════════════

def test_every_users_column_the_code_writes_has_an_ALTER():
    """THE DEFECT THAT ATE EVERY PAYMENT, AS A RULE.

    `users.updated_at` was in `CREATE TABLE IF NOT EXISTS users` and in
    no ALTER. Production's `users` predates it, and CREATE IF NOT EXISTS
    is a NO-OP on an existing table — so the column never arrived.
    Confirmed against production: 22 columns, no `updated_at`.

    Every webhook handler writing `SET ... updated_at = now()` threw
    UndefinedColumn and returned 500, which is why
    checkout.session.completed failed while handlers touching other
    tables succeeded. The plan upgrade lives only in the failing one.

    STRUCTURALLY BLIND, WHICH IS WHY THREE OCCURRENCES SURVIVED. A test
    against a fresh database CANNOT SEE THIS CLASS — not "usually
    misses it", cannot see it. A fresh database is built from the
    current CREATE and therefore always agrees with it. The bug exists
    only in the gap between a database's AGE and the code's, and no
    environment built today has an age.

    So this pin reads the SCHEMA SOURCE. It is the only vantage point
    from which the gap is visible at all.

    It earned that on its first run: it found is_platform_admin,
    organization_id and widget_addon written with no ALTER, and two of
    the three are genuinely absent from production — two more latent
    500s waiting for whichever code path writes them. Fixing
    users.updated_at alone would have left them.

    Scoped to the columns the CODE ACTUALLY WRITES, deliberately. A
    sweep of every column of every table is the right eventual pin and
    is NOT this one — a first attempt at it mis-parsed across table
    boundaries and reported columns belonging to other tables, and a
    sweep that reports garbage is worse than no sweep. Ledgered.
    """
    import re
    from pathlib import Path

    from tests.source_text import code_only

    backend = Path(__file__).resolve().parents[1]
    schema = code_only(backend / "database.py")
    altered = set(re.findall(r"ALTER TABLE users ADD COLUMN IF NOT EXISTS (\w+)", schema))

    # Every column named in an UPDATE/INSERT against `users`, anywhere.
    written = set()
    for path in backend.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv"} & set(path.parts):
            continue
        src = code_only(path)
        for stmt in re.findall(r"UPDATE\s+users\s+SET\s+(.*?)(?:WHERE|\"\"\"|')", src,
                               re.S | re.I):
            written.update(re.findall(r"(\w+)\s*=", stmt))

    # `id` is the primary key from the original CREATE and is never added.
    missing = sorted(c for c in written - altered if c != "id")
    assert missing == [], (
        "these columns are written to `users` but have no "
        "ALTER TABLE ... ADD COLUMN IF NOT EXISTS: " + ", ".join(missing) +
        " — on a database that predates them the CREATE is a no-op, the "
        "column is absent, and every write throws UndefinedColumn. This "
        "cannot be caught by a test against a fresh database.")


def test_the_sweep_is_reading_a_plausible_corpus():
    """A scanner that finds no writes exempts every column."""
    import re
    from pathlib import Path

    from tests.source_text import code_only

    backend = Path(__file__).resolve().parents[1]
    found = 0
    for path in backend.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv"} & set(path.parts):
            continue
        found += len(re.findall(r"UPDATE\s+users\s+SET", code_only(path), re.I))
    assert found >= 3, (
        f"only {found} writes to `users` found — the sweep is no longer "
        "reading the statements it was written to guard")


# ══════════════════════════════════════════════════════════════════════
# 6. LEGAL1 — no consent is collected that cannot be honoured
# ══════════════════════════════════════════════════════════════════════

def test_registration_does_not_accept_a_marketing_consent():
    """`subscribe` was accepted here and written to `users`, then appeared
    NOWHERE ELSE in 119 endpoints — no response, no profile field, no
    patch path, no unsubscribe endpoint, while /admin/emails exists.

    Unreadable, unmodifiable by the person who gave it, unproducible by
    support, unhonourable. Mailing a list whose consent cannot be
    produced and which offers no way out is a CAN-SPAM problem.

    OWNER-RULED: stop collecting it. Collecting consent we cannot honour
    is worse than not collecting it — it manufactures a record that
    looks like permission and cannot function as one.

    THE COLUMN STAYS and existing rows are untouched: dropping a column
    is a data operation, and those values are evidence of what was
    collected even though they are unusable as permission.

    This pin is what stops HALF the lifecycle reappearing. If collection
    comes back, it comes back with a read path, a patch path, an
    unsubscribe endpoint and a List-Unsubscribe header — or not at all.
    """
    from pathlib import Path

    from tests.source_text import code_only

    backend = Path(__file__).resolve().parents[1]
    src = code_only(backend / "routers" / "users_auth.py")

    model = src[src.index("class UserRegister"):]
    model = model[: model.index("class UserLogin")]
    assert "subscribe" not in model, (
        "registration accepts a marketing consent again — it must arrive "
        "with a read path, a patch path and an unsubscribe endpoint, or "
        "not at all")

    # And it is not written on the way past either. The checkbox going
    # while the write stayed would be the worst of both: still collected,
    # no longer even asked for.
    handler = src[src.index("INSERT INTO users"):]
    handler = handler[:600]
    assert "subscribe" not in handler, (
        "the registration INSERT still writes a consent nothing can read")
