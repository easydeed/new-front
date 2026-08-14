"""ADMIN1.5 remainder — reconciliation, the relapse sweep, and the sort
allowlist.

PR #113 fixed the SHAPE of the admin console's data (rows are objects
again, the drill-downs resolve). These are the numbers *inside* that
shape, and the browser audit's reading of them:

- "Deeds This Month: 0" on a platform that had not stopped — a calendar
  count with no window stated, read on the 2nd of a month.
- "0ms latency" under a green Database badge — `int(seconds * 1000)`
  truncating a sub-millisecond probe, which is a zero manufactured by
  rounding rather than measured.
- A percentage bar chart drawn over a handful of rows with its
  denominator nowhere on screen.

Each is the same defect ADMIN1 was fired to remove, wearing different
clothes: a number that looks like a measurement and is not one. The pins
below assert the honest form rather than the current spelling, because
the last round taught us that a pin matching a spelling guards a
spelling.

CI-safe (no database) except where marked.
"""
import ast
import re
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
ADMIN_INLINE = BACKEND / "routers" / "admin_inline.py"
ADMIN_V2 = BACKEND / "routers" / "admin_api_v2.py"


# T-3: the local code_only() lives in tests/source_text.py now — this
# was one of four near-identical copies, and the copies had drifted
# (one stripped comments but not docstrings, which is how the sixth
# pin-trip-on-a-comment happened). Owner-ruled consolidation.
from tests.source_text import code_only

# ── The month boundary ───────────────────────────────────────────────

def test_the_month_count_travels_with_its_window():
    """A calendar-month count is not wrong on the 2nd — it is unlabelled.
    The window start and a rolling 30-day figure ship alongside it so the
    console can say which month it means and offer the number that does
    not reset at midnight on the 1st."""
    src = code_only(ADMIN_INLINE)
    assert "deeds_this_month_since" in src, "the month window is not stated"
    assert "deeds_last_30_days" in src, "no rolling figure to reconcile against"
    assert "DATE_TRUNC('month', CURRENT_DATE)" in src, (
        "the calendar-month semantics should be kept, not quietly redefined"
    )
    assert "INTERVAL '30 days'" in src


def test_the_rolling_and_calendar_counts_are_separate_reads():
    """One is not derived from the other. If a future edit computes the
    30-day figure FROM the month figure they stop being independent and
    the reconciliation stops reconciling anything."""
    src = code_only(ADMIN_INLINE)
    assert not re.search(r"deeds_last_30_days\s*=\s*deeds_this_month", src)
    assert not re.search(r"deeds_this_month\s*=\s*deeds_last_30_days", src)


# ── The 0ms relapse ──────────────────────────────────────────────────

def test_latency_is_measured_on_a_monotonic_clock_without_truncation():
    """`int((time.time() - start) * 1000)` fails twice: it truncates a
    healthy sub-millisecond probe to 0, and it reads a wall clock that
    can step backwards under NTP."""
    src = code_only(ADMIN_INLINE)
    assert "perf_counter" in src, "latency should be measured monotonically"
    assert not re.search(r"int\(\s*\(?\s*time\.time\(\)", src), (
        "latency is being truncated to whole milliseconds again — a "
        "sub-millisecond probe renders as the string '0ms latency', which "
        "is a zero produced by rounding, not by measurement"
    )


def test_a_database_that_did_not_answer_reports_no_latency():
    """The initial value governs the failure path. `db_latency = 0` meant
    a dead database rendered '0ms' under an Offline badge — the fastest
    number on the screen, attached to the thing that was down."""
    src = code_only(ADMIN_INLINE)
    assert re.search(r"db_latency\s*=\s*None", src), (
        "latency must start as None so a failed probe reports an absence"
    )
    assert not re.search(r"db_latency\s*=\s*0\b", src)


# ── The sort allowlist ───────────────────────────────────────────────

