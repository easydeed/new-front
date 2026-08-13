"""SETTINGS1 item 5 — `company_name` has one home, and a partial write
stops erasing everything it did not mention.

═══ ONE FACT, TWO COLUMNS, NOBODY TOLD ═══

`company_name` existed in `users` AND in `user_profiles`. Registration,
the Settings page and admin wrote the first; `POST /users/profile/enhanced`
wrote the second; the deed pre-fill READ the second. So an officer who
corrected her company on the Settings page did not change the company
that pre-fills Recording Requested By, and no screen anywhere hinted
that there were two columns.

Owner-ruled: `users.company_name` is canonical. `get_user_profile` reads
it from there, `update_user_profile` no longer writes the duplicate, and
the column is retired by hand after the row counts are read
(`scripts/company_name_consolidation.py`).

═══ AND THE CLOBBERING WRITER FOUND WHILE CONFIRMING IT ═══

`update_user_profile`'s `ON CONFLICT DO UPDATE` set all eight columns
from `EXCLUDED` unconditionally, and `EXCLUDED` for an omitted key is
None. A call carrying one field NULLed the other seven.

That was survivable while nothing else owned those columns. SETTINGS1
gave `business_address` to `PATCH /users/profile` — so an officer could
save her address in Settings and have this endpoint wipe it seconds
later. Same disease as the ruling, approached from the other end: the
first wrote a column nobody read, this reads a column somebody else now
writes.
"""
import inspect
from unittest.mock import MagicMock, patch

import pytest

import database
from database import (PROFILE_COLUMNS, PROFILE_ELSEWHERE, get_user_profile,
                      update_user_profile)


def _cursor():
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor
    return conn, cursor


# ── the read ────────────────────────────────────────────────────────

def test_company_name_is_read_from_users_not_user_profiles():
    conn, cursor = _cursor()
    cursor.fetchone.return_value = {"company_name": "Pacific Coast Escrow"}
    with patch("database.get_db_connection", return_value=conn):
        get_user_profile(7)
    sql = " ".join(cursor.execute.call_args[0][0].split())
    assert "u.company_name" in sql
    # The retiring column must not be in the SELECT list at all — reading
    # both and picking one is how the two stay alive.
    assert "p.company_name" not in sql
    assert "FROM users u" in sql
    assert "LEFT JOIN user_profiles p" in sql


def test_auto_populate_is_coalesced_so_a_missing_row_does_not_disable_prefill():
    """The column DEFAULT never applies to a row that was never inserted.

    Anchoring the read on `users` means a person with no `user_profiles`
    row now comes back as a dict of NULLs rather than as None. Without
    the COALESCE, `suggest_defaults` reads `auto_populate_company_info`
    as None -> falsy -> pre-fill silently OFF, for every officer who
    never opened the old profile endpoint.
    """
    conn, cursor = _cursor()
    cursor.fetchone.return_value = {}
    with patch("database.get_db_connection", return_value=conn):
        get_user_profile(7)
    sql = " ".join(cursor.execute.call_args[0][0].split())
    assert "COALESCE(p.auto_populate_company_info, TRUE)" in sql


# ── the write ───────────────────────────────────────────────────────

def test_company_name_is_not_written_here_at_all():
    assert "company_name" not in PROFILE_COLUMNS
    # And it says where it went, so the endpoint can too.
    assert "company_name" in PROFILE_ELSEWHERE
    assert "users.company_name" in PROFILE_ELSEWHERE["company_name"]


def test_a_partial_write_touches_only_what_it_was_given():
    """THE PIN THIS FILE EXISTS FOR."""
    conn, cursor = _cursor()
    with patch("database.get_db_connection", return_value=conn):
        ok = update_user_profile(7, {"default_county": "Los Angeles"})
    assert ok is True
    sql = " ".join(cursor.execute.call_args[0][0].split())
    for untouched in ("business_address", "license_number",
                      "preferred_deed_type", "auto_populate_company_info"):
        assert untouched not in sql, f"{untouched} written by a call that omitted it"
    assert "default_county = EXCLUDED.default_county" in sql
    assert cursor.execute.call_args[0][1] == (7, "Los Angeles")


