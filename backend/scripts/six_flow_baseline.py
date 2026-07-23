"""Six-flow behavioral baseline (T8 gate — stands in for the deferred
owner click-through).

Runs the six load-bearing flows against the real app with a real Postgres
and compares normalized results to the committed snapshot:

  1. register + login (JWT issued)
  2. deed save via the proxy payload shape (POST /deeds)
  3. GET /deeds/{id}
  4. authenticated PDF download (stored-PDF pipeline)
  5. share-create (POST /shared-deeds)
  6. Stripe checkout.session.completed webhook -> users.plan sync

Usage (standalone process — do not run inside the main pytest run):
  DATABASE_URL=postgresql://... JWT_SECRET_KEY=x python scripts/six_flow_baseline.py record
  DATABASE_URL=postgresql://... JWT_SECRET_KEY=x python scripts/six_flow_baseline.py verify

Any verify diff = stop and report. Exit code 1 on mismatch.
"""
import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Runnable from backend/ or backend/scripts/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SNAPSHOT = Path(__file__).resolve().parent.parent / "tests" / "snapshots" / "six_flow_baseline.json"

BASELINE_EMAIL = "baseline@sixflow.test"
BASELINE_PASSWORD = "Baseline!Passw0rd"


def ensure_schema(db_url):
    """Bring a fresh database up to the columns the live flows need."""
    import psycopg2
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    from database import create_tables
    create_tables()
    for stmt in [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS company_type VARCHAR(100)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(10)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscribe BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS agree_terms BOOLEAN DEFAULT TRUE",
        "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS grantor_name VARCHAR(255)",
        "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS grantee_name VARCHAR(255)",
        "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500)",
        "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'",
        "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255)",
        "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP",
        """CREATE TABLE IF NOT EXISTS deed_shares (
            id SERIAL PRIMARY KEY,
            deed_id INT NOT NULL,
            owner_user_id INT NOT NULL,
            recipient_email TEXT NOT NULL,
            token UUID DEFAULT gen_random_uuid(),
            status VARCHAR(16) DEFAULT 'sent',
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            feedback TEXT, feedback_at TIMESTAMPTZ, feedback_by VARCHAR(255),
            viewed_at TIMESTAMPTZ, view_count INT DEFAULT 0,
            last_reminder_sent_at TIMESTAMPTZ, reminder_count INT DEFAULT 0
        )""",
    ]:
        cur.execute(stmt)
    # deterministic reruns
    cur.execute("DELETE FROM deed_shares")
    cur.execute("DELETE FROM deed_pdfs") if _table_exists(cur, "deed_pdfs") else None
    cur.execute("DELETE FROM deeds")
    cur.execute("DELETE FROM users WHERE email = %s", (BASELINE_EMAIL,))
    conn.close()


def _table_exists(cur, name):
    cur.execute("SELECT 1 FROM information_schema.tables WHERE table_name=%s", (name,))
    return cur.fetchone() is not None


