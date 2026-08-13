"""SIGNUP1 — registration stops promising what the product cannot do.

═══ FIFTY OPTIONS, ONE PRODUCT ═══

The state dropdown offered fifty. The catalog, the chassis, the DTT rate
registry and every county form in this product are CALIFORNIA by
construction — 58 California counties, California code sections,
California transfer tax. Fifty options is a promise broken the moment
somebody in Arizona registers and finds no Arizona forms.

Owner-ruled: California, displayed rather than chosen.

**And the refusal has to be the SERVER's**, not the screen's. Removing
the dropdown while the endpoint keeps accepting `AZ` is the cosmetic
version of the fix: registration is public, so an API caller would still
open an account this product cannot serve — and the person who opened it
would find out by looking for forms that do not exist.

═══ AND THE PHONE ═══

`clean_profile_text` only collapses whitespace, so "not-a-phone!!" was
stored verbatim and production holds a nine-digit number nobody can call.

A full normalizer has existed in BOTH languages since PARTNER2 —
`services/phone.py`, `frontend/src/lib/phone.ts`, and a shared corpus so
the two are checked against one referee. The partner screens have used it
all along. **Registration never called it.**

That is the same shape NOTARYPHONE1 found hours earlier: the fix reached
every surface where a customer could report a problem, and none where a
stranger could not.
"""
import inspect

import pytest

import routers.users_auth as mod
from routers.users_auth import SERVED_STATE
from services.phone import normalize_phone


# ── The state is refused on the server ───────────────────────────────

def test_the_served_state_is_california():
    assert SERVED_STATE == "CA"


def test_registration_refuses_another_state_and_says_what_we_serve():
    """THE PIN THIS FILE EXISTS FOR.

    A refusal that says "invalid" teaches nothing — the state IS valid,
    it is just not one we serve, and the difference is the whole point.
    """
    src = inspect.getsource(mod.register_user)
    assert "!= SERVED_STATE" in src
    assert "serves California today" in src
    assert "California-specific" in src


def test_the_refusal_comes_after_the_format_check_not_instead_of_it():
    """`AAA` is a malformed code and `AZ` is a real state we do not
    serve. Two different answers, and collapsing them would tell somebody
    their typo was a business decision."""
    src = inspect.getsource(mod.register_user)
    assert src.index("validate_state_code") < src.index("!= SERVED_STATE")


def test_both_languages_name_the_same_state():
    """A screen that stops offering a state while the server keeps
    accepting it is the pair that drifts because nobody compares it."""
    from pathlib import Path
    repo = Path(__file__).resolve().parents[2]
    ts = (repo / "frontend" / "src" / "lib" / "registerForm.ts").read_text(
        encoding="utf-8")
    assert f"SERVED_STATE = '{SERVED_STATE}'" in ts


# ── The phone is normalized where it is stored ───────────────────────

def test_the_registration_insert_normalizes_the_phone():
    src = inspect.getsource(mod.register_user)
    assert "normalize_phone(clean_profile_text(user.phone))" in src


def test_whitespace_cleaning_was_never_phone_validation():
    """The distinction the defect turned on. `clean_profile_text` is
    doing its job correctly and its job is not this one."""
    from database import clean_profile_text
    assert clean_profile_text("not-a-phone!!") == "not-a-phone!!"
    # And the normalizer refuses to invent a number out of it — it
    # returns the text verbatim rather than discarding what it cannot
    # parse (services/phone.py's own rule).
    assert normalize_phone("not-a-phone!!") == "not-a-phone!!"


def test_a_real_number_reaches_storage_in_one_shape():
    assert normalize_phone("(626) 555-0134") == "+16265550134"
    assert normalize_phone("626.555.0134") == "+16265550134"


def test_the_normalizer_was_already_here_and_already_used():
    """The finding, pinned so it reads as a finding rather than a fix.

    This is not new capability. It is capability that reached the
    partner screens and not the signup form — the surface a stranger
    meets first.
    """
    import services.partners as partners
    assert "normalize_phone" in inspect.getsource(partners)


# ── The interest signal is stored AND readable ───────────────────────

def test_the_interest_signal_is_accepted_and_optional():
    assert "interest_state" in mod.UserRegister.model_fields
    assert mod.UserRegister.model_fields["interest_state"].default is None


def test_it_is_written():
    src = inspect.getsource(mod.register_user)
    assert "interest_state" in src
    assert "clean_profile_text(user.interest_state)" in src


def test_it_is_READABLE_which_is_the_legal1_bar():
    """LEGAL1's ruling, applied before the mistake rather than after.

    `subscribe` was collected at registration, written to `users`, and
    appeared in no response, no profile, no admin view and no export.
    That manufactured a record which looked like information and could
    not function as one, and it cost a ticket to undo.

    A signal nobody can read is the same defect wearing a different
    column name. This one reaches the admin user view.
    """
    import routers.admin_api_v2 as admin
    assert "interest_state" in inspect.getsource(admin)


def test_the_column_exists_in_the_one_schema_authority():
    import database
    src = inspect.getsource(database)
    assert ("ALTER TABLE users ADD COLUMN IF NOT EXISTS interest_state"
            in src)


# ── The role guard still holds on the new path ───────────────────────

def test_a_free_text_role_cannot_grant_privilege():
    """SIGNUP1 opened a NEW WAY INTO `users.role`, and ROLE1 step 3 shut
    the door rather than widening the guard on it.

    "Other" resolves to whatever she typed. While `users.role` was the
    column `is_admin_role()` reads, that free-text box was the #103
    escalation path reopened, and the answer was a refusal sitting on the
    resolved value.

    The answer now is that the resolved value goes to `job_title` and the
    access column is written from a module constant. There is no field to
    guard, which is why the guard is gone: what she types cannot reach
    the column that decides anything.
    """
    src = inspect.getsource(mod.register_user)
    assert "job_title = clean_profile_text(user.job_title)" in src
    assert "DEFAULT_ROLE," in src
    # The resolved title is bound to `job_title` BEFORE the INSERT, and
    # nothing between them touches the access column.
    assert src.index("job_title = clean_profile_text") < src.index("INSERT INTO users")


@pytest.mark.parametrize("claimed", ["admin", "Admin", "ADMIN"])
def test_the_guard_is_case_insensitive_about_it(claimed):
    from auth import is_admin_role
    assert is_admin_role(claimed) is True
