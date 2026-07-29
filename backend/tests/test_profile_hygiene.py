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
    conn = MagicMock()
    cursor = MagicMock()
    conn.cursor.return_value = cursor

    with patch("database.get_db_connection", return_value=conn):
        ok = update_user_profile(7, {
            "company_name": "  Pacific COast TItle ",
            "business_address": " 123  Main   St ",
            "license_number": "  LIC-99  ",
            "default_county": " Los   Angeles ",
        })

    assert ok is True
    params = cursor.execute.call_args[0][1]
    assert params[1] == "Pacific COast TItle"   # trimmed, case untouched
    assert params[2] == "123 Main St"
    assert params[3] == "LIC-99"
    assert params[5] == "Los Angeles"


def test_registration_normalizes_and_rejects_blank_names():
    """The register INSERT runs through clean_profile_text, and an
    all-whitespace full name is a 400, not a NULL row."""
    import inspect
    import routers.users_auth as mod
    src = inspect.getsource(mod)
    assert "clean_profile_text(user.full_name)" in src
    assert "clean_profile_text(user.company_name)" in src
    assert 'detail="Full name is required"' in src
