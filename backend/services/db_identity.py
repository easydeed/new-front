"""Which database is this, and does it have what I need.

═══ THE AFTERNOON THIS COST ═══

    relation "signing_participants" does not exist

That message sent us hunting for a schema that had never run — a
migration to re-check, a `create_tables` call to audit, two redeploys on
an untested hypothesis. The schema was fine. The service was pointed at
the wrong database.

The same failure, phrased with its context:

    signing_participants not found in deedpro_database on 10.26.62.99:5432
    — expected one of: signing_participants, signing_windows

ends the investigation in one run and names the actual defect.

═══ INVARIANT #4, APPLIED TO DIAGNOSTICS ═══

The rule everywhere else in this codebase is that a failure must surface
with its reason. This is the same rule pointed at the failure itself: **an
error that names its context is a different quality of error.** Both
messages above are technically true and only one of them is useful, and
the difference is four values Postgres will hand over for free.

═══ TWO DIFFERENT WRONG DATABASES ═══

A database missing the tables is the loud kind of wrong, and the tables
are enough to catch it. **Staging is the quiet kind** — every table
present, every query succeeding, the purge deleting real contact details
out of the wrong copy and reporting a cheerful count.

Nothing about the connection distinguishes those two databases except
their names, so `EXPECTED_DATABASE` lets a deployment state which one it
means and `assert_tables(..., expect_database=...)` holds the job to it.
It is optional because a local run and CI both legitimately point
somewhere else; it is worth having because the one place it would be set
is the one place being wrong is unrecoverable.

═══ WHY A MECHANISM RATHER THAN A HABIT ═══

The specific defect is fixed and the standing rule is recorded. This is
the difference between a rule people must remember and a mechanism that
remembers for them — the same distinction the purge itself was held to,
and the same one `services/environment.py` just applied to the
environment.

The identity block is also useful when nothing is wrong: `--verify`
answers "which database is this service actually on" without a psql
session, which is the question that started the afternoon.
"""
from __future__ import annotations

import os
from typing import Any, Dict, Sequence


class WrongDatabase(RuntimeError):
    """A missing table, reported with the database it is missing FROM.

    Named rather than a bare RuntimeError so a traceback says what kind
    of problem this is before anybody reads the message.
    """


