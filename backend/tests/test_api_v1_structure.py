"""A1 — structural pins for the partner API lane (CI-safe, no database).

The integration harness (test_api_v1_integration.py) proves the lifecycle
works; it needs a live Postgres, so CI cannot run it. These pins hold the
invariants that a future edit could silently break, and they run
everywhere.
"""
import inspect
import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def _router_src():
    return (BACKEND / "routers/api_v1/router.py").read_text(encoding="utf-8")


# ── The two defects that shipped and never ran ───────────────────────

def test_auth_reads_dict_rows_not_tuples():
    """database.get_db_connection returns RealDictCursor connections. The
    original code tuple-unpacked the api_keys row, so key_hash became the
    literal string 'key_hash' and EVERY valid key 401'd."""
    src = _router_src()
    assert "row['key_hash']" in src
    assert "api_key_id, key_hash, name, org_id" not in src, "tuple-unpack regression"
    assert "{r['window_type']: r['request_count']" in src


def test_full_address_is_assigned_before_use():
    """POST /api/v1/deeds referenced full_address three times and never
    assigned it — a NameError on every call the endpoint ever received."""
    src = _router_src()
    assert re.search(r"^\s+full_address = ", src, re.M), "full_address never assigned"


# ── Metering must never eat a deed ───────────────────────────────────

def test_usage_log_is_savepoint_wrapped():
    """A failing INSERT inside the transaction leaves it ABORTED, and the
    following commit() then discards the deed silently while returning
    200 with a deed_id that does not exist. Observed in the harness; the
    savepoint is the fix and must stay."""
    from routers.api_v1.router import _log_usage
    src = inspect.getsource(_log_usage)
    assert "SAVEPOINT usage_log" in src
    assert "ROLLBACK TO SAVEPOINT usage_log" in src


def test_client_ip_is_validated_before_inet_insert():
    from routers.api_v1.router import _client_ip
    assert _client_ip(None) is None
    src = inspect.getsource(_client_ip)
    assert "ip_address(host)" in src, "unvalidated host would abort the transaction"


# ── Idempotency ──────────────────────────────────────────────────────

def test_create_accepts_and_replays_idempotency_key():
    src = _router_src()
    assert 'alias="Idempotency-Key"' in src
    assert "WHERE api_key_id = %s AND idempotency_key = %s" in src
    schema = (BACKEND / "database.py").read_text(encoding="utf-8")
    assert "uq_api_deeds_idempotency" in schema, "replay needs the unique index"


# ── One schema authority (H1) ────────────────────────────────────────

def test_api_tables_live_in_the_schema_authority():
    """The mounted /api/v1 depended on tables that existed only in
    hand-run migration files. H1: create_tables is the one authority."""
    schema = (BACKEND / "database.py").read_text(encoding="utf-8")
    for table in ["api_keys", "api_deeds", "api_usage_log", "api_rate_limits",
                  "document_authenticity", "notifications", "user_notifications"]:
        assert f"CREATE TABLE IF NOT EXISTS {table}" in schema, table


def test_lock_taking_ddl_is_guarded():
    """Schema convergence runs in a daemon thread while the app serves
    traffic. Unguarded ALTERs on FK-referenced tables take ACCESS
    EXCLUSIVE and deadlock against in-flight requests."""
    schema = (BACKEND / "database.py").read_text(encoding="utf-8")
    assert "ALTER TABLE api_keys ALTER COLUMN company DROP NOT NULL;" in schema
    assert "is_nullable = 'NO'" in schema, "the DROP NOT NULL must stay guarded"


# ── Gens 1 and 2 stay dead ───────────────────────────────────────────

def test_superseded_api_generations_are_deleted():
    """Three generations existed; only this one is real. Resurrecting a
    second app means a second auth model against the same api_keys
    table — the SHA-256/bcrypt collision that made keys mutually
    unreadable."""
    for gone in ["external_api.py", "external_api", "start_external_api.py",
                 "external_requirements.txt", "requirements_full.txt"]:
        assert not (BACKEND / gone).exists(), f"{gone} came back"


def test_only_bcrypt_key_hashing_remains():
    """Flag ruling: the api_keys format collision resolves in favor of
    Gen 3's bcrypt design. No sha256 key hashing anywhere."""
    for path in BACKEND.rglob("*.py"):
        if "tests" in path.parts:
            continue
        src = path.read_text(encoding="utf-8", errors="ignore")
        if "key_hash" in src:
            assert "sha256(" not in src.replace("generate_content_hash", ""), \
                f"{path.relative_to(BACKEND)} hashes API keys with sha256"


# ── Deployment topology ──────────────────────────────────────────────

def test_no_second_api_service_declared():
    """Flag-1 ruling: the second Render service dies. A separate box that
    proxies to the main app through an auth concept the main app has
    never heard of is a deploy surface and a 401 factory."""
    import yaml
    blueprint = yaml.safe_load((BACKEND.parent / "render.yaml").read_text(encoding="utf-8"))
    names = [s["name"] for s in blueprint["services"]]
    assert names == ["deedpro-main-api"], names


# ── Doctrine boundary (Flag 4) ───────────────────────────────────────

def test_api_exposes_deed_family_only():
    """v1 = deed family only. Affidavits and declarations carry
    execution-act machinery whose premise is a human hand at the moment
    of execution; exposing them machine-to-machine requires a per-family
    doctrine pass that has not happened."""
    from schemas.api_v1.deeds import DeedType
    exposed = {t.value for t in DeedType}
    assert all("deed" in v or v in {"interspousal_transfer"} for v in exposed), exposed
    for held in ["affidavit", "declaration", "homestead", "poa", "trust",
                 "certification", "revocation", "substitution"]:
        assert not any(held in v for v in exposed), f"{held} exposed without a doctrine pass"


def test_doctrine_boundary_is_recorded():
    doc = (BACKEND.parent / "docs/DOCTRINE_CONFORMANCE.md").read_text(encoding="utf-8")
    assert "execution-act" in doc.lower()
    assert "deed family" in doc.lower()
