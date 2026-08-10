"""NOTARY2 — the coordination loop, and the pin that was ANSWERED.

═══ THE RETARGETED SWEEP ═══

NOTARY1 pinned "no signer contact anywhere," fail-closed across the whole
backend, precisely so that adding it would be a deliberate act that trips
a test rather than a diff nobody read. §13.1 reversed the ruling, so the
pin is being ANSWERED rather than deleted — narrowed to the promise we
can actually keep:

    was:  no signer contact exists anywhere in the product
    is:   signer contact exists on ONE table, reaches no other, and is
          deleted on a schedule by a mechanism with a test

The new sweep is stricter in the way that matters. "Anywhere" was easy to
satisfy and easy to abandon; "exactly one table, and here is the purge"
is a claim with three separate ways to fail, and all three are pinned
below.
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

from services import signing_loop as loop  # noqa: E402
from services import signing_surfaces as surfaces  # noqa: E402

DATABASE = BACKEND / "database.py"


# ══════════════════════════════════════════════════════════════════════
# §13.1 — one table holds signer contact, and no other
# ══════════════════════════════════════════════════════════════════════

# The PROPERTY: a way to reach a grantor, grantee or signer.
_PARTY = r"(signer|grantor|grantee|buyer|seller|borrower)"
_CONTACT = r"(email|phone|mobile|cell|sms|contact)"
SIGNER_CONTACT = re.compile(
    rf"\b({_PARTY}_{_CONTACT}|{_CONTACT}_{_PARTY})\b", re.IGNORECASE)

# Tables that must NEVER carry it. `parties` is a JSONB column on deeds
# rather than a table, so it is covered by the JSONB pin below.
FORBIDDEN_TABLES = ("deeds", "users", "partners", "user_profiles", "deed_shares")


def _ddl_for(table: str) -> str:
    """The CREATE body plus every ALTER naming this table.

    The first draft closed the CREATE block on the first `)\"\"\"` it could
    find, which is not the table's closing paren when the body contains
    one — so scanning `users` swallowed everything down to the next
    triple-quote and reported a column belonging to `deeds` as if it were
    on `users`. It over-matched, so it could only produce FALSE ALARMS
    rather than misses, but a pin that names the wrong table sends
    somebody to the wrong file. Found by mutation-probing this suite,
    which is the whole reason for probing a green result.

    Paren counting, so the block ends where the table ends.
    """
    src = DATABASE.read_text(encoding="utf-8")
    chunks = []
    marker = f"CREATE TABLE IF NOT EXISTS {table} ("
    at = src.find(marker)
    while at != -1:
        i = at + len(marker)
        depth = 1
        while i < len(src) and depth:
            if src[i] == "(":
                depth += 1
            elif src[i] == ")":
                depth -= 1
            i += 1
        chunks.append(src[at:i])
        at = src.find(marker, i)
    for match in re.finditer(rf"\"ALTER TABLE {table} [^\"]*\"", src):
        chunks.append(match.group(0))
    return "\n".join(chunks)


def test_signer_contact_reaches_no_other_table():
    """THE RETARGETED PIN. Not "nowhere" any more — "nowhere else".

    A signer's email on `deeds` would put third-party contact data on
    every deed row, which changes what a database dump IS. That was the
    original objection and the reversal does not touch it: what changed
    is that the officer may now coordinate WITH signers, not that their
    details may spread.
    """
    offenders = []
    for table in FORBIDDEN_TABLES:
        ddl = _ddl_for(table)
        for match in SIGNER_CONTACT.finditer(ddl):
            offenders.append(f"{table} → {match.group(0)}")
    assert offenders == [], (
        f"signer contact reached a table it must not: {offenders} — §13.1 "
        "allows it on signing_participants and nowhere else")


def test_exactly_one_table_holds_it():
    """And that table is the one with the purge machinery on it."""
    src = code_only(DATABASE)
    creates = re.findall(r"CREATE TABLE IF NOT EXISTS (\w+) \((.*?)\n\s*\)",
                         src, re.DOTALL)
    holders = [
        name for name, body in creates
        if re.search(r"\bemail\b", body) and re.search(r"\bcontact_purged_at\b", body)
    ]
    assert holders == ["signing_participants"], (
        f"tables holding purgeable contact: {holders} — there must be exactly "
        "one, or the purge is a claim about a place rather than a mechanism")


def test_the_parties_jsonb_never_carries_a_way_to_reach_anybody():
    """`deeds.parties` holds NAMES because names print on the instrument.

    It is a JSONB column, so the schema cannot constrain it — which makes
    the writer the only place a pin can stand.
    """
    offenders = []
    for path in BACKEND.rglob("*.py"):
        if {"tests", "__pycache__"} & set(path.parts):
            continue
        src = code_only(path)
        for match in re.finditer(r"parties\[[\"']([a-z_]+)[\"']\]|"
                                 r"parties\.get\([\"']([a-z_]+)[\"']", src):
            key = match.group(1) or match.group(2)
            if re.search(_CONTACT, key, re.IGNORECASE):
                offenders.append(f"{path.relative_to(BACKEND)} → parties[{key}]")
    assert offenders == [], f"a contact detail was written into deeds.parties: {offenders}"


def test_the_purge_exists_and_is_reachable_two_ways():
    """Owner ruling 3: build both halves. The script ships ready for a
    cron service that does not exist yet; the in-request sweep ships
    working. A purge that is only a script is a discipline."""
    from services import signing_purge
    assert callable(signing_purge.purge_signer_contact)
    assert callable(signing_purge.sweep_if_due)
    assert (BACKEND / "scripts" / "purge_signer_contact.py").exists()
    # And the script names the Tier-3 dependency rather than implying the
    # scheduler exists.
    script = (BACKEND / "scripts" / "purge_signer_contact.py").read_text()
    assert "Tier 3" in script
    assert "does not exist yet" in script


def test_the_purge_keeps_the_name_and_drops_the_address():
    """A name is not contact information, and the record of who agreed to
    what must outlive our ability to reach them — otherwise the purge
    quietly rewrites history into "somebody agreed"."""
    src = code_only(BACKEND / "services" / "signing_purge.py")
    assert "email = NULL" in src
    assert "phone = NULL" in src
    assert "contact_purged_at = now()" in src
    assert "display_name" not in src, (
        "the purge touches display_name — a name is not contact information")


# ══════════════════════════════════════════════════════════════════════
# §13 stands: booked is not happened
# ══════════════════════════════════════════════════════════════════════

def test_no_state_means_it_happened():
    """The vocabulary, checked by walking the AST rather than reading the
    source, so what is pinned is what the function can SAY."""
    tree = ast.parse((BACKEND / "services" / "signing_loop.py").read_text())
    consts = {
        node.targets[0].id: node.value.value
        for node in tree.body
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Constant)
        and isinstance(node.targets[0], ast.Name)
        and node.targets[0].id.startswith("STATE_")
    }
    assert set(consts.values()) == {
        "requested", "windows_posted", "partially_agreed",
        "booked", "cancelled", "expired",
    }
    for value in consts.values():
        assert "complete" not in value and "happen" not in value and "signed" not in value


def test_a_booked_time_that_has_passed_is_still_only_booked():
    """The §13 pin, executable. A clock moving is not evidence that three
    people met in a room."""
    past = datetime.now(timezone.utc) - timedelta(days=30)
    request = {"booked_at": past, "expires_at": past,
               "booked_by": loop.BOOKED_BY_CONVERGENCE, "tz_name": "America/Los_Angeles"}
    assert loop.request_state(request, [], []) == loop.STATE_BOOKED


def test_nothing_in_the_loop_compares_a_booking_to_the_clock():
    src = code_only(BACKEND / "services" / "signing_loop.py")
    assert not re.search(r"booked_at\s*[<>]", src), (
        "something compares the booked time to now — a passed appointment "
        "is not a completed one")
    assert "completed" not in src


def test_the_label_never_promises_the_signing_will_happen():
    request = {"booked_at": datetime(2026, 9, 1, 17, tzinfo=timezone.utc),
               "booked_by": loop.BOOKED_BY_CONVERGENCE,
               "tz_name": "America/Los_Angeles"}
    label = loop.state_label(request, [], [], [])
    for promise in ("will happen", "will be signed", "will take place",
                    "is confirmed", "guaranteed", "completed"):
        assert promise not in label.lower(), f"the label promises: {label}"
    assert "agreed" in label.lower()


def test_the_officers_booking_is_distinguishable_from_the_parties_agreement():
    """Owner ruling: she retains an override, recorded as HER assertion."""
    when = datetime(2026, 9, 1, 17, tzinfo=timezone.utc)
    theirs = loop.state_label(
        {"booked_at": when, "booked_by": loop.BOOKED_BY_CONVERGENCE,
         "tz_name": "America/Los_Angeles"}, [], [], [])
    hers = loop.state_label(
        {"booked_at": when, "booked_by": loop.BOOKED_BY_OFFICER,
         "tz_name": "America/Los_Angeles"}, [], [], [])
    assert theirs != hers
    assert "you recorded" in hers.lower()
    assert "everyone agreed" in theirs.lower()


# ══════════════════════════════════════════════════════════════════════
# Convergence
# ══════════════════════════════════════════════════════════════════════

def _world(n_signers=2):
    parts = [{"id": 1, "party_role": loop.ROLE_NOTARY, "display_name": "Nora"}]
    parts += [{"id": 10 + i, "party_role": loop.ROLE_SIGNER,
               "display_name": f"Signer {i}"} for i in range(n_signers)]
    base = datetime(2026, 9, 1, 17, tzinfo=timezone.utc)
    windows = [{"id": 100 + i, "starts_at": base + timedelta(days=i),
                "ends_at": base + timedelta(days=i, hours=1)} for i in range(3)]
    return parts, windows


def _yes(window_id, participant_id):
    return {"window_id": window_id, "participant_id": participant_id,
            "answer": loop.ANSWER_AVAILABLE}


def test_a_window_books_only_when_everyone_said_yes():
    parts, windows = _world()
    # Notary + one signer: not enough.
    responses = [_yes(100, 1), _yes(100, 10)]
    assert loop.converged_window_id(parts, windows, responses) is None
    responses.append(_yes(100, 11))
    assert loop.converged_window_id(parts, windows, responses) == 100


def test_the_notary_alone_never_converges():
    """A signing with nobody to sign is not an arrangement anybody made."""
    parts, windows = _world(n_signers=0)
    assert loop.converged_window_id(parts, windows, [_yes(100, 1)]) is None


def test_the_earliest_qualifying_window_wins():
    """Not the most recently answered: if everyone is free at two times,
    the sooner one is the one they meant, and picking by answer order
    would make the outcome depend on who clicked last."""
    parts, windows = _world()
    responses = []
    for wid in (102, 100):
        responses += [_yes(wid, 1), _yes(wid, 10), _yes(wid, 11)]
    assert loop.converged_window_id(parts, windows, responses) == 100


def test_a_declined_window_cannot_book():
    parts, windows = _world()
    windows[0]["declined_at"] = datetime.now(timezone.utc)
    responses = [_yes(100, 1), _yes(100, 10), _yes(100, 11)]
    assert loop.converged_window_id(parts, windows, responses) is None


def test_a_revoked_signer_cannot_hold_the_others_hostage():
    parts, windows = _world()
    parts[2]["revoked_at"] = datetime.now(timezone.utc)
    responses = [_yes(100, 1), _yes(100, 10)]
    assert loop.converged_window_id(parts, windows, responses) == 100


def test_an_unavailable_answer_is_not_a_yes():
    parts, windows = _world()
    responses = [_yes(100, 1), _yes(100, 10),
                 {"window_id": 100, "participant_id": 11,
                  "answer": loop.ANSWER_UNAVAILABLE}]
    assert loop.converged_window_id(parts, windows, responses) is None


# ══════════════════════════════════════════════════════════════════════
# The round-trip cap
# ══════════════════════════════════════════════════════════════════════

def test_the_cap_is_three_aggregate():
    assert loop.MAX_SIGNER_PROPOSALS == 3


def test_the_refusal_names_the_officer():
    """Owner ruling. "This has not converged" tells a signer nothing they
    can act on; "Dana will call you" tells them what happens next."""
    text = loop.proposal_refusal("Dana Reyes")
    assert "Dana Reyes" in text
    assert "call" in text.lower()
    # And it does not blame them or ask them to keep trying.
    assert "sorry" not in text.lower()
    assert "try again" not in text.lower()


def test_the_refusal_still_works_with_no_officer_name():
    text = loop.proposal_refusal(None)
    assert text and "None" not in text


# ══════════════════════════════════════════════════════════════════════
# Times carry their zone
# ══════════════════════════════════════════════════════════════════════

def test_a_time_without_an_offset_is_refused():
    """The NOTARY1 bug, closed. That code accepted naive times and assumed
    UTC, producing a calendar file up to eight hours out — silently, on
    the one artifact whose whole job is being at the right moment."""
    with pytest.raises(loop.SigningLoopError) as e:
        loop.parse_window({"start": "2026-09-01T10:00:00",
                           "end": "2026-09-01T11:00:00"})
    assert "offset" in str(e.value).lower()


def test_a_time_with_an_offset_is_kept_as_an_instant():
    parsed = loop.parse_window({"start": "2026-09-01T10:00:00-07:00",
                                "end": "2026-09-01T11:00:00-07:00"})
    assert parsed["starts_at"].utcoffset() == timedelta(hours=-7)


def test_a_window_that_ends_before_it_starts_is_refused():
    with pytest.raises(loop.SigningLoopError):
        loop.parse_window({"start": "2026-09-01T11:00:00-07:00",
                           "end": "2026-09-01T10:00:00-07:00"})


def test_the_label_renders_in_the_requests_zone_not_the_servers():
    """A signing happens at a place, and everybody involved should read
    the clock on the wall where they are going."""
    window = {"starts_at": datetime(2026, 9, 1, 17, tzinfo=timezone.utc),
              "ends_at": datetime(2026, 9, 1, 18, tzinfo=timezone.utc)}
    la = loop.window_label(window, "America/Los_Angeles")
    ny = loop.window_label(window, "America/New_York")
    assert "10:00 AM" in la
    assert "1:00 PM" in ny


def test_an_unknown_zone_does_not_break_a_status_line():
    window = {"starts_at": datetime(2026, 9, 1, 17, tzinfo=timezone.utc),
              "ends_at": datetime(2026, 9, 1, 18, tzinfo=timezone.utc)}
    assert loop.window_label(window, "Mars/Olympus_Mons")


# ══════════════════════════════════════════════════════════════════════
# The token surfaces, as allowlists
# ══════════════════════════════════════════════════════════════════════

def _packages():
    parts, windows = _world()
    parts[0].update({"company_name": "Reyes Mobile Notary",
                     "email": "nora@notary.test", "phone": "+16265550134",
                     "expires_at": datetime(2026, 12, 1, tzinfo=timezone.utc)})
    for p in parts[1:]:
        p.update({"email": "consumer@example.test", "phone": "+16265550199",
                  "expires_at": datetime(2026, 12, 1, tzinfo=timezone.utc)})
    request = {"tz_name": "America/Los_Angeles", "signer_proposals": 0,
               "expires_at": datetime(2026, 12, 1, tzinfo=timezone.utc)}
    deed = {"property_address": "9 Private Way, Los Angeles, CA 90017",
            "apn": "1234-567-890", "county": "Los Angeles",
            "deed_type": "grant_deed", "grantor_name": "PRIVATE GRANTOR",
            "grantee_name": "PRIVATE GRANTEE",
            "legal_description": "LOT 4 OF TRACT 1234"}
    officer = {"full_name": "Dana Reyes", "company_name": "Pacific Coast Title",
               "email": "dana@pct.test"}
    signer = surfaces.signer_package(
        request=request, me=parts[1], participants=parts, windows=windows,
        responses=[], deed=deed, officer=officer)
    notary = surfaces.notary_package(
        request=request, me=parts[0], participants=parts, windows=windows,
        responses=[], deed=deed, officer=officer, token="tok")
    return signer, notary, deed


def test_the_signer_package_is_exactly_its_allowlist():
    signer, _, _ = _packages()
    assert set(signer) == surfaces.SIGNER_KEYS


def test_the_signer_package_carries_no_way_to_reach_anybody():
    """The allowlist protects the SHAPE; this protects the nested objects
    inside it — a `notary` object that grew an `email` would still pass a
    top-level key check."""
    signer, _, _ = _packages()
    assert surfaces.contains_contact(signer) == []


def test_the_signer_never_sees_the_instrument():
    """Owner ruling: property street address, who is coordinating, who is
    coming, the times, pick-or-propose. Nothing else."""
    signer, _, deed = _packages()
    blob = json.dumps(signer)
    for secret in (deed["apn"], deed["legal_description"],
                   deed["grantor_name"], deed["grantee_name"],
                   deed["county"], deed["deed_type"]):
        assert secret not in blob, f"the signer surface leaked {secret!r}"
    # The street line only — never the full address with city and ZIP.
    assert signer["property_street"] == "9 Private Way"
    assert "90017" not in blob


def test_the_signer_sees_who_is_coming_but_not_how_to_reach_her():
    """Owner ruling 2. A professional whose name will be on the
    certificate, and a consumer told a stranger is coming to their home
    deserves to know who — but the signer needs to know who is coming,
    not how to reach her independently."""
    signer, _, _ = _packages()
    assert signer["notary"]["name"] == "Nora"
    assert signer["notary"]["company"] == "Reyes Mobile Notary"
    assert set(signer["notary"]) == {"name", "company"}
    assert "nora@notary.test" not in json.dumps(signer)


def test_one_signer_never_sees_another():
    signer, _, _ = _packages()
    blob = json.dumps(signer)
    assert "Signer 1" not in blob
    assert "consumer@example.test" not in blob


def test_the_notary_package_is_exactly_its_allowlist():
    _, notary, _ = _packages()
    assert set(notary) == surfaces.NOTARY_KEYS


def test_the_notary_sees_names_to_check_ids_against_but_no_signer_contact():
    _, notary, _ = _packages()
    assert [s["name"] for s in notary["signers"]] == ["Signer 0", "Signer 1"]
    assert "consumer@example.test" not in json.dumps(notary)
    assert surfaces.contains_contact(notary["signers"]) == []


def test_the_allowlists_are_declared_not_derived():
    """A key set computed from the payload would agree with itself no
    matter what the payload became. These are written down, and the
    builders assert against them at runtime as well."""
    src = code_only(BACKEND / "services" / "signing_surfaces.py")
    assert "SIGNER_KEYS = frozenset(" in src
    assert "NOTARY_KEYS = frozenset(" in src
    assert src.count("assert set(package)") == 2


# ══════════════════════════════════════════════════════════════════════
# Executable — the purge, against a real database
# ══════════════════════════════════════════════════════════════════════

dbonly = pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="needs a database")


@pytest.fixture
def conn():
    import psycopg2
    from database import create_tables
    from db_rows import ROW_FACTORY
    create_tables()
    c = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    c.autocommit = False
    yield c
    c.rollback()
    c.close()


def _seed_request(conn, *, finished_days_ago: int, tag: str):
    """A finished request with a notary and one signer, both with contact
    details. `finished_days_ago` sets how long ago it expired."""
    finished = datetime.now(timezone.utc) - timedelta(days=finished_days_ago)
    with conn.cursor() as cur:
        cur.execute("INSERT INTO users (email, password_hash, full_name, role) "
                    "VALUES (%s, 'x', 'Officer', 'user') RETURNING id",
                    (f"officer-{tag}@n2.test",))
        officer = cur.fetchone()["id"]
        cur.execute("INSERT INTO deeds (user_id, deed_type, property_address, status) "
                    "VALUES (%s, 'grant_deed', '1 Test St, LA, CA', 'completed') "
                    "RETURNING id", (officer,))
        deed = cur.fetchone()["id"]
        cur.execute("INSERT INTO signing_requests (deed_id, officer_user_id, "
                    "tz_name, expires_at) VALUES (%s, %s, 'America/Los_Angeles', %s) "
                    "RETURNING id", (deed, officer, finished))
        req = cur.fetchone()["id"]
        ids = {}
        for role, name in ((loop.ROLE_NOTARY, "Nora"), (loop.ROLE_SIGNER, "Sam")):
            cur.execute(
                "INSERT INTO signing_participants (signing_request_id, party_role, "
                "display_name, email, phone, token, expires_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (req, role, name, f"{name.lower()}-{tag}@n2.test", "+16265550134",
                 str(uuid.uuid4()), finished))
            ids[role] = cur.fetchone()["id"]
    return req, ids


@dbonly
def test_the_purge_removes_contact_and_keeps_the_name(conn):
    from services.signing_purge import purge_signer_contact
    _, ids = _seed_request(conn, finished_days_ago=200, tag=uuid.uuid4().hex[:6])
    assert purge_signer_contact(conn) >= 1
    with conn.cursor() as cur:
        cur.execute("SELECT display_name, email, phone, contact_purged_at "
                    "FROM signing_participants WHERE id = %s", (ids[loop.ROLE_SIGNER],))
        row = cur.fetchone()
    assert row["email"] is None
    assert row["phone"] is None
    assert row["display_name"] == "Sam", "a name is not contact information"
    assert row["contact_purged_at"] is not None, (
        "without the stamp, 'we never had it' and 'we deleted it' look identical")


@dbonly
def test_the_purge_leaves_the_notary_alone(conn):
    """She is a partner the officer chose, under an engagement — not a
    consumer we found on a deed. Her row is the rolodex's business."""
    from services.signing_purge import purge_signer_contact
    _, ids = _seed_request(conn, finished_days_ago=200, tag=uuid.uuid4().hex[:6])
    purge_signer_contact(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT email FROM signing_participants WHERE id = %s",
                    (ids[loop.ROLE_NOTARY],))
        assert cur.fetchone()["email"] is not None


