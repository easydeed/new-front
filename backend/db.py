"""Single DB module (T8 split).

Owns the module-level psycopg2 connection and the auto-reconnect helper.

CRITICAL BINDING RULE: ``conn`` is a global that get_db_connection() rebinds
on reconnect. Consumers must ``import db`` and reference ``db.conn`` —
never ``from db import conn`` (that snapshot goes stale after a reconnect).
"""
import os

import psycopg2
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

# Database connection with auto-reconnect support
DB_URL = os.getenv("DATABASE_URL") or os.getenv("DB_URL")
if DB_URL:
    conn = psycopg2.connect(DB_URL, connect_timeout=10)
else:
    conn = None
    print("Warning: No database connection URL found")

# T2: make sure the stored-PDF table exists (idempotent; no Alembic in this repo)
if conn:
    try:
        from services.deed_pdf import ensure_deed_pdfs_table
        ensure_deed_pdfs_table(conn)
    except Exception as _pdf_table_error:
        print(f"Warning: could not ensure deed_pdfs table: {_pdf_table_error}")

def get_db_connection():
    """Get database connection — healing a POISONED one, reconnecting a
    dead one.

    Production outage 2026-08-01: one failed query on this shared
    connection, never rolled back, left the transaction aborted — and
    Postgres then refuses EVERY later query on it ("current transaction
    is aborted, commands ignored until end of transaction block"), which
    surfaced as login 500s. The old liveness probe made it worse: it
    caught only Operational/Interface errors, so the aborted-transaction
    error (a different psycopg2 class) escaped to callers instead of
    triggering recovery, and it never tried rollback() — the one call
    that instantly cures that state.

    Recovery ladder, in order:
      1. closed/None      → reconnect
      2. probe SELECT 1   → healthy, return
      3. probe failed     → rollback() and re-probe (heals the poisoned
                            case without dropping the connection)
      4. still failing    → reconnect
      5. reconnect failed → 500
    """
    global conn
    if not DB_URL:
        raise HTTPException(status_code=500, detail="Database connection not available")

    def _reconnect(reason):
        global conn
        print(f"⚠️ Database connection lost ({reason}), reconnecting...")
        try:
            conn = psycopg2.connect(DB_URL, connect_timeout=10)
            print("✅ Database reconnected successfully")
        except Exception as reconnect_error:
            print(f"❌ Failed to reconnect to database: {reconnect_error}")
            raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        if conn is None or conn.closed:
            print("⚠️ Database connection closed, reconnecting...")
            conn = psycopg2.connect(DB_URL, connect_timeout=10)
            print("✅ Database reconnected successfully")
        else:
            # Liveness probe. ANY psycopg2 error here means the shared
            # connection is unusable for callers — recover, never raise.
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
    except (psycopg2.Error, AttributeError) as e:
        try:
            conn.rollback()
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            print(f"♻️ Healed poisoned connection via rollback ({e})")
        except Exception:
            _reconnect(e)

    return conn
