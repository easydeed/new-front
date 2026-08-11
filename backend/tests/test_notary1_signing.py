"""NOTARY1 — the signing handoff, and the lines it must not cross.

Four rulings shape this suite, and each one has a pin that fails LOUDLY
rather than a comment that asks nicely:

  1. NO SIGNER CONTACT, ANYWHERE. Fail-closed, like the row-contract
     sweep: a new `signer_email`-shaped field anywhere in the backend
     fails this suite, whether or not anybody thought to update it.
  2. ONE EXPIRY SEMANTIC PER LINK. The deed, the PDF and the PCOR answer
     an expired token identically.
  3. WHO ASSERTED THE TIME IS ON THE ROW (RED-S4's shape). Notary and
     officer are both humans and both recorded; they are recorded apart.
  4. THE SYSTEM NEVER ASSERTS A SIGNING OCCURRED. No auto-completion, no
     timer, no inference from a passed window.

Plus the defect this ticket found on the way past: `POST /shared-deeds`
never checked whose deed it was sharing.

The pins that need no database run everywhere; the executable ones skip
without DATABASE_URL. Both conditions are run locally before reporting —
CI has a `test` job with no database and a `proof-harnesses` job with
one, and a test that only passes with a database is red in the first.
"""
import ast
import json
import os
import re
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from tests.source_text import code_only  # noqa: E402

from services import signing  # noqa: E402

SHARING = BACKEND / "routers" / "sharing.py"
ROW_BUILDER = BACKEND / "services" / "shared_deed_row.py"


# ══════════════════════════════════════════════════════════════════════
# Ruling 1 — no signer contact, fail-closed
# ══════════════════════════════════════════════════════════════════════

# The shapes a signer's contact details would arrive in. This enumerates
# the PROPERTY (a way to reach a grantor or grantee) rather than the
# spellings somebody happened to use — the recurring lesson from the
# banned-claims gate, applied before there is anything to catch.
_PARTY = r"(signer|grantor|grantee|buyer|seller|borrower|party|parties)"
_CONTACT = r"(email|phone|mobile|cell|sms|contact|notify|notification)"
SIGNER_CONTACT = re.compile(
    rf"\b({_PARTY}_{_CONTACT}|{_CONTACT}_{_PARTY})\b", re.IGNORECASE)

# `recipient_email` is the NOTARY's or the reviewer's address — a
# professional the officer chose, not a consumer we found on a deed. It
# is the one contact column the product has, and it is not a party's.
ALLOWED = {"recipient_email", "owner_email", "contact_email", "admin_email"}


def _python_sources():
    for path in BACKEND.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv"} & set(path.parts):
            continue
        yield path


def test_no_signer_contact_field_exists_anywhere():
    """FAIL-CLOSED (owner-ruled), the way the row-contract pin works.

    Signers are consumers. They have no account, never agreed to our
    terms, cannot see what we hold and cannot ask us to delete it.
    Storing a grantor's email would change what a database dump IS, and
    it would do so to automate a message the officer is better placed to
    send herself.

    So this does not check that the signing feature avoided it — it
    checks the WHOLE BACKEND, so the field cannot arrive quietly in some
    unrelated ticket six months from now. `deeds` carries party NAMES
    because names print on the instrument; that is the whole of it.
    """
    offenders = []
    for path in _python_sources():
        src = code_only(path)
        for match in SIGNER_CONTACT.finditer(src):
            if match.group(0).lower() in ALLOWED:
                continue
            line = src[:match.start()].count("\n") + 1
            offenders.append(f"{path.relative_to(BACKEND)}:{line} → {match.group(0)}")
    assert offenders == [], (
        "signer contact data appeared in the backend: " + "; ".join(offenders) +
        " — the product coordinates officer↔notary and messages no signer "
        "(owner ruling 1). If this is genuinely not a party's contact "
        "details, name it so that is obvious and add it to ALLOWED here.")


