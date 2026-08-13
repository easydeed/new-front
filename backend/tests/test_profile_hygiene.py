"""Profile-field hygiene at save time (the #65 follow-up ticket).

Profile strings print on deed faces — the audited "Pacific COast TItle "
was stored verbatim (trailing space and all) and rode onto documents.
Normalization lives at the WRITE choke points (update_user_profile and
the registration INSERT), so every endpoint or script that feeds them
stores clean rows. Whitespace is machine noise and is fixed; CASE is the
owner's text and is never touched — auto-"fixing" McDonald or LLC would
corrupt real names.
"""
from unittest.mock import MagicMock, patch

from database import clean_profile_text, update_user_profile


def test_clean_profile_text_trims_and_collapses():
    assert clean_profile_text("  Pacific COast TItle ") == "Pacific COast TItle"
    assert clean_profile_text("Two   Words\t Here") == "Two Words Here"
    assert clean_profile_text("already clean") == "already clean"


def test_clean_profile_text_never_touches_case():
    assert clean_profile_text("McDonald Escrow LLC") == "McDonald Escrow LLC"
    assert clean_profile_text("PACIFIC COAST") == "PACIFIC COAST"


def test_clean_profile_text_blank_collapses_to_none():
    assert clean_profile_text("   ") is None
    assert clean_profile_text("") is None
    assert clean_profile_text(None) is None


def test_update_user_profile_normalizes_deed_face_fields():
    """SETTINGS1 item 5 moved `company_name` out of this writer (it lives
    in `users` now) and made the column list the set of keys supplied —
    so the parameters are no longer at fixed positions. The rule under
    test is unchanged: whitespace is fixed at the write, case is not.

    Company-name normalization did not disappear with the column; it
    happens where the column now is (`clean_profile_text(patch.company_name)`
    in PATCH /users/profile, and in the registration INSERT below).
    """
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor

    with patch("database.get_db_connection", return_value=conn):
        ok = update_user_profile(7, {
            "business_address": " 123  Main   St ",
            "license_number": "  LIC-99  ",
            "default_county": " Los   Angeles ",
        })

    assert ok is True
    params = cursor.execute.call_args[0][1]
    assert params[0] == 7
    assert set(params[1:]) == {"123 Main St", "LIC-99", "Los Angeles"}


def test_company_name_normalization_did_not_go_missing_with_the_column():
    """A pin that would otherwise have been deleted along with the case
    it covered. `clean_profile_text` on the company still has to run —
    'Pacific COast TItle ' printed on deeds, trailing space and all."""
    import inspect
    import routers.users_auth as mod
    src = inspect.getsource(mod.patch_user_profile)
    assert "clean_profile_text(patch.company_name)" in src


def test_registration_normalizes_and_rejects_blank_names():
    """The register INSERT runs through clean_profile_text, and an
    all-whitespace full name is a 400, not a NULL row."""
    import inspect
    import routers.users_auth as mod
    src = inspect.getsource(mod)
    assert "clean_profile_text(user.full_name)" in src
    assert "clean_profile_text(user.company_name)" in src
    assert 'detail="Full name is required"' in src
