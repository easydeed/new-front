"""U1 — durable draft autosave endpoint (POST /deeds/draft).

The builder autosaves in-progress state to a real deed row so closing the
tab never silently destroys work. Contract pinned here:

- A draft may be arbitrarily incomplete: deed_type alone must save (the
  generate path's grantor/grantee/legal validation must NOT apply).
- First save inserts (deed_id None) and returns the row id; subsequent
  saves update THAT row — autosave and generate converge on one row.
- An update refused by the DB layer (wrong owner, completed, deleted,
  missing) is a 409, mirroring the generate-resume doctrine.
- Timestamps leave the API as full ISO strings with an explicit UTC
  offset — the date-only "%Y-%m-%d" shape displayed yesterday's date
  anywhere west of Greenwich (U1.4).
"""
from contextlib import contextmanager
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient

from auth import get_current_user_id
from main import app
from routers.deeds_crud import _iso_utc


@contextmanager
def authed_client(user_id=1):
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)


FAKE_ROW = {
    "id": 77,
    "status": "draft",
    "updated_at": datetime(2026, 7, 28, 23, 30, 0),  # naive UTC, like the column
}


def test_bare_draft_saves_without_critical_field_validation():
    """One typed field and a closed tab is still work worth keeping."""
    with authed_client() as client, \
            patch("database.save_draft_row", return_value=dict(FAKE_ROW)) as save:
        resp = client.post("/deeds/draft", json={"deed_type": "grant-deed"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == 77
    assert body["status"] == "draft"
    # Naive DB timestamp comes back with an explicit UTC offset.
    assert body["updated_at"] == "2026-07-28T23:30:00+00:00"
    user_id, deed_id, _ = save.call_args[0]
    assert user_id == 1
    assert deed_id is None  # first save → insert


def test_subsequent_save_updates_the_same_row():
    with authed_client() as client, \
            patch("database.save_draft_row", return_value=dict(FAKE_ROW)) as save:
        resp = client.post("/deeds/draft", json={"deed_type": "grant-deed", "deed_id": 77})

    assert resp.status_code == 200
    _, deed_id, _ = save.call_args[0]
    assert deed_id == 77


def test_resume_serializer_fields_reach_the_db_layer():
    """The autosave payload must carry the SAME fields generate persists
    (city/state/zip, county owner, provenance) — a draft that drops them
    would confess gaps on resume."""
    payload = {
        "deed_type": "grant-deed",
        "property_address": "123 Main St, Los Angeles, CA 90001",
        "property_city": "Los Angeles",
        "property_state": "CA",
        "property_zip": "90001",
        "current_owner": "JANE ROE",
        "provenance": {"apn": {"source": "sitex", "confirmed_at": "2026-07-28T00:00:00Z"}},
        "dtt": {"transfer_value": "500000"},
        "return_to": {"name": "JOHN DOE", "address1": "123 Main St"},
    }
    with authed_client() as client, \
            patch("database.save_draft_row", return_value=dict(FAKE_ROW)) as save:
        resp = client.post("/deeds/draft", json=payload)

    assert resp.status_code == 200
    _, _, draft_data = save.call_args[0]
    for key in ("property_city", "property_state", "property_zip",
                "current_owner", "provenance", "dtt", "return_to"):
        assert draft_data[key] == payload[key], f"{key} dropped on the way to the DB layer"


def test_refused_update_is_409_never_a_silent_fork():
    with authed_client() as client, \
            patch("database.save_draft_row", return_value=None):
        resp = client.post("/deeds/draft", json={"deed_type": "grant-deed", "deed_id": 99})

    assert resp.status_code == 409


def test_failed_insert_is_500_not_fake_success():
    with authed_client() as client, \
            patch("database.save_draft_row", return_value=None):
        resp = client.post("/deeds/draft", json={"deed_type": "grant-deed"})

    assert resp.status_code == 500


def test_draft_route_is_not_swallowed_by_the_deed_id_route():
    """/deeds/draft must be declared before /deeds/{deed_id} or FastAPI
    tries to parse "draft" as an int and 422s."""
    paths = [r.path for r in app.routes if "POST" in (getattr(r, "methods", None) or set())]
    assert paths.index("/deeds/draft") < len(paths)  # exists at all
    get_paths = [r.path for r in app.routes if "GET" in (getattr(r, "methods", None) or set())]
    assert "/deeds/{deed_id}" in get_paths


def test_iso_utc_stamps_naive_timestamps_as_utc():
    naive = datetime(2026, 7, 28, 23, 30, 0)
    assert _iso_utc(naive) == "2026-07-28T23:30:00+00:00"
    aware = datetime(2026, 7, 28, 23, 30, 0, tzinfo=timezone.utc)
    assert _iso_utc(aware) == "2026-07-28T23:30:00+00:00"
    assert _iso_utc(None) is None


def test_list_endpoint_never_regresses_to_date_only_strings():
    """U1.4 source pin: strftime("%Y-%m-%d") is the day-off bug — the
    browser parses a bare date as UTC midnight and renders yesterday."""
    import inspect
    import routers.deeds_crud as mod
    src = inspect.getsource(mod)
    assert 'strftime("%Y-%m-%d")' not in src


def test_the_single_party_reaches_the_draft_row():
    """FOUND BY AUDIT. `parties` carries the ONLY party a declaration-family
    instrument has — the homestead declaration's declarant, the trust
    certification's certifying trustee, the statutory POA's principal.

    The draft proxy's hand-written field list omitted it while the create
    proxy forwards the payload wholesale, so those drafts autosaved
    without their party and resumed with it blank: work discarded by a
    save that reported success.
    """
    payload = {
        "deed_type": "homestead-declaration",
        "parties": {"declarant": "JANE ROE"},
    }
    with authed_client() as client, \
            patch("database.save_draft_row", return_value=dict(FAKE_ROW)) as save:
        resp = client.post("/deeds/draft", json=payload)

    assert resp.status_code == 200
    _, _, draft_data = save.call_args[0]
    assert draft_data["parties"] == {"declarant": "JANE ROE"}


def test_who_chose_the_parcel_survives_the_page():
    """§13.3 — `basis` and `alternativeCount` were computed at search time
    and held in React state, so the record could not tell a parcel the
    SERVER matched from one SHE picked. Her confirmation proves she read
    the fields; it does not prove the row was the property she meant."""
    parcel = {"basis": "officer_choice",
              "matched_address": "1358 5TH ST",
              "alternative_count": 2}
    with authed_client() as client, \
            patch("database.save_draft_row", return_value=dict(FAKE_ROW)) as save:
        resp = client.post("/deeds/draft",
                           json={"deed_type": "grant-deed", "parcel": parcel})

    assert resp.status_code == 200
    _, _, draft_data = save.call_args[0]
    assert draft_data["parcel"] == parcel


def test_the_parcel_is_carried_into_the_stored_metadata():
    """The model accepting it is half; the DB layer has its own key list
    and a field absent from THAT is a field the row never sees."""
    from tests.source_text import code_only
    from pathlib import Path
    src = code_only(Path(__file__).resolve().parents[1] / "database.py")
    keys = src[src.index("'requested_by_address', 'affidavit'"):][:80]
    assert "'parcel'" in keys
