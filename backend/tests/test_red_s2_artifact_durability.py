"""RED-S2 — the stored instrument exists in more than one place.

Before this, every generated deed lived in exactly one column of one
Postgres, and the sha256 that made it verifiable lived in the same row.
One lost database lost the documents AND the ability to prove what they
had been.

These pins guard the three parts of the answer, and the direction each
would fail in:

  1. There is a SECOND COPY, it is written on generation, and a failure
     to write it is recorded rather than swallowed. The dangerous
     direction here is silence: a store that no-ops and reports success
     rebuilds the finding while the tests stay green.
  2. The schema no longer CASCADEs a deed delete into its artifact. §9
     guarded overwrite; the schema handed DELETE a cascade, so the
     doctrine covered one verb.
  3. A recovery hash-verifies. Bytes that do not hash are not a recovery,
     and returning them would be worse than returning nothing because
     the caller could not tell.
"""
import hashlib
import os
import sys
import uuid
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from db_rows import ROW_FACTORY  # noqa: E402

from services import artifact_store as store_mod  # noqa: E402
from tests.source_text import code_only  # noqa: E402

LIVE_DB = os.getenv("DATABASE_URL")


@pytest.fixture(autouse=True)
def _clean_store(monkeypatch, tmp_path):
    store_mod.reset_store()
    monkeypatch.setenv("ARTIFACT_STORE", "filesystem")
    monkeypatch.setenv("ARTIFACT_FS_ROOT", str(tmp_path / "artifacts"))
    yield
    store_mod.reset_store()


# ── 1. The second copy ────────────────────────────────────────────────


def test_round_trip_through_the_filesystem_store():
    s = store_mod.get_store()
    key = store_mod.artifact_key(42, "a" * 64)
    s.put(key, b"%PDF-1.4 bytes")
    assert s.exists(key)
    assert s.get(key) == b"%PDF-1.4 bytes"


def test_a_missing_artifact_reads_as_none_not_an_error():
    assert store_mod.get_store().get("deeds/1/nope.pdf") is None


def test_the_key_is_content_addressed_so_a_rerender_cannot_overwrite():
    """§9 in the object store: different bytes land BESIDE the original,
    never on top of it. Enforced by the key, not by a check somebody has
    to remember to write."""
    a = store_mod.artifact_key(7, "a" * 64)
    b = store_mod.artifact_key(7, "b" * 64)
    assert a != b
    s = store_mod.get_store()
    s.put(a, b"first")
    s.put(b, b"second")
    assert s.get(a) == b"first"


def test_a_partial_write_is_never_visible():
    """Write-then-rename: a reader sees the whole artifact or nothing.
    A truncated file that still parses as a PDF is the worst outcome."""
    src = code_only(BACKEND / "services" / "artifact_store.py")
    assert "os.replace" in src
    assert ".partial" in src


def test_the_null_store_is_loud_about_storing_nothing():
    """`none` is legitimate locally and indefensible in production, so it
    must never be quiet. A silent no-op backend is invariant #4's disease
    wearing a storage adapter."""
    src = code_only(BACKEND / "services" / "artifact_store.py")
    null = src[src.index("class NullStore"):src.index("_store: Optional")]
    assert "logger.warning" in null
    assert "NO SECOND COPY" in null


def test_there_is_no_silent_fallback_from_s3_to_none():
    """If the production backend is configured and broken, the honest
    outcome is a recorded failure — not a quiet downgrade to storing
    nothing, which would look identical to success."""
    src = code_only(BACKEND / "services" / "artifact_store.py")
    s3_block = src[src.index("if kind == \"s3\""):src.index("elif kind == \"filesystem\"")]
    assert "NullStore" not in s3_block


def test_an_unknown_backend_name_is_refused():
    store_mod.reset_store()
    os.environ["ARTIFACT_STORE"] = "dropbox"
    try:
        with pytest.raises(store_mod.ArtifactStoreError):
            store_mod.get_store()
    finally:
        os.environ["ARTIFACT_STORE"] = "filesystem"
        store_mod.reset_store()


def test_generation_mirrors_to_the_store_and_records_failures():
    src = code_only(BACKEND / "services" / "deed_pdf.py")
    assert "_mirror_to_artifact_store" in src
    # The failure is recorded on the row, not swallowed — the email
    # path's precedent.
    assert "artifact_error" in src
    # ...and it never blocks the officer: the mirror runs after commit.
    body = src[src.index("def _mirror_to_artifact_store"):src.index("def read_stored_pdf")]
    assert "except Exception" in body


# ── 2. The cascade is gone ────────────────────────────────────────────


