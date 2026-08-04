"""ADMIN1 — the console's numbers are measurements or absences, never both.

ADMIN0's audit found the System tab partly hardcoded to look healthy and
two screens rendering zeros that were really failures. The rule these
tests hold: **a number shown to an operator must be measured; anything
unmeasured is reported as absent, and anything unreadable says so.**

The three named fabrications:
  1. `pdf_engine: {"status": "up"}` — a literal, no probe ever run.
  2. `avg_time_ms: 0` — initialised and never assigned.
  3. `weasyprint_count = total_generated` — an assertion, and
     `total_generated` counted deed STATUS rather than stored PDFs.

Plus doctrine §9's insert-or-refuse, which lives in the same pass.
"""
import inspect
import os
from pathlib import Path
from unittest.mock import patch

import pytest

BACKEND = Path(__file__).resolve().parents[1]
LIVE_DB = os.getenv("DATABASE_URL")


# T-3: the local code_only() lives in tests/source_text.py now — this
# was one of four near-identical copies, and the copies had drifted
# (one stripped comments but not docstrings, which is how the sixth
# pin-trip-on-a-comment happened). Owner-ruled consolidation.
from tests.source_text import code_only

# ── The fabricated-health kill list ──────────────────────────────────

def test_pdf_engine_status_is_probed_not_asserted():
    from routers import admin_inline
    src = inspect.getsource(admin_inline.admin_system_overview)
    assert '"pdf_engine": {"status": "up"' not in src, "the hardcoded literal came back"
    assert "render_pdf(" in src, "the engine must actually be exercised"
    assert 'b"%PDF-"' in src, "the probe must check it got a PDF back"


def test_avg_render_time_is_absent_not_zero():
    """Nothing in the platform times a render, so there is no honest
    number. Absence is reported; a 0 would read as a measurement."""
    from routers import admin_inline
    src = inspect.getsource(admin_inline.admin_system_overview)
    assert '"avg_time_ms": None' in src
    assert '"avg_time_ms": 0' not in src


def test_stored_pdf_count_is_counted_not_asserted():
    from routers import admin_inline
    src = inspect.getsource(admin_inline.admin_system_overview)
    assert "COUNT(*) FROM deed_pdfs" in src, "count stored artifacts, not deed status"
    assert 'pdf_stats["weasyprint_count"] = pdf_stats["total_generated"]' not in src


def test_unmonitored_services_say_so():
    """SiteX has no probe. Reporting a hardcoded 'unknown' looks like a
    checked result that came back inconclusive; it wasn't checked."""
    from routers import admin_inline
    src = inspect.getsource(admin_inline.admin_system_overview)
    assert "not_monitored" in src


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_probe_reports_down_when_the_engine_is_broken():
    """The point of a probe: it fails when the thing fails."""
    from fastapi.testclient import TestClient
    from main import app
    import psycopg2

    client = TestClient(app)
    email, password = "admin1probe@t.example", "Probe!Passw0rd"
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("""DELETE FROM user_profiles WHERE user_id IN
                       (SELECT id FROM users WHERE email = %s)""", (email,))
        cur.execute("DELETE FROM users WHERE email = %s", (email,))
    conn.close()
    client.post("/users/register", json={
        "email": email, "password": password, "confirm_password": password,
        "full_name": "Probe", "role": "escrow_officer", "state": "CA", "agree_terms": True})
    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET role = 'admin' WHERE email = %s", (email,))
    conn.close()
    token = client.post("/users/login", json={
        "email": email, "password": password}).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    healthy = client.get("/admin/system/overview", headers=auth).json()
    assert healthy["health"]["pdf_engine"]["status"] == "up"

    with patch("pdf_engine.render_pdf", side_effect=RuntimeError("libpango missing")):
        broken = client.get("/admin/system/overview", headers=auth).json()
    assert broken["health"]["pdf_engine"]["status"] == "down"
    assert "libpango missing" in broken["health"]["pdf_engine"]["error"]


# ── Revenue: a zero must mean zero ───────────────────────────────────

def test_revenue_reads_return_unknown_not_zero_on_failure():
    from phase23_billing.services import revenue
    src = code_only(inspect.getsource(revenue))
    assert "return 0" not in src, "the silent-zero came back"
    assert "subscriptions table doesn't exist yet, return zeros" not in src
    assert "UNKNOWN = None" in src


def test_revenue_endpoint_surfaces_errors():
    from phase23_billing import router_admin
    src = inspect.getsource(router_admin.revenue)
    assert '"errors"' in src


