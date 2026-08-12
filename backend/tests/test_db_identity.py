"""A job knows which database it is about to change, or it does not run.

═══ THE AFTERNOON THIS COST ═══

    relation "signing_participants" does not exist

sent us hunting for a schema that had never run: a migration to re-check,
a `create_tables` call to audit, two redeploys on an untested hypothesis.
The schema was fine. The service was pointed at the wrong database.

The message is technically true and useless, and the four values that
would have ended the investigation in one run — database, host, port,
user — are ones Postgres hands over for free.

═══ WHAT THESE PINS PROTECT ═══

 1. THE ASSERTION COMES FIRST. Before a count, before a status report,
    before anything that reads as progress. A purge that deletes contact
    details in the wrong database is not recoverable by re-running it
    somewhere else.

 2. EVERY WRITE-SIDE SCRIPT ASSERTS, OR IS EXEMPT WITH A STATED REASON.
    The list is exact: a new script that connects and commits either
    asserts its tables or gets written into the exemption list with an
    argument. It cannot arrive silently, which is the whole difference
    between a rule people must remember and a mechanism that remembers
    for them.

 3. ONE IDENTITY IMPLEMENTATION, NOT THREE. `migrate_notary1_signings`
    had its own two-line copy printing database and host. Standing rule:
    when a new surface needs an existing judgement the answer is never a
    second copy — this ticket ends with one fewer than it started with.

 4. THE CATALOG, NOT A PROBE. `to_regclass` answers "is it there";
    `SELECT * FROM t LIMIT 0` answers "is it there AND may I read it",
    and reports a permissions problem as a missing table. Two different
    defects must not produce the same message — that is the whole
    complaint of this file, applied to its own implementation.

═══ THE ACCEPTANCE, RUN RATHER THAN DESCRIBED ═══

The last test here runs the purge script as a subprocess against a real
database that really lacks the table, and reads its real stderr. The
thing being bought is a MESSAGE, and a message is the one kind of output
that a unit test full of mocks can assert into existence without ever
producing.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

from services.db_identity import (MARK_COMMAND, SCRATCH_MARKER, WrongDatabase, assert_scratch,
                                  assert_tables, describe, expected_database,
                                  identity, is_scratch, missing_tables)
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
SCRIPTS = BACKEND / "scripts"

dbonly = pytest.mark.skipif(not os.getenv("DATABASE_URL"),
                            reason="needs a database")


# ══════════════════════════════════════════════════════════════════════
# 1. The identity block, without a database
# ══════════════════════════════════════════════════════════════════════

class _Cursor:
    """Enough of a psycopg2 cursor to answer the two queries this module
    asks: the identity SELECT, and one `to_regclass` probe per table."""

    def __init__(self, row, present):
        self._row = row
        self._present = present
        self._answer = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        if "to_regclass" in sql:
            self._answer = {"gone": not self._present}
        else:
            self._answer = self._row

    def fetchone(self):
        return self._answer


class _Conn:
    def __init__(self, row, present=True):
        self._row = row
        self._present = present

    def cursor(self):
        return _Cursor(self._row, self._present)


DICT_ROW = {"db": "deedpro", "host": None, "port": 5432, "who": "deedpro_user",
            "version": "PostgreSQL 16.3 on x86_64-pc-linux-gnu, compiled by gcc"}


def test_a_unix_socket_is_reported_as_one_not_as_a_blank():
    """`inet_server_addr()` is NULL over a local socket. That is not a
    lookup that failed, and printing it as an empty string invites the
    reader to go looking for a networking problem that is not there."""
    who = identity(_Conn(DICT_ROW))
    assert who["host"] == "local socket"
    assert who["database"] == "deedpro"
    assert who["user"] == "deedpro_user"


def test_the_version_is_trimmed_to_the_part_a_human_reads():
    """`version()` returns the compiler and the architecture too. The
    identity line is meant to be read at a glance in a log."""
    assert identity(_Conn(DICT_ROW))["version"] == "PostgreSQL 16.3"


def test_a_plain_cursor_works_as_well_as_a_dict_one():
    """This module is imported by scripts that configure either cursor
    factory. A diagnostic that crashes on the cursor factory is a
    diagnostic that fails exactly when it is needed — which is the same
    complaint as the one it exists to fix."""
    tup = ("deedpro", "10.26.62.147", 5432, "deedpro_user", "PostgreSQL 16.3 on x86")
    who = identity(_Conn(tup))
    assert who == {"database": "deedpro", "host": "10.26.62.147", "port": 5432,
                   "user": "deedpro_user", "version": "PostgreSQL 16.3"}


def test_describe_names_all_four_values_in_one_line():
    line = describe(_Conn(DICT_ROW))
    for fragment in ("deedpro", "local socket", "5432", "deedpro_user",
                     "PostgreSQL 16.3"):
        assert fragment in line


def test_the_expected_database_is_unset_unless_a_deployment_says_so(monkeypatch):
    """Optional on purpose: a local run and CI both legitimately point at
    a database nobody named. Blank must therefore mean "do not check",
    not "check against the empty string"."""
    monkeypatch.delenv("EXPECTED_DATABASE", raising=False)
    assert expected_database() == ""
    monkeypatch.setenv("EXPECTED_DATABASE", "  deedpro  ")
    assert expected_database() == "deedpro"


def test_a_blank_expectation_does_not_silently_pass_everything():
    """The failure mode of an optional check: `expect_database=""` must
    skip the comparison rather than compare against nothing and refuse
    every database, or accept every database while looking like it
    checked."""
    who = assert_tables(_Conn(DICT_ROW), "anything", expect_database="")
    assert who["database"] == "deedpro"


def test_the_wrong_named_database_names_both():
    """The quiet wrong database — staging, with every table present.

    Missing tables cannot catch it and this is the one job where being
    wrong is unrecoverable, so the message names the database it is on
    AND the one it was told it is for.
    """
    with pytest.raises(WrongDatabase) as raised:
        assert_tables(_Conn(DICT_ROW), "signing_participants",
                      expect_database="deedpro_staging")
    message = str(raised.value)
    assert "deedpro" in message              # where it is
    assert "deedpro_staging" in message      # where it was told to be
    assert "EXPECTED_DATABASE" in message    # and how to correct it


def test_the_name_is_checked_before_the_tables():
    """A name mismatch explains a missing table. Reporting the table
    first sends the reader to the schema, which is the afternoon this
    module exists to prevent."""
    # A database that is BOTH wrongly named and missing the table: only
    # one of the two facts is worth telling the reader first.
    fake = _Conn(DICT_ROW, present=False)
    with pytest.raises(WrongDatabase) as raised:
        assert_tables(fake, "signing_participants", expect_database="somewhere_else")
    assert "not found" not in str(raised.value)
    assert "somewhere_else" in str(raised.value)


def test_asserting_nothing_is_an_error_not_a_pass():
    """`assert_tables(conn)` with no names would return successfully
    having checked nothing — a green call that proves nothing, which is
    the worst state a check can be in."""
    with pytest.raises(ValueError):
        assert_tables(_Conn(DICT_ROW))


# ══════════════════════════════════════════════════════════════════════
# 2. The mechanism, not the habit
# ══════════════════════════════════════════════════════════════════════

def _script_sources():
    return {path.name: code_only(path) for path in sorted(SCRIPTS.glob("*.py"))}


#: Scripts that connect AND commit, and are deliberately NOT asserting.
#: Each carries the argument for its own exemption, because "it seemed
#: fine" is how the list stops meaning anything.
EXEMPT = {
    "init_db.py":
        "Creates the schema. Asserting that a table exists before the "
        "run whose job is to create it is backwards.",
    "add_pricing.py":
        "CREATE TABLE IF NOT EXISTS, then seeds the rows. Its table is "
        "its output, not its precondition — same reason as init_db.",
    "add_property_cache.py":
        "CREATE TABLE IF NOT EXISTS for the cache table. Its table is "
        "its output, not its precondition — same reason as init_db.",
    "s1_concurrency_proof.py":
        "Asserts the SCRATCH MARKER instead. Its tables exist in "
        "production too, so asserting them would pass there — the check "
        "it needs is 'may I destroy this', and that is assert_scratch.",
    "s2_restore_drill.py":
        "Same as s1, and it dumps and restores, so the same answer: the "
        "marker, not the tables.",
    "mark_scratch_database.py":
        "Creates the marker. Asserting the marker exists before the run "
        "whose job is to create it is backwards — same shape as init_db, "
        "and it demands an explicit flag and prints the identity line "
        "first, which the others do not.",
}


def test_every_write_side_script_names_its_database_or_argues_why_not():
    """THE MECHANISM. A script that connects to DATABASE_URL and commits
    is a script that changes data somewhere, and 'somewhere' is the word
    doing the damage.

    Exact-set equality on purpose: a new script cannot join the codebase
    by being neither in the asserting set nor in the exemption list. It
    has to be classified, and classifying it is one line either way.
    """
    writers = {name for name, src in _script_sources().items()
               if "psycopg2.connect(" in src and ".commit()" in src}
    asserting = {name for name, src in _script_sources().items()
                 if "assert_tables(" in src}

    unaccounted = sorted(writers - asserting - set(EXEMPT))
    assert unaccounted == [], (
        "these scripts connect to DATABASE_URL and commit, but never say "
        "which database that is: " + ", ".join(unaccounted) +
        " — call services.db_identity.assert_tables() with the tables "
        "they need, or add them to EXEMPT with the reason.")

    # And the exemption list does not outlive its entries: a script that
    # is deleted or stops writing must not leave a standing excuse behind.
    stale = sorted(set(EXEMPT) - writers)
    assert stale == [], (
        "exempted but no longer a write-side script: " + ", ".join(stale))


def test_an_unmarked_database_is_refused_and_the_message_says_how_to_mark_it():
    """The behaviour, not the source. An unmarked database gets a refusal
    that names it and carries the exact command — invariant #4: the
    failure states its own remedy, because the alternative is somebody
    guessing and reaching for the blunt instrument."""
    with pytest.raises(WrongDatabase) as raised:
        assert_scratch(_Conn(DICT_ROW, present=False))
    message = str(raised.value)
    assert "deedpro" in message                          # which database
    assert "not marked" in message
    assert "mark_scratch_database.py" in message         # and how
    assert "--yes-this-is-a-throwaway-database" in message


def test_a_marked_database_is_silent():
    assert is_scratch(_Conn(DICT_ROW, present=True)) is True
    who = assert_scratch(_Conn(DICT_ROW, present=True))
    assert who["database"] == "deedpro"


def test_the_marker_is_a_positive_fact_not_the_absence_of_a_negative():
    """The whole argument for this shape over the two rejected ones.

    `ALLOW_DESTRUCTIVE_TESTS` is an opt-in somebody sets and forgets, and
    a variable left set is indistinguishable from one set on purpose.
    Name-matching production fails the moment a second production-shaped
    database exists — which is the situation this codebase just lived
    through. Both blacklist the dangerous thing; a marker whitelists the
    safe one.
    """
    src = code_only(BACKEND / "services" / "db_identity.py")
    assert "ALLOW_DESTRUCTIVE" not in src, (
        "the guard grew an environment-variable opt-in")
    assert SCRATCH_MARKER in src
    # No production database is named anywhere in the mechanism.
    assert "deedpro_prod" not in src

    # AND THE MARKER IS NOT A TABLE THE SCHEMA CREATES. This is the one
    # that makes the whole guard real: `create_tables` runs against
    # production on every boot, so a marker it happened to create — or a
    # marker that named an ordinary application table — would mark the
    # one database that must never carry it.
    schema = code_only(BACKEND / "database.py")
    assert SCRATCH_MARKER not in schema, (
        f"{SCRATCH_MARKER} is created by the schema authority, so every "
        "database has it and the guard passes everywhere")


def test_the_destructive_harnesses_refuse_an_unmarked_database():
    """Exempt from `assert_tables` is not exempt from a guard.

    These two write rows and, in S2's case, drop and restore a database.
    `assert_tables` would pass against production — production HAS those
    tables — so the check they need is the opposite one: a positive
    marker only a throwaway database carries.

    Rejected on the way here, and both for the same reason: an
    `ALLOW_DESTRUCTIVE_TESTS` opt-in is a variable somebody sets and
    forgets, and matching production by NAME fails the moment a second
    production-shaped database exists. Both blacklist the dangerous
    thing; the marker whitelists the safe one.
    """
    for name in ("s1_concurrency_proof.py", "s2_restore_drill.py"):
        src = code_only(SCRIPTS / name)
        assert "assert_scratch(" in src, (
            f"{name} writes rows and no longer checks whether it may — "
            "call services.db_identity.assert_scratch()")
        assert "sys.exit(1)" in src, f"{name} does not stop on a refusal"


def test_nothing_marks_a_database_disposable_by_accident():
    """THE ONE THING THAT MUST NOT LEAK. `create_tables` runs against
    production on every boot; a marker it created would mark the one
    database that must never carry it."""
    offenders = []
    for path in BACKEND.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv"} & set(path.parts):
            continue
        if path.name in ("db_identity.py", "mark_scratch_database.py"):
            continue
        if "mark_scratch" in code_only(path):
            offenders.append(str(path.relative_to(BACKEND)))
    assert offenders == [], (
        "something other than the marking script marks a database "
        "disposable: " + ", ".join(offenders))


def test_marking_requires_an_explicit_flag():
    """Nothing can stop somebody marking production. What this changes is
    the SHAPE of the mistake: mis-pasting a DATABASE_URL is common,
    typing `--yes-this-is-a-throwaway-database` under an identity line
    reading `deedpro` is not."""
    src = code_only(SCRIPTS / "mark_scratch_database.py")
    assert 'FLAG = "--yes-this-is-a-throwaway-database"' in src
    assert "if FLAG not in sys.argv:" in src
    # And the identity line is printed BEFORE the refusal, so the person
    # who forgot the flag has already read which database they were on.
    assert src.index("about to mark") < src.index("refusing without")


@pytest.mark.parametrize("name,reason", sorted(EXEMPT.items()))
def test_each_exemption_carries_an_argument(name, reason):
    assert len(reason) > 60, f"{name}'s exemption is an assertion, not a reason"


def test_the_purge_asserts_before_it_does_anything():
    """Ordering is the point, not presence.

    An assertion placed after the status report is an assertion that runs
    second — and the purge is the one job here where being wrong deletes
    something. `--status` reads, `--dry-run` counts, and the real run
    destroys contact details; all three must be behind the check.
    """
    src = code_only(SCRIPTS / "purge_signer_contact.py")
    first = src.index("assert_tables(")
    for later in ("purge_status(conn)", "purge_signer_contact(conn)",
                  "if status_only", "if verify_only"):
        assert first < src.index(later), (
            f"the database assertion runs after {later!r}")


def test_there_is_one_identity_query_in_the_codebase():
    """`migrate_notary1_signings` used to carry its own copy — database
    and host, no port, no user, and no assertion that the tables were
    there at all. Standing rule: the ticket ends with one fewer copy than
    it started with."""
    copies = []
    for path in BACKEND.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv"} & set(path.parts):
            continue
        if path.name == "db_identity.py":
            continue
        if "inet_server_addr" in code_only(path):
            copies.append(str(path.relative_to(BACKEND)))
    assert copies == [], (
        "a second identity query lives in: " + ", ".join(copies) +
        " — import services.db_identity.describe instead")


def test_absence_is_asked_of_the_catalog_not_of_the_table():
    """A probe SELECT conflates 'the table is not there' with 'you may
    not read it', and this whole module exists because one message was
    made to stand for two different defects."""
    src = code_only(BACKEND / "services" / "db_identity.py")
    assert "to_regclass" in src
    assert "information_schema" not in src, (
        "information_schema.tables answers a different question — it "
        "omits views and is filtered by privilege")


# ══════════════════════════════════════════════════════════════════════
# 3. Against a real database
# ══════════════════════════════════════════════════════════════════════

@pytest.fixture
def conn():
    import psycopg2
    from database import create_tables
    from db_rows import ROW_FACTORY
    create_tables()
    c = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    yield c
    c.rollback()
    c.close()


@dbonly
def test_the_right_database_is_silent(conn):
    who = assert_tables(conn, "signing_participants", "signing_requests")
    assert who["database"]
    assert who["user"]


@dbonly
def test_a_table_that_is_there_is_not_reported_missing(conn):
    assert missing_tables(conn, ["signing_participants"]) == []


@dbonly
def test_the_wrong_database_says_which_one_it_looked_in(conn):
    """The half the original message was missing.

    Every value here is one a reader needs to decide between 'the schema
    was never created' and 'this service is pointed somewhere else', and
    the original error contained none of them.
    """
    with pytest.raises(WrongDatabase) as raised:
        assert_tables(conn, "signing_participants", "a_table_that_never_existed")
    message = str(raised.value)

    who = identity(conn)
    assert who["database"] in message
    assert str(who["host"]) in message
    assert str(who["port"]) in message
    assert who["user"] in message
    # The one that is missing, and the whole set that was expected.
    assert "a_table_that_never_existed" in message
    assert "signing_participants" in message
    # And it names the two candidate causes rather than implying one.
    assert "DATABASE_URL" in message


# ══════════════════════════════════════════════════════════════════════
# 4. The acceptance — the script itself, against a database that lacks
#    the table
# ══════════════════════════════════════════════════════════════════════

def _sibling_url(url: str, database: str) -> str:
    """The same server, a different database.

    `postgres` is the maintenance database every Postgres install has and
    none of this product's schema is in — a genuine wrong-database, on
    the machine the test is already talking to, with no DDL and nothing
    to clean up afterwards.
    """
    return re.sub(r"/[^/?]+(\?|$)", "/" + database + r"\1", url, count=1)


def _run_purge(url: str, *args, expected: str = ""):
    env = dict(os.environ, DATABASE_URL=url)
    env.pop("EXPECTED_DATABASE", None)
    if expected:
        env["EXPECTED_DATABASE"] = expected
    return subprocess.run(
        [sys.executable, "scripts/purge_signer_contact.py", *args],
        cwd=BACKEND, env=env, capture_output=True, text=True, timeout=120)


@dbonly
def test_the_marker_is_read_from_the_database_not_from_a_stub():
    """The stub above cannot tell one table name from another — it answers
    "present" to everything — so the marker's identity is checked here,
    against a real catalog.

    The maintenance database is the control: same server, real connection,
    and it will never carry the marker.
    """
    import psycopg2
    real = os.environ["DATABASE_URL"]
    marked = psycopg2.connect(real)
    try:
        assert is_scratch(marked) is True, (
            "the test database is not marked — CI marks it in the "
            f"proof-harnesses job; locally run: {MARK_COMMAND}")
    finally:
        marked.close()

    sibling = _sibling_url(real, "postgres")
    if sibling == real:
        pytest.skip("DATABASE_URL already points at the maintenance database")
    control = psycopg2.connect(sibling)
    try:
        assert is_scratch(control) is False
        with pytest.raises(WrongDatabase) as raised:
            assert_scratch(control)
        assert "postgres" in str(raised.value)
    finally:
        control.close()


@dbonly
def test_the_purge_refuses_a_database_that_lacks_the_table():
    """THE ACCEPTANCE, RUN.

    Not "assert_tables raises" — the script, invoked the way a cron job
    would invoke it, pointed at a real database on the real server that
    really does not have `signing_participants`.

    What is being bought is the MESSAGE, so the message is what is read.
    """
    real = os.environ["DATABASE_URL"]
    wrong = _sibling_url(real, "postgres")
    if wrong == real:
        pytest.skip("DATABASE_URL already points at the maintenance database")

    done = _run_purge(wrong)
    assert done.returncode == 1, (
        "the purge did not refuse a database without its tables: "
        + done.stdout + done.stderr)

    said = done.stderr
    assert "signing_participants" in said       # what it wanted
    assert "postgres" in said                   # where it actually was
    assert "DATABASE_URL" in said               # and what to go and check
    # It refused BEFORE reporting anything that reads like work done.
    assert "purged" not in done.stdout


@dbonly
def test_the_purge_refuses_a_correctly_shaped_database_it_was_not_meant_for():
    """The ledger's acceptance in its literal form: **a message naming
    both databases.**

    This is the staging case, and it is the one the table assertion
    cannot reach — every table is present, every query would succeed, and
    the purge would delete real contact details out of the wrong copy and
    report a cheerful count. Only the NAME separates them.
    """
    real = os.environ["DATABASE_URL"]
    done = _run_purge(real, expected="deedpro_production_not_this_one")

    assert done.returncode == 1, done.stdout + done.stderr
    said = done.stderr
    here = identity_of(real)["database"]
    assert here in said                                  # the one it is on
    assert "deedpro_production_not_this_one" in said     # the one it wants
    assert "purged" not in done.stdout


@dbonly
def test_the_right_database_runs_and_says_where():
    """The other half of the acceptance: correct is quiet, but not mute.

    `--verify` answers 'which database is this job actually on' without a
    psql session — the question that started the afternoon — and exits 0.
    """
    done = _run_purge(os.environ["DATABASE_URL"], "--verify")
    assert done.returncode == 0, done.stderr
    who = describe_from(os.environ["DATABASE_URL"])
    assert who in done.stdout.strip()
    assert done.stderr.strip() == ""


def _with_connection(url: str, fn):
    import psycopg2
    c = psycopg2.connect(url)
    try:
        return fn(c)
    finally:
        c.close()


def describe_from(url: str) -> str:
    return _with_connection(url, describe)


def identity_of(url: str) -> dict:
    return _with_connection(url, identity)