def test_the_business_address_settings_just_saved_survives():
    """The concrete loss this prevents, spelled out as a scenario.

    Asserted against the SQL rather than a mock's memory: what makes the
    address safe is that the statement never names its column.
    """
    conn, cursor = _cursor()
    with patch("database.get_db_connection", return_value=conn):
        update_user_profile(7, {"preferred_deed_type": "quitclaim"})
    sql = cursor.execute.call_args[0][0]
    assert "business_address" not in sql


def test_every_given_column_is_written():
    conn, cursor = _cursor()
    payload = {k: "x" for k in PROFILE_COLUMNS}
    with patch("database.get_db_connection", return_value=conn):
        update_user_profile(7, payload)
    sql = " ".join(cursor.execute.call_args[0][0].split())
    for col in PROFILE_COLUMNS:
        assert f"{col} = EXCLUDED.{col}" in sql, f"{col} given but not written"


def test_nothing_to_write_is_reported_rather_than_committed():
    """A no-op that returns success is a save the caller believes in."""
    conn, cursor = _cursor()
    with patch("database.get_db_connection", return_value=conn):
        assert update_user_profile(7, {"unknown_field": "x"}) is False
        assert update_user_profile(7, {}) is False
    cursor.execute.assert_not_called()
    conn.commit.assert_not_called()


def test_deed_face_strings_are_still_normalized_at_the_write():
    """#65's rule survives the rewrite: whitespace is machine noise and is
    fixed here; CASE is the owner's text and is never touched."""
    conn, cursor = _cursor()
    with patch("database.get_db_connection", return_value=conn):
        update_user_profile(7, {
            "business_address": " 123  Main   St ",
            "license_number": "  LIC-99  ",
            "default_county": " Los   Angeles ",
        })
    params = cursor.execute.call_args[0][1]
    assert params[0] == 7
    assert set(params[1:]) == {"123 Main St", "LIC-99", "Los Angeles"}


def test_column_names_never_come_from_the_caller():
    """The statement is f-string assembled, so the vocabulary must be
    fixed. A key the caller invents is dropped before it reaches SQL."""
    conn, cursor = _cursor()
    with patch("database.get_db_connection", return_value=conn):
        update_user_profile(7, {
            "default_county": "Los Angeles",
            "role); DROP TABLE users; --": "x",
        })
    sql = cursor.execute.call_args[0][0]
    assert "DROP TABLE" not in sql


# ── the endpoint ────────────────────────────────────────────────────

def _post_enhanced(body):
    """Call the endpoint for real, with the writer stubbed.

    ═══ WHY THESE THREE ARE CALLS AND NOT GREPS ═══

    The first draft of this block asserted that "PROFILE_ELSEWHERE" and
    "status_code=400" APPEAR IN THE SOURCE. A mutation probe deleted the
    refusal — `moved = []`, leaving the raise block intact and
    unreachable — and all three tests passed.

    A string-presence pin cannot tell REACHABLE from PRESENT. It reads
    the code the way a person skimming it does, which is precisely the
    reading that misses dead branches. Called, the endpoint has to
    actually refuse.
    """
    import asyncio

    from routers.users_auth import update_enhanced_user_profile
    with patch("routers.users_auth.update_user_profile") as writer:
        writer.return_value = True
        try:
            result = asyncio.run(
                update_enhanced_user_profile(profile_data=body, user_id=7))
        except Exception as e:  # HTTPException included, on purpose
            return e, writer
    return result, writer


def test_the_endpoint_refuses_company_name_and_says_where_it_lives():
    """Accepting it and dropping it would return "updated" for a save
    that did not happen — the class of defect the billing story was made
    of. The refusal has to name the new home, or the caller has nowhere
    to go."""
    from fastapi import HTTPException
    raised, writer = _post_enhanced({"company_name": "Pacific Coast Escrow"})
    assert isinstance(raised, HTTPException)
    assert raised.status_code == 400
    assert "users.company_name" in raised.detail
    assert "PATCH /users/profile" in raised.detail
    # And nothing was written on the way to refusing.
    writer.assert_not_called()


def test_it_refuses_even_when_a_valid_field_rides_along():
    """The dangerous shape: a caller sends county AND company, the county
    saves, the company does not, and the response says "updated". A
    partial success reported as a success is the same lie."""
    from fastapi import HTTPException
    raised, writer = _post_enhanced(
        {"default_county": "Los Angeles", "company_name": "Pacific Coast"})
    assert isinstance(raised, HTTPException)
    assert raised.status_code == 400
    writer.assert_not_called()