def test_revenue_failure_yields_null_and_a_reason():
    """A broken session must produce nulls plus reasons — never a
    confident $0 on the money screen."""
    from phase23_billing.services.revenue import get_revenue_overview, mrr_arr

    class BrokenSession:
        def execute(self, *a, **k):
            raise RuntimeError('relation "payment_history" does not exist')

        def rollback(self):
            pass

    overview = get_revenue_overview(BrokenSession())
    assert overview["total_revenue_cents"] is None
    assert overview["net_monthly_revenue_cents"] is None
    assert any("does not exist" in e for e in overview["errors"])

    mrr = mrr_arr(BrokenSession())
    assert mrr["mrr_cents"] is None
    assert mrr["errors"]


# ── Schema authority (H1) ────────────────────────────────────────────

def test_billing_and_partner_tables_are_in_the_schema_authority():
    """Production check 2026-08-03: invoices/payment_history/partners
    existed via hand-run migrations; subscriptions did not exist at all,
    which is why Revenue's $0 was the no-table branch."""
    schema = (BACKEND / "database.py").read_text(encoding="utf-8")
    for table in ["partners", "invoices", "payment_history", "subscriptions"]:
        assert f"CREATE TABLE IF NOT EXISTS {table}" in schema, table


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_the_four_tables_exist_after_convergence():
    # No create_tables() here: calling it mid-suite issues ALTER TABLE
    # users, which queues behind any open transaction and then blocks
    # every later reader. Schema is already converged when tests run.
    import psycopg2
    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("""SELECT table_name FROM information_schema.tables
                       WHERE table_name IN ('partners','invoices','payment_history','subscriptions')""")
        found = {r[0] for r in cur.fetchall()}
    conn.close()
    assert found == {"partners", "invoices", "payment_history", "subscriptions"}


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_subscriptions_carries_every_column_the_webhook_writes():
    """The webhook UPDATEs status, cancel_at_period_end, mrr_cents and
    matches on stripe_subscription_id. The table was created fresh here,
    so phase23_006's ALTER-IF-EXISTS ladder never applied to it."""
    import psycopg2
    conn = psycopg2.connect(LIVE_DB)
    with conn.cursor() as cur:
        cur.execute("""SELECT column_name FROM information_schema.columns
                       WHERE table_name = 'subscriptions'""")
        cols = {r[0] for r in cur.fetchall()}
    conn.close()
    for needed in ["status", "cancel_at_period_end", "mrr_cents",
                   "stripe_subscription_id", "updated_at"]:
        assert needed in cols, needed


# ── Doctrine §9: insert-or-refuse ────────────────────────────────────

def test_the_overwriting_upsert_is_gone():
    src = code_only((BACKEND / "services/deed_pdf.py").read_text(encoding="utf-8"))
    assert "SET pdf_data = EXCLUDED.pdf_data" not in src, \
        "the overwrite came back — a stored instrument is never replaced"
    assert "ON CONFLICT (deed_id) DO NOTHING" in src


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_identical_restore_is_a_noop_and_different_bytes_are_refused():
    """Idempotent regeneration must keep working (the H1 self-heal path
    depends on it); a genuinely different artifact must be refused."""
    import psycopg2
    from services.deed_pdf import StoredPdfConflict, store_deed_pdf

    conn = psycopg2.connect(LIVE_DB)
    conn.autocommit = False
    with conn.cursor() as cur:
        cur.execute("""INSERT INTO users (email, password_hash, full_name, role, state)
                       VALUES ('pdfconflict@t.example', 'x', 'PDF Conflict', 'escrow_officer', 'CA')
                       ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
                       RETURNING id""")
        user_id = cur.fetchone()[0]
        cur.execute("""INSERT INTO deeds (user_id, deed_type, property_address, status)
                       VALUES (%s, 'grant-deed', '1 Conflict St', 'draft') RETURNING id""",
                    (user_id,))
        deed_id = cur.fetchone()[0]
        cur.execute("DELETE FROM deed_pdfs WHERE deed_id = %s", (deed_id,))
        conn.commit()

    first = store_deed_pdf(conn, deed_id, b"%PDF-1.4 original")
    # Same bytes again: allowed, and the stored hash is unchanged.
    again = store_deed_pdf(conn, deed_id, b"%PDF-1.4 original")
    assert first == again

    with pytest.raises(StoredPdfConflict) as exc:
        store_deed_pdf(conn, deed_id, b"%PDF-1.4 DIFFERENT")
    assert exc.value.stored_sha256 == first
    assert "supersede" in str(exc.value)

    conn.rollback()
    with conn.cursor() as cur:
        cur.execute("SELECT sha256 FROM deed_pdfs WHERE deed_id = %s", (deed_id,))
        row = cur.fetchone()
        assert row is None or row[0] == first, "the original must survive the refusal"
        cur.execute("DELETE FROM deed_pdfs WHERE deed_id = %s", (deed_id,))
        cur.execute("DELETE FROM deeds WHERE id = %s", (deed_id,))
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
    conn.close()