def test_no_signer_contact_column_in_the_schema():
    """The same rule where it would actually bite: the DDL."""
    src = code_only(BACKEND / "database.py")
    offenders = [m.group(0) for m in SIGNER_CONTACT.finditer(src)
                 if m.group(0).lower() not in ALLOWED]
    assert offenders == [], f"schema would store signer contact data: {offenders}"


# FLOW1 item 6: `test_the_signing_request_payload_cannot_carry_a_signer`
# RETIRED WITH THE MODEL IT GUARDED. It asserted the exact field set of
# `SigningRequestCreate`, so that a `signer_email` could not arrive on
# NOTARY1's create payload unnoticed. That route and that model are gone.
#
# It is NOT re-pointed at NOTARY2's create payload, and that is the
# doctrinal part rather than a convenience: §13.1 REVERSED the no-signer
# -contact ruling. `POST /signing-requests/v2` carries signer names,
# emails and phones on purpose, into `signing_participants`, purged on a
# schedule by a job with its own tests. A pin demanding the opposite
# would be asserting a rule the owner overturned.
#
# The tree-wide sweep above (`test_no_signer_contact_field_exists_
# anywhere`) is the one that still matters, and it was retargeted when
# NOTARY2 shipped — from "no signer contact anywhere" to "one purgeable
# row, no other table". Nothing about signer contact is unpinned by this
# removal.


# ══════════════════════════════════════════════════════════════════════
# The state is DERIVED (T-5's ruling, transferred)
# ══════════════════════════════════════════════════════════════════════

def test_scheduling_is_never_written_into_status():
    """T-5 refused to add `superseded` to `deeds.status` because two
    orthogonal facts cannot share one column without one of them becoming
    unsayable. A signing request that has been VIEWED and SCHEDULED is
    the normal case; folding `scheduled` into `status` makes it
    inexpressible."""
    src = code_only(SHARING)
    bad = re.findall(r"status\s*=\s*'(scheduled|proposed|completed)'", src)
    assert bad == [], f"scheduling leaked into deed_shares.status: {bad}"

    for statement in ("SET scheduled_at", "scheduled_by"):
        assert statement in src, f"{statement} should be its own column"


def test_scheduling_state_is_computed_not_stored():
    assert signing.scheduling_state({"share_kind": "review"}) is None
    proposed = {"share_kind": "signing_request",
                "proposed_windows": [{"start": "2026-09-01T10:00:00-07:00",
                                      "end": "2026-09-01T11:00:00-07:00"}]}
    assert signing.scheduling_state(proposed) == "proposed"
    proposed["scheduled_at"] = datetime(2026, 9, 1, 10, tzinfo=timezone.utc)
    assert signing.scheduling_state(proposed) == "scheduled"


def _tree(path: Path) -> ast.Module:
    """Parse the RAW source, not the comment-stripped text.

    Twelve trips have gone the other way — a pin reading source as text
    and failing on the comment that explains the removal — so the reflex
    is to reach for `code_only`. It is the wrong tool here and actively
    breaks: stripping docstrings leaves `class X(ValueError):` with an
    empty body, which does not parse. An AST cannot see a comment, so
    there is nothing to strip. Use `code_only` for TEXT pins and the raw
    file for AST pins.
    """
    return ast.parse(path.read_text(encoding="utf-8"))


def _body_without_docstring(fn: ast.FunctionDef) -> str:
    """The function's CODE. The docstring is prose about the code, and a
    pin that reads it is a pin that fails when the prose explains why the
    thing it forbids is forbidden."""
    body = fn.body
    if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant) \
            and isinstance(body[0].value.value, str):
        body = body[1:]
    return "\n".join(ast.unparse(node) for node in body)