def run_flows():
    from fastapi.testclient import TestClient
    from main import app  # T8: conn moved to db.py (was imported here unused)
    client = TestClient(app)
    results = {}

    # ── Flow 1: register + login ──────────────────────────────────
    reg = client.post("/users/register", json={
        "email": BASELINE_EMAIL, "password": BASELINE_PASSWORD,
        "confirm_password": BASELINE_PASSWORD, "full_name": "Baseline User",
        "role": "escrow_officer", "state": "CA", "agree_terms": True,
    })
    login = client.post("/users/login", json={
        "email": BASELINE_EMAIL, "password": BASELINE_PASSWORD,
    })
    token = login.json().get("access_token", "")
    auth = {"Authorization": f"Bearer {token}"}
    results["1_login"] = {
        "register_status": reg.status_code,
        "login_status": login.status_code,
        "login_keys": sorted(login.json().keys()),
        "token_type": login.json().get("token_type"),
        "token_issued": bool(token),
    }

    # ── Flow 2: deed save (proxy payload shape) ───────────────────
    save = client.post("/deeds", headers=auth, json={
        "deed_type": "grant-deed",
        "property_address": "123 Baseline St, Los Angeles, CA 90001",
        "apn": "1111-222-333", "county": "Los Angeles",
        "legal_description": "LOT 1, BLOCK 2, BASELINE TRACT",
        "grantor_name": "BASE GRANTOR", "grantee_name": "BASE GRANTEE",
        "vesting": "a single person", "requested_by": "Baseline Escrow",
        "source": "deed-builder",
        "dtt": {"transfer_value": "500000", "is_exempt": False,
                "exemption_reason": "", "basis": "full_value",
                "area_type": "city", "city_name": "Los Angeles",
                "calculated_amount": "550.00"},
        "title_order_no": "TO-BASE-1", "escrow_no": "ESC-BASE-1",
        "return_to": "BASE GRANTEE",
        "provenance": {"apn": {"source": "sitex", "confirmed_at": "2026-07-23T00:00:00Z"}},
    })
    deed = save.json() if save.status_code == 200 else {}
    deed_id = deed.get("id")
    results["2_deed_save"] = {
        "status": save.status_code,
        "returned_keys": sorted(deed.keys()),
        "deed_type": deed.get("deed_type"),
        "grantor_name": deed.get("grantor_name"),
        "pdf_url_set": bool(deed.get("pdf_url")),
        "metadata_has": sorted((deed.get("metadata") or {}).keys()) if isinstance(deed.get("metadata"), dict) else "non-dict",
    }

    # ── Flow 3: GET /deeds/{id} ───────────────────────────────────
    detail = client.get(f"/deeds/{deed_id}", headers=auth)
    d = detail.json() if detail.status_code == 200 else {}
    results["3_deed_detail"] = {
        "status": detail.status_code,
        "keys": sorted(d.keys()),
        "property_address": d.get("property_address"),
    }

    # ── Flow 4: authenticated download (stored PDF) ───────────────
    dl = client.get(f"/deeds/{deed_id}/download", headers=auth)
    results["4_download"] = {
        "status": dl.status_code,
        "content_type": dl.headers.get("content-type"),
        "is_pdf": dl.content[:5] == b"%PDF-",
        "over_1kb": len(dl.content) > 1000,
    }

    # ── Flow 5: share-create ──────────────────────────────────────
    share = client.post("/shared-deeds", headers=auth, json={
        "deed_id": deed_id, "recipient_name": "Reviewer",
        "recipient_email": "reviewer@sixflow.test",
        "recipient_role": "title_officer", "message": "baseline",
    })
    sj = share.json() if share.status_code == 200 else {}
    results["5_share_create"] = {
        "status": share.status_code,
        "keys": sorted(sj.keys()),
        "success": sj.get("success"),
    }

    # ── Flow 6: Stripe webhook plan sync ──────────────────────────
    import psycopg2
    pg = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = pg.cursor()
    cur.execute("SELECT id FROM users WHERE email=%s", (BASELINE_EMAIL,))
    uid = cur.fetchone()[0]
    stripe_stub = MagicMock()
    stripe_stub.Webhook.construct_event.return_value = {
        "type": "checkout.session.completed",
        "data": {"object": {"client_reference_id": str(uid),
                            "metadata": {"plan": "professional", "user_id": str(uid)}}},
    }
    with patch("phase23_billing.router_webhook.init_stripe", return_value=stripe_stub):
        hook = client.post("/payments/webhook", content=b"{}",
                           headers={"stripe-signature": "t=1,v1=baseline"})
    cur.execute("SELECT plan FROM users WHERE id=%s", (uid,))
    plan_after = cur.fetchone()[0]
    pg.close()
    results["6_stripe_webhook"] = {
        "status": hook.status_code,
        "body": hook.json(),
        "plan_after": plan_after,
    }
    return results


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "verify"
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        sys.exit("DATABASE_URL required")
    ensure_schema(db_url)
    results = run_flows()

    if mode == "record":
        SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
        SNAPSHOT.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n")
        print(f"Recorded baseline -> {SNAPSHOT}")
        for k, v in results.items():
            print(f"  {k}: {v}")
        return

    expected = json.loads(SNAPSHOT.read_text())
    if results == expected:
        print("SIX-FLOW BASELINE: all flows match the recorded snapshot ✔")
        return
    print("SIX-FLOW BASELINE: MISMATCH")
    for key in sorted(set(expected) | set(results)):
        if expected.get(key) != results.get(key):
            print(f"--- {key}\n  expected: {json.dumps(expected.get(key), sort_keys=True)}\n  actual:   {json.dumps(results.get(key), sort_keys=True)}")
    sys.exit(1)


if __name__ == "__main__":
    main()