def test_neither_schema_authority_still_says_cascade_for_deed_pdfs():
    """Two files create this table. Both must agree, or a fresh database
    and an existing one diverge — which is the H1 incident's shape."""
    for rel in [("database.py",), ("services", "deed_pdf.py")]:
        src = code_only(BACKEND.joinpath(*rel))
        block_start = src.find("CREATE TABLE IF NOT EXISTS deed_pdfs")
        assert block_start != -1, rel
        block = src[block_start:block_start + 400]
        assert "ON DELETE RESTRICT" in block, rel
        assert "ON DELETE CASCADE" not in block, rel


def test_the_migration_converges_an_existing_cascade():
    """CREATE TABLE IF NOT EXISTS does not alter an existing table, so a
    production database created with CASCADE would have kept it."""
    src = code_only(BACKEND / "database.py")
    assert "confdeltype = 'c'" in src
    assert "deed_pdfs_deed_id_fkey" in src


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_the_live_constraint_is_restrict():
    """The executable version: what the database actually says, not what
    the source says it should."""
    import psycopg2
    from database import create_tables
    create_tables()
    c = psycopg2.connect(LIVE_DB, cursor_factory=ROW_FACTORY, connect_timeout=10)
    try:
        with c.cursor() as cur:
            cur.execute("""
                SELECT c.confdeltype FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                WHERE t.relname = 'deed_pdfs' AND c.contype = 'f'
            """)
            rows = cur.fetchall()
        assert rows, "no foreign key found on deed_pdfs"
        for _r in rows:
            deltype = _r["confdeltype"]
            assert deltype == "r", f"expected RESTRICT, got confdeltype={deltype!r}"
    finally:
        c.close()


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_deleting_a_deed_with_an_artifact_is_refused():
    import psycopg2
    from database import create_tables
    create_tables()
    tag = uuid.uuid4().hex[:10]
    c = psycopg2.connect(LIVE_DB, cursor_factory=ROW_FACTORY, connect_timeout=10)
    try:
        with c.cursor() as cur:
            cur.execute("INSERT INTO users (email, password_hash) VALUES (%s,%s) RETURNING id",
                        (f"s2-{tag}@test.local", "x"))
            uid = cur.fetchone()[0]
            cur.execute("""INSERT INTO deeds (user_id, deed_type, status)
                           VALUES (%s,'grant-deed','completed') RETURNING id""", (uid,))
            did = cur.fetchone()[0]
            cur.execute("INSERT INTO deed_pdfs (deed_id, pdf_data, sha256) VALUES (%s,%s,%s)",
                        (did, psycopg2.Binary(b"%PDF"), "0" * 64))
            c.commit()

        with pytest.raises(psycopg2.errors.ForeignKeyViolation):
            with c.cursor() as cur:
                cur.execute("DELETE FROM deeds WHERE id = %s", (did,))
        c.rollback()

        with c.cursor() as cur:
            cur.execute("DELETE FROM deed_pdfs WHERE deed_id = %s", (did,))
            cur.execute("DELETE FROM deeds WHERE id = %s", (did,))
            cur.execute("DELETE FROM users WHERE id = %s", (uid,))
            c.commit()
    finally:
        c.close()


# ── 3. Recovery hash-verifies ─────────────────────────────────────────


def test_verify_rejects_altered_bytes():
    data = b"%PDF-1.4 real"
    digest = hashlib.sha256(data).hexdigest()
    assert store_mod.verify(data, digest)
    assert not store_mod.verify(data + b" tampered", digest)


def test_the_reader_hash_checks_both_paths():
    """A second copy that returns the WRONG bytes is worse than one that
    returns nothing, because the caller cannot tell."""
    src = code_only(BACKEND / "services" / "deed_pdf.py")
    fn = src[src.index("def read_stored_pdf"):]
    assert fn.count("verify(") >= 2


def test_the_drill_refuses_to_run_against_no_store():
    """A drill that passes against ARTIFACT_STORE=none proves nothing and
    would be the most dangerous green tick in the repository."""
    src = code_only(BACKEND / "scripts" / "s2_restore_drill.py")
    assert "REFUSING TO RUN" in src or 'name == "none"' in src
    assert "sys.exit(1)" in src


def test_the_drill_checks_the_whole_chain():
    """Each stage named, so a future edit that quietly drops one is
    visible in the diff."""
    src = code_only(BACKEND / "scripts" / "s2_restore_drill.py")
    for stage in ["pg_dump", "pg_restore", "hash", "DELETE FROM deed_pdfs",
                  "ForeignKeyViolation"]:
        assert stage in src, stage