def test_there_is_no_state_meaning_it_happened():
    """Rule 4, at the level of the vocabulary. A function that cannot
    return "completed" cannot be talked into returning it."""
    tree = _tree(BACKEND / "services" / "signing.py")
    fn = next(n for n in ast.walk(tree)
              if isinstance(n, ast.FunctionDef) and n.name == "scheduling_state")
    returned = {n.value.value for n in ast.walk(fn)
                if isinstance(n, ast.Return) and isinstance(n.value, ast.Constant)}
    ifexp = {c.value for n in ast.walk(fn) if isinstance(n, ast.IfExp)
             for c in (n.body, n.orelse) if isinstance(c, ast.Constant)}
    vocabulary = {v for v in returned | ifexp if isinstance(v, str)}
    assert vocabulary <= {"proposed", "scheduled"}, (
        f"scheduling_state can say {vocabulary} — a state meaning the "
        "signing happened is exactly what rule 1 forbids")


def test_nothing_auto_completes_a_signing():
    """No timer, no passed-window inference, nowhere.

    Read the CODE, not the prose: both modules discuss `completed` at
    length in their docstrings — explaining why the officer alone may set
    it — and a pin that read those would be the thirteenth trip on a
    comment explaining the very thing it forbids.
    """
    code = "\n".join(
        _body_without_docstring(fn)
        for path in (SHARING, BACKEND / "services" / "signing.py")
        for fn in ast.walk(_tree(path))
        if isinstance(fn, ast.FunctionDef)
    )
    assert "completed" not in code, (
        "the signing path mentions completion in executable code — "
        "`completed` is the officer's word and nothing here may set it")
    assert not re.search(r"scheduled_at\s*[<>]", code), (
        "something compares a scheduled time to something — a window that "
        "has passed is not evidence that anybody met")


def test_the_label_never_promises_the_signing_will_happen():
    """A notary tapping a window asserts AVAILABILITY, not attendance."""
    row = {"share_kind": "signing_request",
           "scheduled_at": datetime(2026, 9, 1, 10, tzinfo=timezone.utc),
           "scheduled_by": "notary"}
    label = signing.scheduling_label(row)
    for promise in ("will happen", "will be signed", "will take place",
                    "is confirmed for", "guaranteed"):
        assert promise not in label.lower(), f"the label promises: {label}"
    assert "availability" in label.lower()

    row["scheduled_by"] = "officer"
    assert "you recorded" in signing.scheduling_label(row).lower()

    # An asserter we do not recognise is not licence to describe the
    # arrangement as anybody's.
    row["scheduled_by"] = "wat"
    assert "notary" not in signing.scheduling_label(row).lower()


def test_every_surface_takes_its_words_from_one_place():
    """`scheduling_label` exists so the wording cannot drift screen by
    screen. A router that composed its own sentence would defeat it.

    FLOW1 note: the count spans the ROUTER AND THE ROW BUILDER, because
    the officer's list moved its row construction into
    services/shared_deed_row.py. A count pinned to one file would have
    read that move as a regression — it is the opposite — and the
    property being pinned was never "four calls in sharing.py". It is
    "every surface that says something about a scheduling state got the
    sentence from the one function that writes them".
    """
    sources = [code_only(SHARING), code_only(ROW_BUILDER)]
    calls = sum(s.count("signing.scheduling_label(") for s in sources)
    assert calls >= 4, f"only {calls} surfaces take their words from one place"
    for src in sources:
        assert not re.search(r'f?"[^"]*[Ss]cheduled for', src), (
            "a surface is writing its own scheduling sentence")


# ══════════════════════════════════════════════════════════════════════
# Windows
# ══════════════════════════════════════════════════════════════════════

def test_at_most_three_windows():
    four = [{"start": f"2026-09-0{i}T10:00:00-07:00",
             "end": f"2026-09-0{i}T11:00:00-07:00"} for i in range(1, 5)]
    with pytest.raises(signing.SigningRequestError):
        signing.normalize_windows(four)


def test_a_window_that_ends_before_it_starts_is_refused():
    with pytest.raises(signing.SigningRequestError):
        signing.normalize_windows([{"start": "2026-09-01T11:00:00-07:00",
                                    "end": "2026-09-01T10:00:00-07:00"}])


def test_the_officers_offset_survives_storage():
    """Times are stored as entered. A signing happens at a place, in that
    place's time, and helpfully normalising to UTC for display is how
    somebody arrives an hour late."""
    stored = signing.normalize_windows(
        [{"start": "2026-09-01T10:00:00-07:00", "end": "2026-09-01T11:00:00-07:00"}])
    assert stored[0]["start"].endswith("-07:00")


