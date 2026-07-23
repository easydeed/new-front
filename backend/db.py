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
    conn = psycopg2.connect(DB_URL)
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
    """Get database connection, reconnecting if necessary"""
    global conn
    if not DB_URL:
        raise HTTPException(status_code=500, detail="Database connection not available")

    try:
        # Test if connection is alive
        if conn is None or conn.closed:
            print("⚠️ Database connection closed, reconnecting...")
            conn = psycopg2.connect(DB_URL)
            print("✅ Database reconnected successfully")
        else:
            # Test with a simple query
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
    except (psycopg2.OperationalError, psycopg2.InterfaceError, AttributeError) as e:
        print(f"⚠️ Database connection lost ({e}), reconnecting...")
        try:
            conn = psycopg2.connect(DB_URL)
            print("✅ Database reconnected successfully")
        except Exception as reconnect_error:
            print(f"❌ Failed to reconnect to database: {reconnect_error}")
            raise HTTPException(status_code=500, detail="Database connection failed")

    return conn