def test_a_body_with_nothing_recognisable_is_a_400_not_a_cheerful_200():
    from fastapi import HTTPException
    raised, writer = _post_enhanced({"favourite_colour": "blue"})
    assert isinstance(raised, HTTPException)
    assert raised.status_code == 400
    # It names what it does accept — a refusal that does not say what
    # would have worked gets retried verbatim.
    for col in PROFILE_COLUMNS:
        assert col in raised.detail
    writer.assert_not_called()


def test_the_endpoint_does_not_swallow_its_own_refusal():
    """The old body wrapped everything in `except Exception`, which
    catches the HTTPException it just raised and re-reports it as a 500.
    A 400 that arrives as a 500 sends the caller looking at our logs for
    their own bad request.

    Proven by the status codes above being 400 rather than 500 — this
    asserts it directly so the reason is recorded with the case."""
    raised, _ = _post_enhanced({"company_name": "x"})
    assert getattr(raised, "status_code", None) != 500


def test_the_endpoint_echoes_what_it_wrote():
    result, writer = _post_enhanced(
        {"default_county": "Los Angeles", "license_number": "LIC-1"})
    assert result == {"status": "updated",
                      "updated": ["default_county", "license_number"]}
    writer.assert_called_once()


def test_a_failed_write_is_not_reported_as_updated():
    """`update_user_profile` returning False means nothing was written.
    Saying "updated" anyway is the billing defect in miniature."""
    import asyncio

    from fastapi import HTTPException
    from routers.users_auth import update_enhanced_user_profile
    with patch("routers.users_auth.update_user_profile", return_value=False):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(update_enhanced_user_profile(
                profile_data={"default_county": "LA"}, user_id=7))
    assert exc.value.status_code == 500


# ── the deed face ───────────────────────────────────────────────────

def test_the_requested_by_suggestion_is_the_company_and_only_the_company():
    """`f"{company} - {role.title()}"` on the stored value
    'escrow_officer' produces "Escrow_Officer" — .title() does not touch
    the underscore. That string is a deed face, printed in the
    recorder's top-left box.

    A job title does not belong there in any case: the box names the
    PARTY requesting recording, and the live path (the builder's partner
    picker) has always put a bare company name in it.
    """
    from ai_assist import suggest_defaults
    out = suggest_defaults(
        {"profile": {"company_name": "Pacific Coast Escrow",
                     "role": "escrow_officer",
                     "auto_populate_company_info": True}},
        {},
    )
    assert out["recordingRequestedBy"] == "Pacific Coast Escrow"
    assert "_" not in out["recordingRequestedBy"]


# ── the consolidation script ────────────────────────────────────────

def test_the_script_will_not_drop_the_column():
    """Irreversible and owner-only. A script that CAN drop a column is a
    script that can drop one by accident, and a report does not recover
    from that."""
    import scripts.company_name_consolidation as mod
    src = inspect.getsource(mod)
    assert "DROP COLUMN" in mod.DROP_STATEMENT
    # Named in exactly one place — the constant it prints — and never
    # handed to a cursor.
    assert src.count("DROP COLUMN") == 1
    assert "execute(DROP_STATEMENT" not in src
    assert "cur.execute(f\"\"\"\n        ALTER TABLE" not in src


def test_the_backfill_never_overwrites_the_canonical_value():
    """Where the two disagree, `users` wins by the ruling — and the
    disagreements go in the report for a person to read, because a
    difference might be a correction the officer made in the old
    endpoint."""
    import scripts.company_name_consolidation as mod
    src = inspect.getsource(mod.backfill)
    assert "NOT " in src and "u.company_name" in src
    assert "UPDATE users u" in src


@pytest.mark.parametrize("fn", ["counts", "disagreements", "backfill"])
def test_blankness_is_defined_in_one_place(fn):
    """The report and the backfill must not disagree about what "has a
    company name" means, or --apply moves rows the report did not count."""
    import scripts.company_name_consolidation as mod
    src = inspect.getsource(getattr(mod, fn))
    assert "HAS.format(" in src
