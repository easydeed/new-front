"""FORMS parties migration (owner-ledgered), pinned.

Both ledger triggers fired at wave-1 form #5: the catalog exceeded 10
types AND the first single-party instruments arrived (homestead
declarant, certifying trustee, revoking TOD grantor) whose parties cannot
map onto grantor_name/grantee_name.

The contract pinned here:
- ADDITIVE nullable `deeds.parties` JSONB via create_tables (one schema
  authority — H1 rule). Legacy columns untouched, no backfill, and still
  AUTHORITATIVE for two-party instruments.
- Per-family validation: two-party families (deed, affidavit) keep the
  strict grantor/grantee/legal requirement, same 400s as before; a
  single-party (declaration-family) instrument requires legal +
  at least one NAMED party in `parties`.
- parties flows: payload → deeds row → list projection → detail (resume)
  → template context.
"""
import inspect
from contextlib import contextmanager
from datetime import datetime
from unittest.mock import patch

from fastapi.testclient import TestClient

import database
from auth import get_current_user_id
from main import app
from services.deed_pdf import build_context_from_row
from services.form_families import FAMILY_BY_DEED_TYPE, family_of, is_single_party


@contextmanager
def authed_client(user_id=1):
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)


FAKE_ROW = {
    "id": 91,
    "status": "draft",
    "deed_type": "test-declaration",
    "created_at": datetime(2026, 7, 30, 5, 0, 0),
    "updated_at": datetime(2026, 7, 30, 5, 0, 0),
}

GENERATE_BASE = {
    "property_address": "1358 5TH ST, Santa Monica, CA 90401",
    "legal_description": "LOT 7, BLOCK B, TRACT 12345",
    "county": "Los Angeles",
    "apn": "4290-012-034",
}


def test_schema_authority_carries_the_parties_column():
    """H1 rule: ONE schema authority. The column ships via create_tables,
    additive and nullable — no separate migration script to forget."""
    src = inspect.getsource(database.create_tables)
    assert "ALTER TABLE deeds ADD COLUMN IF NOT EXISTS parties JSONB" in src


def test_family_map_defaults_to_the_strictest_path():
    assert family_of("grant-deed") == "deed"
    assert family_of("affidavit-death-jt") == "affidavit"
    assert family_of("never-heard-of-it") == "deed"   # unknown → strict
    assert family_of(None) == "deed"
    assert not is_single_party("grant-deed")
    assert not is_single_party("affidavit-death-trustee")


def test_single_party_type_generates_without_grantor_grantee(monkeypatch):
    monkeypatch.setitem(FAMILY_BY_DEED_TYPE, "test-declaration", "declaration")
    payload = {
        **GENERATE_BASE,
        "deed_type": "test-declaration",
        "parties": {"declarant": "ROBERT OWNER"},
    }
    with authed_client() as client, \
            patch("routers.deeds_crud.create_deed", return_value=dict(FAKE_ROW)) as create:
        resp = client.post("/deeds", json=payload)

    assert resp.status_code == 200, resp.text
    deed_data = create.call_args[0][1]
    assert deed_data["parties"] == {"declarant": "ROBERT OWNER"}


def test_single_party_with_no_named_party_is_400(monkeypatch):
    monkeypatch.setitem(FAMILY_BY_DEED_TYPE, "test-declaration", "declaration")
    payload = {
        **GENERATE_BASE,
        "deed_type": "test-declaration",
        "parties": {"declarant": "   "},   # whitespace is not a name
    }
    with authed_client() as client, \
            patch("routers.deeds_crud.create_deed", return_value=dict(FAKE_ROW)):
        resp = client.post("/deeds", json=payload)
    assert resp.status_code == 422   # same status as the two-party failures
    assert "Party information" in resp.json()["detail"]


def test_two_party_families_keep_the_strict_pair():
    """The relaxation must not leak: a grant deed (and an affidavit, whose
    aliased columns hold real parties) still fails without the pair — the
    same 422 the critical-field check has always returned."""
    for deed_type in ("grant-deed", "affidavit-death-jt"):
        payload = {
            **GENERATE_BASE,
            "deed_type": deed_type,
            "grantor_name": "ROBERT SELLER",
            # grantee_name deliberately missing
        }
        with authed_client() as client, \
                patch("routers.deeds_crud.create_deed", return_value=dict(FAKE_ROW)):
            resp = client.post("/deeds", json=payload)
        assert resp.status_code == 422, deed_type
        assert "Grantee" in resp.json()["detail"]


def test_db_layer_defense_matches_the_route(monkeypatch):
    """database.create_deed's defensive check applies the same family rule
    (route and DB layer must not disagree about what a valid row is)."""
    monkeypatch.setitem(FAMILY_BY_DEED_TYPE, "test-declaration", "declaration")
    src = inspect.getsource(database.create_deed)
    assert "is_single_party" in src
    # Two-party path unchanged:
    assert "'grantor_name', 'grantee_name', 'legal_description'" in src


def test_draft_autosave_carries_parties():
    row = dict(FAKE_ROW)
    with authed_client() as client, \
            patch("database.save_draft_row", return_value=row) as save:
        resp = client.post("/deeds/draft", json={
            "deed_type": "test-declaration",
            "parties": {"declarant": "ROBERT OWNER"},
        })
    assert resp.status_code == 200
    draft_data = save.call_args[0][2]
    assert draft_data["parties"] == {"declarant": "ROBERT OWNER"}


def test_persistence_writes_the_parties_column():
    """All three write paths persist the column (create, resume-update,
    autosave insert+update) — a path that dropped it would strand the
    single-party instrument's only party record."""
    for fn in (database.create_deed, database.update_deed_draft, database.save_draft_row):
        src = inspect.getsource(fn)
        assert "parties" in src, fn.__name__
        assert "json.dumps(deed_data['parties'])" in src, fn.__name__


def test_template_context_carries_parties():
    row = {"deed_type": "x", "parties": {"declarant": "ROBERT OWNER"}, "metadata": {}}
    assert build_context_from_row(row)["parties"] == {"declarant": "ROBERT OWNER"}
    # Non-dict junk never reaches a template.
    row["parties"] = "corrupt"
    assert build_context_from_row(row)["parties"] is None


def test_list_endpoint_projects_parties():
    src = inspect.getsource(__import__("routers.deeds_crud", fromlist=["x"]).list_deeds_endpoint)
    assert "parties" in src  # selected and returned for the Past Deeds projection
