"""ADMIN3 — the transport ledger.

THE 3 AM QUESTION. A customer says "I never got the approval email."
Before this ticket the only record was a `print()` on a Render container
that had since restarted. Eleven templates; ten of their outcomes were
formatted into a log line and dropped. The eleventh — the API-access
funnel — persisted its outcome, and it is worth being precise about WHY,
because the reason is the design of this PR: `api_key_requests` is a work
queue somebody stares at, so losing a send outcome there was immediately
painful. Nothing made the other ten hurt, so nothing fixed them.

The fix is therefore not "add persistence to eleven call sites" — eleven
places that must remember is a place that will be forgotten. It is one
choke point that every template already passes through, and a pin that
says nothing may go around it.

CI-safe (no database) except where marked.
"""
import ast
import re
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
NOTIFICATIONS = BACKEND / "utils" / "notifications.py"


# T-3: the local code_only() lives in tests/source_text.py now — this
# was one of four near-identical copies, and the copies had drifted
# (one stripped comments but not docstrings, which is how the sixth
# pin-trip-on-a-comment happened). Owner-ruled consolidation.
from tests.source_text import code_only

# ── The choke point ──────────────────────────────────────────────────

def test_exactly_one_call_reaches_the_transport():
    """`send_email_with_reason` is the transport. If a sender calls it
    directly it skips the ledger, and the skip is invisible: the email
    goes out, nothing errors, and the row simply is not there. That is
    the failure mode this pin exists for — silence, not breakage."""
    src = code_only(NOTIFICATIONS)
    calls = re.findall(r"send_email_with_reason\(", src)
    assert len(calls) == 1, (
        f"{len(calls)} calls to the transport — every send must go through "
        "_send() or its outcome is never recorded, and nothing will fail "
        "to tell you"
    )


def test_no_module_outside_notifications_sends_mail():
    """A second transport user elsewhere in the codebase would bypass the
    ledger the same way, one directory further from where anyone looks."""
    offenders = []
    for path in BACKEND.rglob("*.py"):
        if {"tests", "__pycache__"} & set(path.parts):
            continue
        if path.name in ("notifications.py", "email.py"):
            continue
        if "send_email_with_reason" in path.read_text(encoding="utf-8", errors="ignore"):
            offenders.append(str(path.relative_to(BACKEND)))
    assert offenders == [], f"the transport is called outside the choke point: {offenders}"


def test_every_template_routes_through_send():
    """All twelve, named. A template that renders and sends without a
    `_send` name is a template whose rows land under the wrong label —
    which is worse than no label, because the log then lies quietly.

    The count is asserted as well as the set, and it is a TRIP-WIRE
    rather than a fact worth knowing: a new template must be a deliberate
    edit here, not something that arrives with a diff nobody read. It
    fired as designed when TRIAL1 added `payment_failed` (11 -> 12)."""
    import sys
    sys.path.insert(0, str(BACKEND))
    from utils.notifications import TEMPLATES

    src = code_only(NOTIFICATIONS)
    named = set(re.findall(r'_send\(\s*"([a-z_]+)"', src))
    assert named == set(TEMPLATES), (
        f"declared TEMPLATES and actual _send labels disagree: "
        f"only-declared={set(TEMPLATES) - named}, only-used={named - set(TEMPLATES)}"
    )
    assert len(TEMPLATES) == 12


# ── The recorder's two constraints ───────────────────────────────────

def test_the_recorder_cannot_break_the_send_path():
    """Recording an outcome is strictly less important than the thing it
    records. A ledger write that 500s a registration would be a worse bug
    than the one being fixed."""
    import sys
    sys.path.insert(0, str(BACKEND))
    import utils.notifications as notif

    # A recorder that raises internally must still return normally.
    original = notif.get_db_connection if hasattr(notif, "get_db_connection") else None
    assert original is None, "the connection is imported inside _record, by design"

    # Call it with no DATABASE_URL reachable — it must not raise.
    notif._record("welcome", "nobody@example.com", "s", True, None, None, None)


def test_the_recorder_uses_its_own_connection_not_the_callers():
    """The A1 metering defect, in one assertion.

    That code wrote a usage row inside the CALLER's transaction. The
    INSERT failed, Postgres marked the transaction ABORTED, and the
    caller's later commit() silently discarded a real deed while
    returning 200. A logging write must never be able to do that, so
    _record opens a short-lived autocommit connection of its own and
    closes it.
    """
    src = code_only(NOTIFICATIONS)
    record = src[src.index("def _record("):src.index("def _send(")]
    assert "get_db_connection()" in record
    assert "autocommit = True" in record
    assert "conn.close()" in record
    # It must not accept a connection from its caller — that is the door.
    assert not re.search(r"def _record\([^)]*conn[^)]*\)", src)


def test_a_failed_recording_is_loud():
    """Doctrine §4 says errors are never swallowed. This one must be
    caught (see above), so it is caught LOUDLY — with a greppable prefix,
    and with the admin surface stating it shows only what it managed to
    record. An honest gap beats a silent one."""
    src = NOTIFICATIONS.read_text(encoding="utf-8")
    assert "[email-log]" in src


def test_success_rows_carry_no_reason_and_failures_do():
    """A `reason` on a sent row is noise; a sent row is its own reason.
    A failure without one is the boolean this ticket replaced."""
    src = code_only(NOTIFICATIONS)
    assert '"sent" if ok else "failed"' in src
    assert "(reason or None) if not ok else None" in src


