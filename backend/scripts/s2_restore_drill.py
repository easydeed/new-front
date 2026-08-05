"""RED-S2 — the restore drill. Executed, not documented.

═══ WHY A DRILL AND NOT A RUNBOOK ═══

"We have backups" is a belief until someone restores one. The finding
this answers was not "there is no backup procedure" — it was that no
restore had ever been performed, so nobody could say whether the stored
instruments would come back or whether they would come back INTACT.

This script proves both, end to end, against real Postgres and a real
second copy:

  A. GENERATE   a deed with a real stored PDF, and record its sha256.
  B. BACK UP    with pg_dump — the actual tool, not a SELECT loop.
  C. DESTROY    restore into a SEPARATE database and confirm the
                artifact is present there.
  D. VERIFY     hash the recovered bytes against the sha256 recorded at
                generation. Bytes that do not hash are not a recovery.
  E. SECOND COPY  delete the row from the restored database entirely and
                recover the instrument from the object store alone,
                hash-verifying again. This is the scenario the ticket
                exists for: the database is gone.
  F. CASCADE    prove a deed row can no longer be deleted out from under
                its artifact.

Exit code 1 on any failure, so it can gate rather than inform.

Usage:
  DATABASE_URL=postgresql://... \
  ARTIFACT_STORE=filesystem ARTIFACT_FS_ROOT=/tmp/artifacts \
  python scripts/s2_restore_drill.py

═══ ON WHAT THIS DRILL CANNOT PROVE ═══

It runs against the configured backend. With ARTIFACT_STORE=filesystem it
proves the mechanism and the recovery completely. It does NOT prove that
a particular S3 bucket is reachable, because bucket credentials are
owner-supplied by standing rule and never live here.

That limit is stated rather than glossed: what is verified is that the
second copy is written, is found, and hash-matches. Pointing the same
code at S3 is a configuration change, and the first production run of
this drill against the real bucket is an owner-side step.
"""
import hashlib
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg2  # noqa: E402
from psycopg2.extras import RealDictCursor  # noqa: E402

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("DATABASE_URL is required")
    sys.exit(1)

RESTORE_DB = os.getenv("S2_RESTORE_DB", "deedpro_restore_drill")
failures = []


def check(label, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)


def admin_conn():
    import re
    root = re.sub(r"/[^/?]+(\?|$)", r"/postgres\1", DB_URL)
    c = psycopg2.connect(root, connect_timeout=10)
    c.autocommit = True
    return c


def restore_url():
    import re
    return re.sub(r"/[^/?]+(\?|$)", f"/{RESTORE_DB}\\1", DB_URL)