def test_a_notary_can_only_choose_a_window_that_was_offered():
    row = {"proposed_windows": [{"start": "2026-09-01T10:00:00-07:00",
                                 "end": "2026-09-01T11:00:00-07:00"}]}
    assert signing.find_window(row, 0) is not None
    for bad in (1, -1, 99, "x", None):
        assert signing.find_window(row, bad) is None


def test_the_ics_is_a_copy_not_an_invitation():
    """METHOD:PUBLISH, not REQUEST. REQUEST makes it an invitation with
    an organiser expecting RSVPs; this is a copy of an arrangement for
    the notary to file."""
    ics = signing.build_ics(
        summary="Notary signing", start=datetime(2026, 9, 1, 17, tzinfo=timezone.utc),
        end=datetime(2026, 9, 1, 18, tzinfo=timezone.utc),
        location="123 Main St", description="x", uid="u@deedpro").decode()
    assert "METHOD:PUBLISH" in ics
    assert "METHOD:REQUEST" not in ics
    assert "ATTENDEE" not in ics
    assert "DTSTART:20260901T170000Z" in ics
    assert ics.endswith("END:VCALENDAR\r\n")


def test_ics_escapes_the_characters_that_would_break_it():
    ics = signing.build_ics(
        summary="A; B, C", start=datetime(2026, 9, 1, tzinfo=timezone.utc),
        end=datetime(2026, 9, 1, 1, tzinfo=timezone.utc),
        location=None, description="line\nbreak", uid="u@deedpro").decode()
    assert r"SUMMARY:A\; B\, C" in ics
    assert r"DESCRIPTION:line\nbreak" in ics


# ══════════════════════════════════════════════════════════════════════
# The transport carries the .ics through the ONE choke point
# ══════════════════════════════════════════════════════════════════════

def test_the_attachment_rides_the_one_transport():
    """ADMIN3's pin says exactly one call reaches the sender. A
    `send_email_with_attachment` twin would have satisfied that pin's
    letter while destroying what it protects — the ledger row."""
    import inspect
    from utils import email as email_mod
    from utils import notifications as notif

    assert "attachments" in inspect.signature(
        email_mod.send_email_with_reason).parameters
    assert "attachments" in inspect.signature(notif._send).parameters
    src = code_only(BACKEND / "utils" / "notifications.py")
    assert len(re.findall(r"send_email_with_reason\(", src)) == 1


def test_an_unsendable_attachment_does_not_vanish(monkeypatch):
    """§4: a failure carries its why. An .ics that could not be encoded
    must fail the send with a reason, not go out silently without it."""
    monkeypatch.setenv("SENDGRID_API_KEY", "SG.test")
    monkeypatch.setenv("SENDGRID_FROM_EMAIL", "owner@example.com")
    from unittest.mock import MagicMock, patch
    from utils.email import send_email_with_reason

    fake = MagicMock()
    with patch("sendgrid.SendGridAPIClient", fake):
        ok, reason = send_email_with_reason(
            "n@test.dev", "s", "<p>b</p>", "b",
            [{"filename": "x.ics", "content": object(), "mime": "text/calendar"}])
    assert ok is False
    assert reason


# ══════════════════════════════════════════════════════════════════════
# The ownership defect this ticket found (source pins; behaviour below)
# ══════════════════════════════════════════════════════════════════════

def test_every_share_creation_resolves_the_deed_through_the_owner_check():
    """THE CLASS, not the one site.

    `POST /shared-deeds` took `deed_id` from the request body and never
    asked whose deed it was — so any authenticated user could mint a
    share link for anyone's deed. This sweeps every function that writes
    a `deed_shares` row and requires it to have gone through
    `_owned_deed_or_404` first, so the next creation path cannot repeat
    it by being written somewhere else in the file.
    """
    offenders = []
    for fn in ast.walk(_tree(SHARING)):
        if not isinstance(fn, ast.FunctionDef):
            continue
        code = _body_without_docstring(fn)
        if "INSERT INTO deed_shares" not in code:
            continue
        if "_owned_deed_or_404" not in code:
            offenders.append(fn.name)
    assert offenders == [], (
        f"these create a share without checking who owns the deed: {offenders}")


