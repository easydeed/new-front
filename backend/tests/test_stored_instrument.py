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