# ── Schema authority ─────────────────────────────────────────────────

def test_email_log_lives_in_the_one_schema_authority():
    """H1: create_tables() is the single authority. A table created by a
    hand-run migration is the class of thing ADMIN1 spent a PR adopting
    (subscriptions was MISSING ENTIRELY in production for that reason)."""
    src = (BACKEND / "database.py").read_text(encoding="utf-8")
    assert "CREATE TABLE IF NOT EXISTS email_log" in src
    for idx in ("idx_email_log_created", "idx_email_log_status",
                "idx_email_log_template", "idx_email_log_recipient"):
        assert idx in src, f"{idx} missing — this table is read by filtered queries"


# ── Live DB ──────────────────────────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def schema_ready():
    """`email_log` exists because create_tables() made it — which only
    happens once something imports the app. Ordering-dependent setup is
    how a suite grows a test that passes second and fails first, so this
    states the dependency instead of inheriting it from whichever test
    happened to run earlier.

    The thread join is not optional: importing `database` starts the
    daemon "schema-convergence" thread, and touching tables while it is
    mid-DDL deadlocks (it holds ACCESS EXCLUSIVE, we hold ACCESS SHARE).
    That deadlock has hung this suite twice.
    """
    import os
    if not os.getenv("DATABASE_URL"):
        return
    import threading
    import database  # noqa: F401 — the import is what starts convergence
    for t in threading.enumerate():
        if t.name == "schema-convergence":
            t.join(timeout=120)


@pytest.mark.skipif(not __import__("os").getenv("DATABASE_URL"),
                    reason="live test DB required")
def test_a_failed_send_is_recorded_with_its_reason():
    """End to end, on the failure path that actually happens: no
    SENDGRID_API_KEY. The send fails, the reason names why, and the row
    survives the request that produced it."""
    import os
    import sys
    sys.path.insert(0, str(BACKEND))
    import psycopg2
    from utils.notifications import send_welcome_with_reason

    assert not os.getenv("SENDGRID_API_KEY"), "this test asserts the unconfigured path"

    ok, reason = send_welcome_with_reason("ledger@admin.example", "Ledger Test")
    assert ok is False
    assert "SENDGRID_API_KEY" in (reason or "")

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("""SELECT template, recipient, status, reason
                       FROM email_log WHERE recipient = %s
                       ORDER BY created_at DESC LIMIT 1""",
                    ("ledger@admin.example",))
        row = cur.fetchone()
    conn.close()

    assert row is not None, "the send happened and the ledger has no row for it"
    assert row[0] == "welcome"
    assert row[2] == "failed"
    assert "SENDGRID_API_KEY" in row[3], "the reason was reduced to a boolean again"


@pytest.mark.skipif(not __import__("os").getenv("DATABASE_URL"),
                    reason="live test DB required")
def test_the_admin_surface_reads_the_ledger():
    import os
    import psycopg2
    from fastapi.testclient import TestClient
    from main import app

    email, password = "emails@admin.example", "Emails!Passw0rd"
    client = TestClient(app)
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("""DELETE FROM user_profiles WHERE user_id IN
                       (SELECT id FROM users WHERE email = %s)""", (email,))
        cur.execute("DELETE FROM users WHERE email = %s", (email,))
    conn.close()

    client.post("/users/register", json={
        "email": email, "password": password, "confirm_password": password,
        "full_name": "Email Admin", "role": "escrow_officer",
        "state": "CA", "agree_terms": True})
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET role = 'admin' WHERE email = %s", (email,))
    conn.close()

    token = client.post("/users/login", json={
        "email": email, "password": password}).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    # Registration itself sends two emails (admin ping + welcome), so the
    # ledger cannot be empty by the time we look.
    listing = client.get("/admin/emails?limit=10", headers=auth).json()
    assert listing["total"] > 0, "registration sent mail and the ledger is empty"
    assert isinstance(listing["items"][0], dict), "rows must serialise as objects (#113)"
    for field in ("id", "template", "recipient", "status", "created_at"):
        assert field in listing["items"][0], f"the console reads {field}"

    failed = client.get("/admin/emails?status=failed&limit=5", headers=auth).json()
    assert all(i["status"] == "failed" for i in failed["items"])
    assert client.get("/admin/emails?status=nonsense", headers=auth).status_code == 400

    by_template = client.get("/admin/emails?template=welcome&limit=5", headers=auth).json()
    assert all(i["template"] == "welcome" for i in by_template["items"])

    stats = client.get("/admin/emails/stats?days=7", headers=auth).json()
    assert stats["total"] == stats["sent"] + stats["failed"]
    assert stats["recording_since"] is not None, (
        "the UI needs this to say 'we have only been recording since X' — "
        "without it a young table reads as a quiet month"
    )
    # Unconfigured email in tests means every attempt failed with a reason.
    assert stats["failed"] > 0 and stats["failures_by_reason"], (
        "failures were counted but their reasons were not kept — the count "
        "says something is broken, the reason says which thing"
    )


@pytest.mark.skipif(not __import__("os").getenv("DATABASE_URL"),
                    reason="live test DB required")
def test_the_api_key_funnel_still_records_on_its_own_row():
    """ADMIN3 adds a transport ledger; it does not take the funnel's
    queue status away. `api_key_requests.notify_error` is that request's
    OWN state — a thing to work — while email_log is the transport's
    history. Both, deliberately."""
    src = (BACKEND / "routers" / "api_key_requests.py").read_text(encoding="utf-8")
    assert "notify_error = %s" in src