def test_every_public_token_endpoint_validates_first():
    """Moved here from test_share_pdf_source.py, and changed from a count
    to a property.

    `deed_shares.token` is a UUID column, so a malformed token is not a
    miss — it is a TYPE ERROR from Postgres, and on the shared connection
    it aborts the transaction and poisons every later query in the
    request. The old pin asserted the number of guard calls was 3, which
    was a fact about that afternoon's routes: it went red when NOTARY1
    added three endpoints, and it would have stayed GREEN for a fourth
    endpoint added while a fifth dropped its guard.

    It also lived in a module that skips without a database, so a source
    pin never ran in CI's no-database job.
    """
    offenders = []
    for fn in ast.walk(_tree(SHARING)):
        if not isinstance(fn, ast.FunctionDef):
            continue
        routes = [ast.unparse(d) for d in fn.decorator_list]
        if not any("{approval_token}" in r for r in routes):
            continue
        if "_valid_token_or_404" not in ast.unparse(fn):
            offenders.append(fn.name)
    assert offenders == [], (
        f"public token endpoints that query without validating first: {offenders}")


def test_the_owner_check_is_not_bypassable_by_an_admin_role():
    """Read and grant are different verbs. `_pcor_deed_row` lets an admin
    READ a deed for support; minting a link for a third party is not
    something support access authorises."""
    fn = next(f for f in ast.walk(_tree(SHARING))
              if isinstance(f, ast.FunctionDef) and f.name == "_owned_deed_or_404")
    # The docstring EXPLAINS the exclusion and therefore says "admin" —
    # reading it would be the twelfth trip on a comment, one file over.
    assert "admin" not in _body_without_docstring(fn).lower()


# ══════════════════════════════════════════════════════════════════════
# Executable — needs a database
# ══════════════════════════════════════════════════════════════════════

dbonly = pytest.mark.skipif(not os.getenv("DATABASE_URL"),
                            reason="needs a database")


@pytest.fixture
def world():
    """Two users and a deed each — the shape every authorization question
    here needs, and the shape the IDOR was found with."""
    import psycopg2
    from database import create_tables
    from db_rows import ROW_FACTORY
    create_tables()
    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    conn.autocommit = True
    tag = uuid.uuid4().hex[:8]
    made = {"users": [], "deeds": []}
    with conn.cursor() as cur:
        for who in ("officer", "stranger"):
            cur.execute(
                "INSERT INTO users (email, password_hash, full_name, role) "
                "VALUES (%s, 'x', %s, 'user') RETURNING id",
                (f"{who}-{tag}@notary1.test", who.title()))
            made["users"].append(cur.fetchone()["id"])
        cur.execute(
            """INSERT INTO deeds (user_id, deed_type, property_address, apn,
                                  grantor_name, grantee_name, county, status)
               VALUES (%s, 'grant_deed', '9 Private Way, Los Angeles, CA',
                       '1234-567-890', 'PRIVATE GRANTOR', 'PRIVATE GRANTEE',
                       'Los Angeles', 'completed') RETURNING id""",
            (made["users"][0],))
        made["deeds"].append(cur.fetchone()["id"])
    made["conn"] = conn
    yield made
    conn.close()


def _client_for(user_id: int, email: str = "x@notary1.test"):
    from fastapi.testclient import TestClient
    from auth import create_access_token
    from main import app
    token = create_access_token({"sub": str(user_id), "email": email})
    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


def _windows(days_out: int = 3):
    base = datetime.now(timezone.utc) + timedelta(days=days_out)
    return [{"start": (base + timedelta(hours=h)).isoformat(),
             "end": (base + timedelta(hours=h + 1)).isoformat()}
            for h in (0, 24)]