def identity(conn) -> Dict[str, Any]:
    """Who am I connected to.

    `inet_server_addr()` returns NULL over a unix socket — that is not an
    error and the caller must not read it as one, so it is reported as
    "local socket" rather than as an empty string that looks like a
    lookup that failed.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT current_database() AS db, "
                    "inet_server_addr() AS host, "
                    "inet_server_port() AS port, "
                    "current_user AS who, "
                    "version() AS version")
        row = cur.fetchone()

    # RealDictCursor gives a dict; a plain cursor gives a tuple. This
    # module is called from scripts that may configure either, and a
    # diagnostic that crashes on the cursor factory is a diagnostic that
    # fails exactly when it is needed.
    def field(name: str, index: int):
        if row is None:
            return None
        try:
            return row[name]
        except (TypeError, KeyError, IndexError):
            return row[index]

    host = field("host", 1)
    return {
        "database": field("db", 0),
        "host": str(host) if host is not None else "local socket",
        "port": field("port", 2),
        "user": field("who", 3),
        "version": (field("version", 4) or "").split(" on ")[0],
    }


def describe(conn) -> str:
    """The identity block, one line, for a log or a --verify flag."""
    who = identity(conn)
    return (f"{who['database']} on {who['host']}:{who['port']} "
            f"as {who['user']} ({who['version']})")


def missing_tables(conn, names: Sequence[str]) -> list:
    """Which of `names` this database does not have.

    Asks the catalog rather than SELECTing from each table: a permission
    error and an absent table are different problems, and a probe query
    conflates them. `to_regclass` returns NULL for "not there" and does
    not care whether you could read it.
    """
    absent = []
    with conn.cursor() as cur:
        for name in names:
            cur.execute("SELECT to_regclass(%s) IS NULL AS gone", (name,))
            row = cur.fetchone()
            try:
                gone = row["gone"]
            except (TypeError, KeyError, IndexError):
                gone = row[0]
            if gone:
                absent.append(name)
    return absent


def expected_database() -> str:
    """The database this job was told it is for, if anybody said.

    `EXPECTED_DATABASE` is read here rather than in each script, so the
    three callers share one spelling and one default. Unset means "run
    wherever DATABASE_URL points", which is what a local run and CI both
    need — and it is why this is a declaration a deployment makes, not a
    check the code can insist on by itself.
    """
    return (os.getenv("EXPECTED_DATABASE") or "").strip()


def assert_tables(conn, *names: str, expect_database: str = "") -> Dict[str, Any]:
    """Refuse to proceed against a database that lacks what we need.

    Returns the identity dict on success, so a caller that wants to log
    "running against X" gets it without a second round trip.

    THE MESSAGE IS THE POINT. It names the database it is looking at, the
    host it is on, and every table it expected — so the reader learns in
    one line whether the schema is missing or the connection is.

    ═══ WHY THE NAME CHECK EXISTS AS WELL ═══

    Missing tables catch the loud case: the wrong database, empty. They
    cannot catch the quiet one — **staging, which has every table** — and
    for a job that deletes rows that is the worse of the two. A name is
    the only thing that distinguishes two correctly-shaped databases, so
    a deployment that knows which one it means can say so and this will
    hold it to it.
    """
    if not names:
        raise ValueError("assert_tables() with no table names asserts nothing")

    # The name first: if it is wrong, a missing table is a symptom rather
    # than the finding, and reporting the symptom sends the reader back
    # to the schema — which is exactly the afternoon this file is about.
    if expect_database:
        who = identity(conn)
        if who["database"] != expect_database:
            raise WrongDatabase(
                f"this is {who['database']} on {who['host']}:{who['port']} "
                f"(as {who['user']}), and this job was told it is for "
                f"{expect_database}. Refusing. Point DATABASE_URL at "
                f"{expect_database}, or change EXPECTED_DATABASE if the "
                "job has genuinely moved."
            )

    absent = missing_tables(conn, names)
    if not absent:
        return identity(conn)

    who = identity(conn)
    raise WrongDatabase(
        f"{', '.join(absent)} not found in {who['database']} on "
        f"{who['host']}:{who['port']} (connected as {who['user']}) — "
        f"expected a database with: {', '.join(names)}. "
        "Either this service is pointed at the wrong DATABASE_URL, or "
        "the schema has not been created on this one. The message names "
        "both so you do not have to guess which."
    )


# ── Is this a database I may destroy? ────────────────────────────────

SCRATCH_MARKER = "deedpro_scratch_database"

MARK_COMMAND = ("python scripts/mark_scratch_database.py "
                "--yes-this-is-a-throwaway-database")


def is_scratch(conn) -> bool:
    """Does this database carry the throwaway marker."""
    return not missing_tables(conn, [SCRATCH_MARKER])


def assert_scratch(conn) -> Dict[str, Any]:
    """Refuse to run a destructive harness against an unmarked database.

    ═══ WHY A MARKER AND NOT A FLAG OR A NAME ═══

    `s1_concurrency_proof` and `s2_restore_drill` insert users and deeds
    into whatever `DATABASE_URL` points at, and `s2` runs `pg_dump` and
    `pg_restore`. Pointed at production they would write junk rows into
    real tables. Three mechanisms were considered and two were rejected:

      - `ALLOW_DESTRUCTIVE_TESTS=1` — an opt-in somebody eventually sets
        and forgets. A variable left set is indistinguishable from one
        set on purpose, and the forgetting is silent.
      - matching the production database NAME — fails the moment a second
        production-shaped database exists, which is precisely the
        situation this codebase just lived through.

    Both of those BLACKLIST the dangerous thing. A marker table
    WHITELISTS the safe one: throwaway databases carry it, production
    never will, and the check is a positive fact rather than the absence
    of a negative one. `EXPECTED_DATABASE` above is the same reasoning
    pointed the other way — name the expected thing, never enumerate the
    dangerous ones.

    ═══ THE HONEST BOUND ═══

    Creating the marker is itself a deliberate act, and nothing here can
    stop somebody running the marking script against production. What
    changes is the SHAPE of the mistake: "I pasted the wrong
    DATABASE_URL" no longer destroys data, because a second, explicit,
    differently-worded act is required first. Mis-pasting is common;
    declaring production a throwaway database is not.
    """
    if is_scratch(conn):
        return identity(conn)

    who = identity(conn)
    raise WrongDatabase(
        f"{who['database']} on {who['host']}:{who['port']} is not marked as "
        "a throwaway database, and this harness writes rows and drops "
        "data. Refusing.\n\n"
        f"If {who['database']} really is disposable, mark it once:\n"
        f"    DATABASE_URL=... {MARK_COMMAND}\n\n"
        "If it is not, this message is doing its job — check DATABASE_URL."
    )


def mark_scratch(conn) -> None:
    """Declare this database disposable. Deliberate, never automatic.

    Kept out of `create_tables` on purpose: the schema authority runs
    against production on every boot, and a marker it created would mark
    the one database that must never carry it.
    """
    with conn.cursor() as cur:
        cur.execute(
            f"CREATE TABLE IF NOT EXISTS {SCRATCH_MARKER} ("
            "  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),"
            "  marked_by TEXT NOT NULL,"
            "  note TEXT"
            ")")
        cur.execute(
            f"INSERT INTO {SCRATCH_MARKER} (marked_by, note) VALUES (%s, %s)",
            (identity(conn)["user"],
             "Declared disposable. Destructive harnesses may run here."))
