"""Owner-held aggregate inventory. Read-only; no grants, keys or contact output."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def main():
    import argparse
    import json
    import os
    import psycopg2
    from db_rows import ROW_FACTORY
    from services.db_identity import assert_tables
    from services.api_permission_transition import inventory
    argparse.ArgumentParser(description='Read-only aggregate review; production invocation is owner-held').parse_args()
    # Do not import database: its import starts schema convergence, which
    # would turn a purported read-only review into a DDL-writing process.
    conn = psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=ROW_FACTORY,
                            connect_timeout=10)
    try:
        conn.set_session(readonly=True)
        assert_tables(conn, "api_keys", "api_deeds", expect_database=os.getenv("EXPECTED_DATABASE", ""))
        print(json.dumps(inventory(conn), sort_keys=True))
    finally:
        conn.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'Permission inventory failed ({type(exc).__name__}); no cutover authorized', file=sys.stderr)
        raise SystemExit(1)