def _make_notary1_share(world, *, owner_index: int = 0,
                        notary_email: str = "n@notary1.test",
                        windows=None, expires_in_hours: int = 336) -> dict:
    """A NOTARY1 signing share, INSERTED DIRECTLY.

    ═══ WHY A FIXTURE AND NOT THE ROUTE ═══

    FLOW1 item 6 retired `POST /signing-requests`. Every test below used
    to build its subject by calling it, so removing the route would have
    taken nine read-side pins with it — and those pins are not about
    creating a NOTARY1 signing. They are about what the product does with
    one that EXISTS: an expired link answers identically on the deed, the
    PDF and the PCOR; a revoked link stops answering; a notary cannot
    assert a time nobody proposed; a stranger cannot record a time on
    somebody else's request; the reminder does not ask a notary about a
    review; the officer's list carries the server's status line.

    Those rules still matter, because the DATA still matters. The columns
    were deliberately not dropped: production has zero such rows (owner's
    dry-run, confirmed against `deedpro` at 10.26.62.147), but production
    is not the only database this schema runs on, and the migration
    script must keep being able to read a row it might find elsewhere.

    Deleting the tests with the route would have been the easy read of
    "retire the write path", and it would have unpinned the behaviour
    that governs the data we chose to keep. So the fixture writes the row
    the way the migration would find it, and the rules stay pinned.
    """
    import uuid as _uuid
    from datetime import datetime as _dtc, timedelta as _td, timezone as _tzc

    token = str(_uuid.uuid4())
    windows = windows if windows is not None else _windows()
    expires_at = _dtc.now(_tzc.utc) + _td(hours=expires_in_hours)
    with world["conn"].cursor() as cur:
        cur.execute("""
            INSERT INTO deed_shares (
                deed_id, owner_user_id, recipient_email, token,
                status, share_kind, proposed_windows, expires_at,
                created_at, updated_at
            )
            VALUES (%s, %s, %s, %s, 'sent', %s, %s::jsonb, %s, NOW(), NOW())
            RETURNING id
        """, (world["deeds"][0], world["users"][owner_index], notary_email,
              token, signing.SHARE_KIND_SIGNING, json.dumps(windows), expires_at))
        share_id = cur.fetchone()["id"]
    return {"share_id": share_id, "token": token, "windows": windows}


@dbonly
def test_a_stranger_cannot_share_a_deed_they_do_not_own(world):
    """THE DEFECT, reproduced. Before the fix this returned 200 with the
    property address in the body and a working token."""
    officer, stranger = world["users"]
    deed = world["deeds"][0]
    r = _client_for(stranger).post("/shared-deeds", json={
        "deed_id": deed, "recipient_email": "third@party.test",
        "recipient_role": "Other"})
    assert r.status_code == 404, r.text
    assert "Private Way" not in r.text
    assert "PRIVATE GRANTOR" not in r.text


# FLOW1 item 6: `test_a_stranger_cannot_request_a_signing_on_someone_
# elses_deed` retired with the route it exercised. The ownership rule it
# guarded is NOT unpinned — `_owned_deed_or_404` still gates
# `POST /shared-deeds` (pinned directly above) and `POST /signing-requests
# /v2` (pinned in test_notary2_routes.py). What retired is the third
# caller of that helper, not the helper or the rule.


