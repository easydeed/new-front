"""Partner-API behavioral baseline (A1 gate — six-flow's sibling).

Runs the partner lifecycle against the real app with a real Postgres and
compares normalized results to a committed snapshot. The six-flow harness
covers the officer's browser path; this covers the machine's path, which
until A1 had no coverage below the render mapping at all — and shipped two
defects (tuple-read auth, unassigned full_address) that only an HTTP+DB
run could catch.

  1. admin mints an API key (the real /admin/api-keys path)
  2. POST /api/v1/deeds — partner-generated deed on the shared chassis
  3. idempotent replay — same Idempotency-Key returns the SAME deed
  4. GET /api/v1/deeds/{id}/pdf — stored bytes
  5. GET /api/v1/verify/{document_id} — public verification
  6. metering — api_usage_log rows accrue

Usage (standalone — do not run inside the main pytest run):
  DATABASE_URL=postgresql://... JWT_SECRET_KEY=x python scripts/api_baseline.py record
  DATABASE_URL=postgresql://... JWT_SECRET_KEY=x python scripts/api_baseline.py verify

Any verify diff = stop and report. Exit code 1 on mismatch.
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SNAPSHOT = Path(__file__).resolve().parent.parent / "tests" / "snapshots" / "api_baseline.json"

ADMIN_EMAIL = "apibaseline@partner.test"
ADMIN_PASSWORD = "Baseline!Passw0rd"
IDEMPOTENCY_KEY = "api-baseline-fixed-key"


def _await_schema_convergence():
    """Importing `database` starts the daemon "schema-convergence" thread
    (it exists so uvicorn can bind its port before DDL runs — the
    2026-07-28 deploy-timeout fix). A harness that touches tables while
    that thread is mid-DDL deadlocks against it: the thread holds/awaits
    ACCESS EXCLUSIVE while our statements hold ACCESS SHARE. Join it
    first, then own the database alone."""
    import threading
    for t in threading.enumerate():
        if t.name == "schema-convergence":
            t.join(timeout=120)


def ensure_schema(db_url):
    """H1: schema comes solely from database.create_tables() — this
    harness carries no DDL of its own. Data cleanup only."""
    import psycopg2
    from database import create_tables
    _await_schema_convergence()
    create_tables()
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("""DELETE FROM api_usage_log WHERE api_key_id IN
                   (SELECT id FROM api_keys WHERE created_by_email = %s)""", (ADMIN_EMAIL,))
    cur.execute("""DELETE FROM api_deeds WHERE api_key_id IN
                   (SELECT id FROM api_keys WHERE created_by_email = %s)""", (ADMIN_EMAIL,))
    cur.execute("""DELETE FROM api_rate_limits WHERE api_key_id IN
                   (SELECT id FROM api_keys WHERE created_by_email = %s)""", (ADMIN_EMAIL,))
    cur.execute("DELETE FROM api_keys WHERE created_by_email = %s", (ADMIN_EMAIL,))
    cur.execute("""DELETE FROM user_profiles WHERE user_id IN
                   (SELECT id FROM users WHERE email = %s)""", (ADMIN_EMAIL,))
    cur.execute("DELETE FROM users WHERE email = %s", (ADMIN_EMAIL,))
    conn.close()


def _deed_body():
    return {
        "deed_type": "grant_deed",
        "property": {
            "address": "88 Baseline Partner Way", "city": "Los Angeles", "state": "CA",
            "zip": "90001", "county": "Los Angeles", "apn": "9090-111-222",
            "legal_description": "LOT 9, BLOCK 1, PARTNER BASELINE TRACT",
        },
        "grantor": {"name": "PARTNER BASE GRANTOR"},
        "grantee": {"name": "PARTNER BASE GRANTEE", "vesting": "a single person"},
        "transfer_tax": {"exempt": False, "value": 500000.0, "computed_amount": "550.00",
                         "basis": "full_value", "city_tax": True, "city_name": "Los Angeles"},
        "recording": {
            "requested_by": "Baseline Partner Escrow",
            "return_to": {"name": "PARTNER BASE GRANTEE", "address": "88 Baseline Partner Way",
                          "city": "Los Angeles", "state": "CA", "zip": "90001"},
            "title_order_no": "TO-API-1", "escrow_no": "ESC-API-1",
        },
    }


def _sql(db_url, statement, params=None, fetch=False):
    """Short-lived autocommit connection per statement. Deliberate: schema
    convergence runs in a daemon thread at app startup, so a harness
    session held open across requests can deadlock against its DDL."""
    import psycopg2
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(statement, params or ())
            return cur.fetchone() if fetch else None
    finally:
        conn.close()


def run_flows(db_url):
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    results = {}

    # ── Flow 1: admin mints a key ─────────────────────────────────
    client.post("/users/register", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "confirm_password": ADMIN_PASSWORD,
        "full_name": "API Baseline Admin", "job_title": "escrow_officer", "state": "CA",
        "agree_terms": True,
    })
    _sql(db_url, "UPDATE users SET role = 'admin' WHERE email = %s", (ADMIN_EMAIL,))
    token = client.post("/users/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).json().get("access_token", "")
    mint = client.post("/admin/api-keys", headers={"Authorization": f"Bearer {token}"},
                       json={"name": "api-baseline", "is_test": True})
    minted = mint.json().get("api_key", {}) if mint.status_code == 200 else {}
    api_key = minted.get("key", "")
    results["1_key_mint"] = {
        "status": mint.status_code,
        "key_prefix_scheme": api_key[:8],
        "prefix_len": len(minted.get("key_prefix", "")),
        "shown_once_warning": bool(mint.json().get("warning")) if mint.status_code == 200 else False,
        "returned_keys": sorted(minted.keys()),
    }
    auth = {"Authorization": f"Bearer {api_key}"}

    # ── Flow 2: partner deed creation ─────────────────────────────
    create = client.post("/api/v1/deeds", json=_deed_body(), headers=auth)
    data = create.json().get("data", {}) if create.status_code == 200 else {}
    deed_id = data.get("deed_id", "")
    document_id = data.get("document_id", "")
    results["2_create_deed"] = {
        "status": create.status_code,
        "data_keys": sorted(data.keys()),
        "deed_id_scheme": deed_id.split("_")[0] if deed_id else "",
        # Scheme only — the year segment would make this baseline fail on
        # January 1st for no behavioral reason.
        "document_id_scheme": document_id.split("-")[0] if document_id else "",
        "deed_type": data.get("deed_type"),
        "status_value": data.get("status"),
        "property": data.get("property"),
        "parties": data.get("parties"),
        "transfer_tax": data.get("transfer_tax"),
        "url_keys": sorted((data.get("urls") or {}).keys()),
    }

    # ── Flow 3: idempotent replay ─────────────────────────────────
    idem = dict(auth, **{"Idempotency-Key": IDEMPOTENCY_KEY})
    first = client.post("/api/v1/deeds", json=_deed_body(), headers=idem)
    second = client.post("/api/v1/deeds", json=_deed_body(), headers=idem)
    fid = first.json().get("data", {}).get("deed_id")
    sid = second.json().get("data", {}).get("deed_id")
    results["3_idempotency"] = {
        "first_status": first.status_code,
        "second_status": second.status_code,
        "same_deed_returned": bool(fid) and fid == sid,
        "distinct_from_unkeyed": bool(fid) and fid != deed_id,
    }

    # ── Flow 4: PDF download ──────────────────────────────────────
    dl = client.get(f"/api/v1/deeds/{deed_id}/pdf", headers=auth)
    results["4_pdf_download"] = {
        "status": dl.status_code,
        "content_type": dl.headers.get("content-type"),
        "is_pdf": dl.content[:5] == b"%PDF-",
        "over_1kb": len(dl.content) > 1000,
    }

    # ── Flow 5: public verification ───────────────────────────────
    ver = client.get(f"/api/v1/verify/{document_id}")
    vj = ver.json() if ver.status_code == 200 else {}
    results["5_verification"] = {
        "status": ver.status_code,
        "valid": vj.get("valid"),
        "document_keys": sorted((vj.get("document") or {}).keys()),
        "no_auth_required": True,
    }

    # ── Flow 6: metering + honest auth failure ────────────────────
    bad = client.post("/api/v1/deeds", json=_deed_body(),
                      headers={"Authorization": "Bearer dp_live_notarealkey0000"})
    metered = _sql(db_url, """SELECT COUNT(*) FROM api_usage_log ul
                              JOIN api_keys ak ON ak.id = ul.api_key_id
                              WHERE ak.created_by_email = %s""",
                   (ADMIN_EMAIL,), fetch=True)[0]
    stored = _sql(db_url, """SELECT COUNT(*) FROM api_deeds ad
                             JOIN api_keys ak ON ak.id = ad.api_key_id
                             WHERE ak.created_by_email = %s""",
                  (ADMIN_EMAIL,), fetch=True)[0]
    results["6_metering_and_auth"] = {
        "invalid_key_status": bad.status_code,
        "invalid_key_code": (bad.json().get("detail") or {}).get("code"),
        "usage_rows_recorded": metered > 0,
        # 2 deeds: one unkeyed create + one idempotent pair collapsed to one
        "deeds_stored": stored,
    }
    return results


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "verify"
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL required")
    ensure_schema(db_url)
    results = run_flows(db_url)

    if mode == "record":
        SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
        SNAPSHOT.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n")
        print(f"Recorded API baseline -> {SNAPSHOT}")
        for k, v in results.items():
            print(f"  {k}: {v}")
        return

    expected = json.loads(SNAPSHOT.read_text())
    if results == expected:
        print("API BASELINE: all partner flows match the recorded snapshot ✔")
        return
    print("API BASELINE: MISMATCH")
    for key in sorted(set(expected) | set(results)):
        if expected.get(key) != results.get(key):
            print(f"--- {key}\n  expected: {json.dumps(expected.get(key), sort_keys=True)}\n  actual:   {json.dumps(results.get(key), sort_keys=True)}")
    sys.exit(1)


if __name__ == "__main__":
    main()