def main():
    print("RED-S2 restore drill\n")

    from services.artifact_store import artifact_key, get_store, reset_store
    reset_store()
    store = get_store()
    print(f"  artifact store: {store.describe()}\n")
    if store.name == "none":
        print("  REFUSING TO RUN: ARTIFACT_STORE=none means there is no second")
        print("  copy to restore from. A drill against nothing proves nothing.")
        sys.exit(1)

    # ── A. generate ───────────────────────────────────────────────────
    print("[A] generate a deed with a stored PDF")
    tag = uuid.uuid4().hex[:10]
    email = f"drill-{tag}@test.local"
    pdf_bytes = b"%PDF-1.4\n% restore drill artifact " + tag.encode() + b"\n%%EOF\n"
    digest = hashlib.sha256(pdf_bytes).hexdigest()

    src = psycopg2.connect(DB_URL, cursor_factory=RealDictCursor, connect_timeout=10)
    try:
        with src.cursor() as cur:
            cur.execute("INSERT INTO users (email, password_hash) VALUES (%s,%s) RETURNING id",
                        (email, "x"))
            uid = cur.fetchone()["id"]
            cur.execute("""INSERT INTO deeds (user_id, deed_type, status, property_address)
                           VALUES (%s,'grant-deed','completed',%s) RETURNING id""",
                        (uid, f"{tag} Drill St"))
            deed_id = cur.fetchone()["id"]
            cur.execute("""INSERT INTO deed_pdfs (deed_id, pdf_data, sha256)
                           VALUES (%s,%s,%s)""",
                        (deed_id, psycopg2.Binary(pdf_bytes), digest))
            src.commit()
        store.put(artifact_key(deed_id, digest), pdf_bytes)
        print(f"      deed {deed_id}, sha256 {digest[:16]}…")
        check("the second copy exists in the object store",
              store.exists(artifact_key(deed_id, digest)))

        # ── B. back up ────────────────────────────────────────────────
        print("\n[B] pg_dump")
        dump_path = Path(tempfile.gettempdir()) / f"s2_drill_{tag}.dump"
        r = subprocess.run(["pg_dump", "--format=custom", "--file", str(dump_path), DB_URL],
                           capture_output=True, text=True)
        check("pg_dump succeeded", r.returncode == 0, r.stderr.strip()[:200])
        size = dump_path.stat().st_size if dump_path.exists() else 0
        check("the dump is non-empty", size > 0, f"{size} bytes")
        if r.returncode != 0:
            return

        # ── C. restore into a separate database ───────────────────────
        print("\n[C] restore into a SEPARATE database")
        a = admin_conn()
        try:
            with a.cursor() as cur:
                cur.execute(f'DROP DATABASE IF EXISTS "{RESTORE_DB}"')
                cur.execute(f'CREATE DATABASE "{RESTORE_DB}"')
        finally:
            a.close()
        r = subprocess.run(["pg_restore", "--no-owner", "--dbname", restore_url(),
                            str(dump_path)], capture_output=True, text=True)
        # pg_restore warns about roles/extensions on a clean target; the
        # verification below is what decides, not its exit code.
        print(f"      pg_restore exit {r.returncode}")

        rest = psycopg2.connect(restore_url(), cursor_factory=RealDictCursor,
                                connect_timeout=10)
        try:
            with rest.cursor() as cur:
                cur.execute("SELECT pdf_data, sha256 FROM deed_pdfs WHERE deed_id = %s",
                            (deed_id,))
                row = cur.fetchone()
            check("the artifact is present in the restored database", row is not None)
            if not row:
                return

            # ── D. verify ─────────────────────────────────────────────
            print("\n[D] hash-verify the recovered bytes")
            recovered = bytes(row["pdf_data"])
            actual = hashlib.sha256(recovered).hexdigest()
            check("recovered bytes hash to the sha256 recorded at generation",
                  actual == digest, f"{actual[:16]}… vs {digest[:16]}…")
            check("recovered bytes are byte-identical to the original",
                  recovered == pdf_bytes)
            check("the recorded sha256 itself survived the restore",
                  row["sha256"] == digest)

            # ── E. the database is gone ───────────────────────────────
            print("\n[E] recover from the SECOND COPY alone (database row destroyed)")
            with rest.cursor() as cur:
                cur.execute("DELETE FROM deed_pdfs WHERE deed_id = %s", (deed_id,))
                rest.commit()
                cur.execute("SELECT 1 FROM deed_pdfs WHERE deed_id = %s", (deed_id,))
                check("the artifact row is really gone from the database",
                      cur.fetchone() is None)

            from_store = store.get(artifact_key(deed_id, digest))
            check("the instrument is recoverable from the object store",
                  from_store is not None)
            if from_store is not None:
                check("object-store bytes hash to the recorded sha256",
                      hashlib.sha256(from_store).hexdigest() == digest)
                check("object-store bytes are byte-identical to the original",
                      from_store == pdf_bytes)

            # ── F. the cascade is gone ────────────────────────────────
            print("\n[F] a deed row can no longer be deleted out from under its artifact")
            with rest.cursor() as cur:
                cur.execute("""INSERT INTO deeds (user_id, deed_type, status)
                               VALUES ((SELECT id FROM users WHERE email=%s),
                                       'grant-deed','completed') RETURNING id""",
                            (email,))
                keep_id = cur.fetchone()["id"]
                cur.execute("""INSERT INTO deed_pdfs (deed_id, pdf_data, sha256)
                               VALUES (%s,%s,%s)""",
                            (keep_id, psycopg2.Binary(b"x"), "0" * 64))
                rest.commit()
            refused = False
            try:
                with rest.cursor() as cur:
                    cur.execute("DELETE FROM deeds WHERE id = %s", (keep_id,))
                    rest.commit()
            except psycopg2.errors.ForeignKeyViolation:
                rest.rollback()
                refused = True
            check("deleting a deed with a stored artifact is REFUSED", refused)
        finally:
            rest.close()
    finally:
        # cleanup: source rows, dump, restore database
        try:
            with src.cursor() as cur:
                cur.execute("DELETE FROM deed_pdfs WHERE deed_id IN "
                            "(SELECT id FROM deeds WHERE user_id = "
                            "(SELECT id FROM users WHERE email=%s))", (email,))
                cur.execute("DELETE FROM deeds WHERE user_id = "
                            "(SELECT id FROM users WHERE email=%s)", (email,))
                cur.execute("DELETE FROM users WHERE email = %s", (email,))
                src.commit()
        except Exception as e:
            print(f"      (cleanup note: {e})")
        src.close()
        a = admin_conn()
        try:
            with a.cursor() as cur:
                cur.execute(f'DROP DATABASE IF EXISTS "{RESTORE_DB}"')
        except Exception:
            pass
        finally:
            a.close()


if __name__ == "__main__":
    main()
    print()
    if failures:
        print(f"DRILL FAILED: {failures}")
        sys.exit(1)
    print("DRILL PASSED — a generated instrument survived backup, restore and "
          "database loss, hash-verified at every step.")