@dbonly
def test_the_whole_handoff(world):
    """Officer asks → notary sees windows and no approve buttons → notary
    taps one → the record says who said so and when."""
    from fastapi.testclient import TestClient
    from main import app

    officer = world["users"][0]
    token = _make_notary1_share(world, notary_email="notary@notary1.test")["token"]

    public = TestClient(app)
    view = public.get(f"/approve/{token}")
    assert view.status_code == 200, view.text
    package = view.json()
    assert package["share_kind"] == "signing_request"
    assert package["can_approve"] is False, "a signing request has no approval"
    assert package["signing"]["state"] == "proposed"
    assert len(package["signing"]["windows"]) == 2

    # The approval route refuses it as a RULE, not as a hidden button.
    refused = public.post(f"/approve/{token}", json={"approved": True})
    assert refused.status_code == 409, refused.text

    # High-water marks BEFORE the tap. `email_log` and `notifications`
    # are append-only and survive between runs, so "a row with this
    # template exists" is satisfied by yesterday's row — the first draft
    # of the assertion below passed with the send deliberately broken,
    # which is the whole reason a green result gets probed.
    with world["conn"].cursor() as cur:
        cur.execute("SELECT COALESCE(MAX(id), 0) AS m FROM email_log")
        email_mark = cur.fetchone()["m"]
        cur.execute("SELECT COALESCE(MAX(id), 0) AS m FROM notifications")
        note_mark = cur.fetchone()["m"]

    chosen = public.post(f"/approve/{token}/schedule", json={"window_index": 1})
    assert chosen.status_code == 200, chosen.text
    assert chosen.json()["scheduled_by"] == "notary"

    after = public.get(f"/approve/{token}").json()
    assert after["signing"]["state"] == "scheduled"
    assert "availability" in after["signing"]["summary"].lower()

    # RED-S4's shape, on the row: the value, who asserted it, and when.
    with world["conn"].cursor() as cur:
        cur.execute("SELECT status, share_kind, scheduled_at, scheduled_by, "
                    "scheduled_asserted_at FROM deed_shares WHERE token = %s",
                    (token,))
        row = cur.fetchone()
    assert row["share_kind"] == "signing_request"
    assert row["scheduled_by"] == "notary"
    assert row["scheduled_at"] is not None
    assert row["scheduled_asserted_at"] is not None
    # T-5: the two facts never share a column.
    assert row["status"] in ("sent", "viewed")

    # The officer was told, and the ATTEMPT is on the ledger whether or
    # not a transport is configured (ADMIN3). This is also the only thing
    # that proves the .ics was built and handed to the sender — the
    # attachment path runs before the transport reports its outcome, so a
    # row here means the whole chain executed rather than raising into
    # the best-effort catch.
    with world["conn"].cursor() as cur:
        cur.execute("SELECT template, recipient FROM email_log "
                    "WHERE template = 'signing_time_recorded' AND id > %s "
                    "ORDER BY id DESC LIMIT 1", (email_mark,))
        logged = cur.fetchone()
        cur.execute("SELECT type, message FROM notifications "
                    "WHERE type = 'signing_scheduled' AND id > %s "
                    "ORDER BY id DESC LIMIT 1", (note_mark,))
        note = cur.fetchone()
    assert logged is not None, "the officer's email was never attempted"
    assert note is not None, "the in-app record is missing — E1's unlosable copy"
    for promise in ("will happen", "confirmed for"):
        assert promise not in note["message"].lower()


@dbonly
def test_a_notary_cannot_assert_a_time_nobody_proposed(world):
    from fastapi.testclient import TestClient
    from main import app
    officer = world["users"][0]
    token = _make_notary1_share(world)["token"]
    r = TestClient(app).post(f"/approve/{token}/schedule", json={"window_index": 7})
    assert r.status_code == 400


@dbonly
def test_the_officer_may_record_a_time_agreed_out_of_band(world):
    """Owner ruling 3 — and the record keeps the two assertions apart."""
    officer = world["users"][0]
    client = _client_for(officer)
    made = _make_notary1_share(world)
    r = client.post(f"/shared-deeds/{made['share_id']}/schedule",
                    json={"scheduled_at": "2026-09-15T10:00:00-07:00"})
    assert r.status_code == 200, r.text
    assert r.json()["scheduled_by"] == "officer"
    assert "you recorded" in r.json()["message"].lower()

    with world["conn"].cursor() as cur:
        cur.execute("SELECT scheduled_by, scheduled_asserted_at FROM deed_shares "
                    "WHERE id = %s", (made["share_id"],))
        row = cur.fetchone()
    assert row["scheduled_by"] == "officer"
    assert row["scheduled_asserted_at"] is not None


