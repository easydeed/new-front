"""RED-S4 — recording as the officer's statement, and the rate's version.

Two RED0 findings, one ticket.

R2-7/R3-8 — `deeds` had NO recording fields. `status` ran draft ->
completed -> deleted, where "completed" means only THAT A PDF WAS
RENDERED. So the most important fact in the life of any deed — that it
recorded, when, and under what instrument number — had no home, and
`supersession.walk_chain` returned a lineage that looked authoritative
while answering the drafting history rather than the county's record.

R3-3 — the officer's confirmation records that she accepted A NUMBER;
nothing recorded which rate table produced it. A deed generated under
last March's schedule is indistinguishable from one generated today, so
the audit trail cannot answer the only question a dispute asks: was this
the right rate ON THAT DATE.

The posture on recording is the load-bearing part and it is the notary
handoff's: **the system never auto-asserts.** We have no e-recording
integration, and deriving "recorded" from anything we can observe would
be the fabricated-success disease in the place it would do most damage.
"""
import os
import sys
import uuid
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from tests.source_text import code_only  # noqa: E402

LIVE_DB = os.getenv("DATABASE_URL")


# ── The rate registry's version travels with the deed ─────────────────


def test_the_registry_declares_a_version():
    from services.jurisdictions import REGISTRY_VERSION
    assert REGISTRY_VERSION and isinstance(REGISTRY_VERSION, str)


def test_the_fingerprint_is_stable_across_calls():
    from services.jurisdictions import registry_fingerprint
    assert registry_fingerprint() == registry_fingerprint()


def test_the_fingerprint_moves_when_a_RATE_moves():
    """The machine's check on the human promise. If someone edits a rate
    and forgets to bump the version, the two disagree — and a
    disagreement is the signal."""
    import services.jurisdictions as j
    before = j.registry_fingerprint()
    original = j.PLACES
    try:
        p = original[0]
        j.PLACES = [p._replace(dtt_rate_per_1000=(p.dtt_rate_per_1000 or 0) + 1.0)] + list(original[1:])
        assert j.registry_fingerprint() != before
    finally:
        j.PLACES = original
    assert j.registry_fingerprint() == before


def test_the_fingerprint_moves_when_a_PLACE_is_added_or_removed():
    import services.jurisdictions as j
    before = j.registry_fingerprint()
    original = j.PLACES
    try:
        j.PLACES = list(original[:-1])
        assert j.registry_fingerprint() != before
    finally:
        j.PLACES = original


def test_generation_stamps_the_version_onto_the_deed():
    src = code_only(BACKEND / "services" / "deed_pdf.py")
    fn = src[src.index("def store_deed_pdf"):src.index("def _mirror_to_artifact_store")]
    assert "rate_registry_version" in fn
    assert "rate_registry_fingerprint" in fn


def test_a_missing_stamp_never_blocks_a_deed_but_is_never_faked():
    src = code_only(BACKEND / "services" / "deed_pdf.py")
    fn = src[src.index("def store_deed_pdf"):src.index("def _mirror_to_artifact_store")]
    assert "except Exception" in fn
    assert "rate_registry_error" in fn


# ── Recording is HER statement ────────────────────────────────────────


def test_the_endpoint_never_infers_recording():
    """No e-recording integration exists. A system that derived
    "recorded" from anything it can see would be asserting something
    nobody checked."""
    src = code_only(BACKEND / "routers" / "deeds_crud.py")
    fn = src[src.index("def assert_recording"):]
    # Her identity is attached to the claim.
    assert "recording_asserted_by" in fn
    assert "recording_asserted_at" in fn


def test_the_response_says_we_did_not_verify_it():
    src = (BACKEND / "routers" / "deeds_crud.py").read_text(encoding="utf-8")
    fn = src[src.index("def assert_recording"):]
    assert "does not verify" in fn