@dbonly
def test_a_request_still_inside_the_window_is_untouched(conn):
    from services.signing_purge import purge_signer_contact
    _, ids = _seed_request(conn, finished_days_ago=5, tag=uuid.uuid4().hex[:6])
    purge_signer_contact(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT email FROM signing_participants WHERE id = %s",
                    (ids[loop.ROLE_SIGNER],))
        assert cur.fetchone()["email"] is not None


@dbonly
def test_a_booking_in_the_future_keeps_its_contact_details(conn):
    """The clock starts when the request FINISHES, not when it was made.
    Counting from creation would purge the addresses of an appointment
    that has not happened yet."""
    from services.signing_purge import purge_signer_contact
    tag = uuid.uuid4().hex[:6]
    req, ids = _seed_request(conn, finished_days_ago=200, tag=tag)
    with conn.cursor() as cur:
        cur.execute("UPDATE signing_requests SET booked_at = %s WHERE id = %s",
                    (datetime.now(timezone.utc) + timedelta(days=10), req))
    purge_signer_contact(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT email FROM signing_participants WHERE id = %s",
                    (ids[loop.ROLE_SIGNER],))
        assert cur.fetchone()["email"] is not None


@dbonly
def test_the_purge_is_idempotent(conn):
    from services.signing_purge import purge_signer_contact
    _seed_request(conn, finished_days_ago=200, tag=uuid.uuid4().hex[:6])
    first = purge_signer_contact(conn)
    second = purge_signer_contact(conn)
    assert first >= 1
    assert second == 0, "a second run must find nothing — the stamp is what makes that true"