@dbonly
def test_a_stranger_cannot_record_a_time_on_someone_elses_request(world):
    officer, stranger = world["users"]
    made = _make_notary1_share(world)
    r = _client_for(stranger).post(f"/shared-deeds/{made['share_id']}/schedule",
                                   json={"window_index": 0})
    assert r.status_code == 404, r.text


@dbonly
def test_one_expiry_semantic_per_link(world):
    """Ruling 2, applied as a class. An expired token answers the deed,
    the PDF and the PCOR the same way — 410 — because "which URL did you
    ask" is not a property a permission may have.

    This also covers the second defect the ticket found: the deed view
    used to 410 only when the status was still 'sent', so a link that had
    been OPENED once kept serving the deed after expiry forever.
    """
    from fastapi.testclient import TestClient
    from main import app

    officer = world["users"][0]
    made = _make_notary1_share(world)
    token = made["token"]

    public = TestClient(app)
    assert public.get(f"/approve/{token}").status_code == 200  # marks it viewed

    with world["conn"].cursor() as cur:
        cur.execute("UPDATE deed_shares SET expires_at = NOW() - INTERVAL '1 day' "
                    "WHERE token = %s", (token,))

    for url in (f"/approve/{token}", f"/approve/{token}/pdf",
                f"/approve/{token}/pcor", f"/approve/{token}/pcor.pdf"):
        assert public.get(url).status_code == 410, f"{url} still answers an expired link"
    assert public.post(f"/approve/{token}/schedule",
                       json={"window_index": 0}).status_code == 410


@dbonly
def test_a_revoked_link_stops_answering(world):
    from fastapi.testclient import TestClient
    from main import app
    officer = world["users"][0]
    client = _client_for(officer)
    made = _make_notary1_share(world)
    assert client.post(f"/shared-deeds/{made['share_id']}/revoke").status_code == 200
    public = TestClient(app)
    assert public.get(f"/approve/{made['token']}/pcor").status_code == 403
    assert public.post(f"/approve/{made['token']}/schedule",
                       json={"window_index": 0}).status_code == 403


@dbonly
def test_a_review_token_does_not_open_the_pcor_route(world):
    """The PCOR travels with the signing link, not with every link we
    have ever issued."""
    from fastapi.testclient import TestClient
    from main import app
    officer = world["users"][0]
    made = _client_for(officer).post("/shared-deeds", json={
        "deed_id": world["deeds"][0], "recipient_email": "r@notary1.test",
        "recipient_role": "Other"}).json()
    token = made["shared_deed"]["approval_token"]
    assert TestClient(app).get(f"/approve/{token}/pcor").status_code == 404


@dbonly
def test_a_signing_request_is_stored_before_anybody_is_emailed(world):
    """§4 applied to the create path: a notary holding a link to a row
    that does not exist is worse than an officer who knows her request
    did not go out."""
    officer = world["users"][0]
    made = _make_notary1_share(world)
    with world["conn"].cursor() as cur:
        cur.execute("SELECT proposed_windows FROM deed_shares WHERE id = %s",
                    (made["share_id"],))
        stored = cur.fetchone()["proposed_windows"]
    stored = json.loads(stored) if isinstance(stored, str) else stored
    assert len(stored) == 2


@dbonly
def test_the_reminder_does_not_ask_a_notary_about_a_review(world):
    officer = world["users"][0]
    client = _client_for(officer)
    made = _make_notary1_share(world)
    r = client.post(f"/shared-deeds/{made['share_id']}/resend")
    assert r.status_code == 400
    assert "wrong question" in r.text


@dbonly
def test_the_officers_list_carries_the_status_line(world):
    officer = world["users"][0]
    client = _client_for(officer)
    _make_notary1_share(world)
    rows = client.get("/shared-deeds").json()
    signings = [r for r in rows if r.get("share_type") == "signing_request"]
    assert signings, "the signing request is missing from the officer's list"
    assert signings[0]["signing_summary"], "no status line for the deed surface"
    reviews = [r for r in rows if r.get("share_type") == "review"]
    for r in reviews:
        assert r.get("signing_summary") is None, (
            "a review share grew a scheduling line")
