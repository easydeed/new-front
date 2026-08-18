"""Shared fixtures — and the one thing the whole suite assumed.

═══ THE RACE THIS CLOSES ═══

`database.py` converges the schema in a DAEMON THREAD started at import,
deliberately: running `create_tables()` on the import path blocked
uvicorn's port binding, a slow boot exceeded Render's port-detection
window, and a deploy timed out with the old instance still serving. That
design is right for the service.

For the TEST SUITE it is a race nobody declared. The first tests to run
are the earliest alphabetically — `test_admin1_*`, `test_admin15_*` —
and they query `users` and `user_profiles` directly. When the thread has
not finished, they fail with `relation "users" does not exist`, five at a
time, in a run where nothing is wrong with the code.

`test_the_four_tables_exist_after_convergence` states the assumption in
its own comment: "Schema is already converged when tests run." That is a
belief about TIMING held by a test that does not wait, which is the same
shape as every finding in the ledger — an assertion about something
nothing checks.

So the suite waits, ONCE, before anything runs. It does not call
`create_tables()` itself: doing that mid-suite issues `ALTER TABLE users`,
which queues behind any open transaction and then blocks every later
reader (the reason that comment exists). It watches for the convergence
the service already performs, and it FAILS LOUDLY if that never happens —
a schema that will not converge is a real failure, and waiting forever
would turn it into a hang.
"""
import os
import time

import pytest


#: Tables the earliest tests query directly. Not the whole schema — the
#: point is a convergence SIGNAL, and these five are what the failures
#: named.
_EXPECTED_TABLES = frozenset({
    "users", "user_profiles", "partners", "invoices", "payment_history",
    "subscriptions",
})

_CONVERGENCE_TIMEOUT_SECONDS = 90


@pytest.fixture(scope="session", autouse=True)
def _schema_has_converged():
    """Block until the background convergence has produced a schema.

    A no-op when there is no DATABASE_URL: that job's DB-backed tests
    skip, and there is nothing to wait for.
    """
    url = os.getenv("DATABASE_URL")
    if not url:
        return

    import psycopg2

    # Importing `database` starts the convergence thread if nothing has
    # started it yet — otherwise this waits for a thread that will never
    # run and reports a timeout for the wrong reason.
    import database  # noqa: F401

    deadline = time.time() + _CONVERGENCE_TIMEOUT_SECONDS
    missing = set(_EXPECTED_TABLES)
    while time.time() < deadline:
        conn = psycopg2.connect(url)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT table_name FROM information_schema.tables "
                            "WHERE table_schema = 'public'")
                present = {row[0] for row in cur.fetchall()}
        finally:
            conn.close()
        missing = set(_EXPECTED_TABLES) - present
        if not missing:
            return
        time.sleep(1)

    raise RuntimeError(
        "the schema did not converge within "
        f"{_CONVERGENCE_TIMEOUT_SECONDS}s — still missing: {sorted(missing)}. "
        "This is the failure the suite used to report as five unrelated "
        "'relation does not exist' errors."
    )


@pytest.fixture
def service_info():
    return {
        "endpoint": "https://www.titlepoint.com/TitlePointServices/TpsService.asmx",
        "username": "test_user",
        "password": "test_pass",
        "service_type": "Property",
    }


@pytest.fixture
def email():
    return "test@example.com"


@pytest.fixture
def password():
    return "test_pass"