@dbonly
def test_the_sweep_throttles_itself(conn):
    """`system_jobs` is a LEDGER and survives between runs.

    The first draft called `sweep_if_due` twice and asserted the first
    ran — which failed on the second execution of this suite, because an
    earlier run had already stamped `last_run_at` inside the hour and the
    throttle was doing exactly its job. Same trap as the email_log
    high-water mark: a test that reads persistent state without
    establishing it is measuring history rather than behaviour.

    So the throttle window is established explicitly here.
    """
    from services.signing_purge import JOB_NAME, sweep_if_due
    _seed_request(conn, finished_days_ago=200, tag=uuid.uuid4().hex[:6])
    with conn.cursor() as cur:
        cur.execute("DELETE FROM system_jobs WHERE job_name = %s", (JOB_NAME,))
    conn.commit()

    first = sweep_if_due(conn)
    second = sweep_if_due(conn)
    assert first is not None, "the first sweep should have run"
    assert second is None, "the second must be throttled, not run again"

    # And the throttle is a WINDOW, not a one-shot: a call after the
    # interval runs again.
    later = sweep_if_due(conn, now=datetime.now(timezone.utc) + timedelta(hours=2))
    assert later is not None, "the sweep never runs again — that is a stuck job, not a throttle"


@dbonly
def test_purge_status_reports_what_is_overdue(conn):
    """The in-request sweep's weakness is invisibility. This is the number
    an operator watches: rows that SHOULD be purged and are not."""
    from services.signing_purge import purge_status
    _seed_request(conn, finished_days_ago=200, tag=uuid.uuid4().hex[:6])
    conn.commit()
    status = purge_status(conn)
    assert status["retention_days"] == loop.CONTACT_RETENTION_DAYS
    assert status["overdue"] >= 1