def test_sort_keys_resolve_through_a_map_and_never_reach_sql_directly():
    """The ORDER BY fragment is interpolated into an f-string next to an
    interpolated WHERE clause. That is safe only while every value comes
    from a fixed map — so the pin is on the mechanism, not on a list of
    bad inputs nobody can enumerate."""
    import sys
    sys.path.insert(0, str(BACKEND))
    from routers.admin_api_v2 import USER_SORTS, DEED_SORTS, _order_by
    from fastapi import HTTPException

    for sorts in (USER_SORTS, DEED_SORTS):
        assert "newest" in sorts, "the documented default must exist"
        # An absent or empty `?sort=` is the default, not an error.
        assert _order_by(sorts, None) == sorts["newest"]
        assert _order_by(sorts, "") == sorts["newest"]
        for hostile in ["1; DROP TABLE users", "u.email); --", "newest DESC",
                        "newest;--", "NEWEST, id"]:
            with pytest.raises(HTTPException) as exc:
                _order_by(sorts, hostile)
            assert exc.value.status_code == 400

    src = code_only(ADMIN_V2)
    # No path from the raw query parameter into the SQL string.
    assert not re.search(r"ORDER BY\s*\{sort\}", src)
    assert "ORDER BY {order_sql}" in src


def test_the_applied_sort_is_echoed_to_the_client():
    """The console states its sort. It can only do that honestly if the
    server says which one it used rather than the client assuming its
    request was honoured.

    Counted rather than fixed at 2 (ADMIN3 added a third sorted list):
    the property is "every list that accepts a sort echoes one", so the
    pin compares the two populations instead of memorising a number.
    """
    src = code_only(ADMIN_V2)
    accepts_sort = len(re.findall(r"_order_by\(", src)) - 1  # minus the def
    echoes = src.count('"sort": (sort or DEFAULT_SORT).lower()')
    assert echoes == accepts_sort >= 2, (
        f"{accepts_sort} endpoints resolve a sort but {echoes} echo it — a "
        "list that sorts silently is the defect this replaced"
    )


# ── Live-DB reconciliation ───────────────────────────────────────────

@pytest.mark.skipif(not __import__("os").getenv("DATABASE_URL"),
                    reason="live test DB required")
def test_the_dashboard_serves_both_windows_and_the_label():
    import os
    import psycopg2
    from fastapi.testclient import TestClient
    from main import app

    email, password = "recon@admin.example", "Recon!Passw0rd"
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
        "full_name": "Recon Admin", "job_title": "escrow_officer",
        "state": "CA", "agree_terms": True})
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET role = 'admin' WHERE email = %s", (email,))
    conn.close()

    token = client.post("/users/login", json={
        "email": email, "password": password}).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    data = client.get("/admin/dashboard", headers=auth).json()
    assert "deeds_this_month" in data
    assert "deeds_last_30_days" in data
    assert re.fullmatch(r"\d{4}-\d{2}-01", data["deeds_this_month_since"]), (
        "the window label must be the first of a month — it is what the "
        "console renders as 'since Aug 1'"
    )
    # The calendar month is a subset of the trailing 30 days for any
    # month shorter than 31 days into itself; the invariant that always
    # holds is that neither exceeds the total.
    assert data["deeds_this_month"] <= data["total_deeds"]
    assert data["deeds_last_30_days"] <= data["total_deeds"]

    # Sorting is real, not decorative: two orders, two answers.
    newest = client.get("/admin/users/search?limit=5&sort=newest", headers=auth).json()
    oldest = client.get("/admin/users/search?limit=5&sort=oldest", headers=auth).json()
    assert newest["sort"] == "newest" and oldest["sort"] == "oldest"
    if newest["total"] > 1:
        assert newest["items"][0]["id"] != oldest["items"][0]["id"]

    assert client.get("/admin/users/search?sort=nonsense", headers=auth).status_code == 400
    assert client.get("/admin/deeds/search?sort=nonsense", headers=auth).status_code == 400

    # Latency is a measurement or an absence — never a rounded zero.
    health = client.get("/admin/system/overview", headers=auth).json()["health"]
    latency = health["database"]["latency_ms"]
    if health["database"]["status"] == "up":
        assert latency is not None and latency > 0, (
            "a completed probe reported zero elapsed time — the truncation is back"
        )
    else:
        assert latency is None