def test_only_a_generated_document_can_be_marked_recorded():
    src = code_only(BACKEND / "routers" / "deeds_crud.py")
    fn = src[src.index("def assert_recording"):]
    assert 'status_ != "completed"' in fn


def test_an_existing_assertion_is_not_silently_overwritten():
    """§9's posture applied to the statement rather than the bytes:
    changing it is a correction, and corrections are supersession's
    business."""
    src = code_only(BACKEND / "routers" / "deeds_crud.py")
    fn = src[src.index("def assert_recording"):]
    assert "status_code=409" in fn
    assert "supersedes" in fn


# ── Lineage can finally answer the question ───────────────────────────


def test_is_recorded_reads_the_officers_statement():
    from services.supersession import is_recorded
    assert is_recorded({"recorded_at": "2026-08-04"}) is True
    assert is_recorded({"recorded_at": None}) is False
    assert is_recorded({}) is False


def test_recorded_in_chain_finds_the_recorded_versions():
    from services.supersession import recorded_in_chain
    rows = {
        1: {"id": 1, "superseded_by": 2, "recorded_at": "2026-01-01"},
        2: {"id": 2, "superseded_by": None, "recorded_at": None},
    }
    assert recorded_in_chain(rows, 1) == [1]


def test_two_recorded_versions_are_reported_not_suppressed():
    """A correcting deed is a NEW instrument requiring its own execution,
    so both it and the original can genuinely have recorded. Hiding one
    would recreate, in the read path, the un-recording the data model
    refuses."""
    from services.supersession import recorded_in_chain
    rows = {
        1: {"id": 1, "superseded_by": 2, "recorded_at": "2026-01-01"},
        2: {"id": 2, "superseded_by": None, "recorded_at": "2026-02-02"},
    }
    assert recorded_in_chain(rows, 1) == [1, 2]


@pytest.mark.skipif(not LIVE_DB, reason="live test DB required")
def test_the_columns_exist_in_the_one_schema_authority():
    import psycopg2
    from database import create_tables
    create_tables()
    c = psycopg2.connect(LIVE_DB, connect_timeout=10)
    try:
        with c.cursor() as cur:
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'deeds' AND column_name IN
                  ('recorded_at','instrument_number',
                   'recording_asserted_by','recording_asserted_at')
            """)
            found = {r[0] for r in cur.fetchall()}
        assert found == {"recorded_at", "instrument_number",
                         "recording_asserted_by", "recording_asserted_at"}, found
    finally:
        c.close()


# ── The harnesses run in CI now ───────────────────────────────────────


def test_every_proof_harness_is_wired_into_ci():
    """S1, S2 and S3 each shipped with a runnable proof that ran only
    when the author remembered. S1's proof caught a bug IN S1 — and only
    because one run's burst happened to be wider than the last. Every
    future catch of that kind was a function of luck until this job
    existed."""
    wf = (BACKEND.parent / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8")
    for script in ["s1_concurrency_proof.py", "s2_restore_drill.py",
                   "s3_thursday_walkthrough.py"]:
        assert script in wf, script
    assert "six_flow_baseline.py verify" in wf
    assert "api_baseline.py verify" in wf


def test_the_ci_job_has_a_database():
    """Dozens of tests carry skipif(not DATABASE_URL) and had therefore
    never run in CI either — the no-Postgres job was reporting green over
    tests it silently skipped."""
    wf = (BACKEND.parent / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8")
    assert "postgres:16" in wf
    assert "DATABASE_URL" in wf


def test_the_harness_job_is_blocking():
    """continue-on-error would make it a decoration."""
    import yaml
    wf = yaml.safe_load(
        (BACKEND.parent / ".github" / "workflows" / "test.yml").read_text(encoding="utf-8"))
    job = wf["jobs"]["proof-harnesses"]
    assert job.get("continue-on-error") is not True
    for step in job["steps"]:
        assert step.get("continue-on-error") is not True, step.get("name")
