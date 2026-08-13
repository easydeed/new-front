"""ROLE1 — one definition of admin, and an admin form that cannot fail
silently.

═══ THREE GATES, THREE ANSWERS ═══

`is_admin_role` took four spellings case-insensitively.
`admin_partners.py` and the owner-or-admin deed fetch each took exactly
`'admin'`. Six of eight values diverged.

The divergence was RESTRICTIVE, so it was never an escalation. What it
produced was a PARTIAL ADMIN: somebody with role `Administrator` entered
the console and was then refused by two gates inside it, which they would
experience as the console being broken. Nothing recorded which of the
three was authoritative.

A second answer to "is this person an admin" is a second answer to a
security question, and the one that gets missed is the one nobody knew
existed.

═══ AND THE PATH THAT WAS ACTUALLY UNGUARDED ═══

Registration was the loud path and was closed by #103. The quiet one was
`admin_update_user`, which accepted `role` with no value validation and
no self-demotion guard:

  - `Administrator` created a partial admin;
  - `adminn` granted nothing, SILENTLY — invariant #4 in an admin form;
  - an admin could demote themselves and lose the console with no warning.
"""
import inspect

import pytest

from auth import ADMIN_ROLES, is_admin_role


# ── One definition ───────────────────────────────────────────────────

def test_the_vocabulary_lives_in_exactly_one_place():
    assert ADMIN_ROLES == ('admin', 'administrator', 'superadmin', 'super_admin')
    src = inspect.getsource(is_admin_role)
    assert "ADMIN_ROLES" in src


@pytest.mark.parametrize("spelling", [
    "admin", "Admin", "ADMIN", " administrator ", "Administrator",
    "superadmin", "SUPER_ADMIN",
])
def test_every_spelling_is_admin_everywhere(spelling):
    assert is_admin_role(spelling) is True


@pytest.mark.parametrize("not_admin", [
    "Escrow Officer", "user", "", None, "adminn", "administrater", "Notary",
])
def test_and_nothing_else_is(not_admin):
    assert is_admin_role(not_admin) is False


def test_the_partner_gate_asks_the_one_function():
    """THE PIN THIS FILE EXISTS FOR (first half)."""
    import routers.admin_partners as mod
    src = inspect.getsource(mod)
    assert "is_admin_role(user.get('role'))" in src
    assert "user.get('role') == 'admin'" not in src


def test_the_deed_fetch_shares_the_vocabulary_rather_than_copying_it():
    """`is_admin_role` cannot run inside Postgres, so the shared thing is
    the TUPLE: it travels as a bound parameter and the comparison is the
    same case-insensitive one. A repeated literal would be a fourth place
    for a spelling to be forgotten."""
    import routers.deeds_crud as mod
    src = inspect.getsource(mod)
    assert "u.role = 'admin'" not in src
    assert "LOWER(u.role) = ANY(%s)" in src
    assert "list(ADMIN_ROLES)" in src


def test_no_file_hard_codes_an_admin_spelling_any_more():
    """The sweep that makes "one definition" mean something.

    A comparison against a literal admin spelling anywhere is a fourth
    gate waiting to diverge.
    """
    from pathlib import Path
    backend = Path(__file__).resolve().parents[1]
    offenders = []
    for path in backend.rglob("*.py"):
        if "__pycache__" in path.parts or "tests" in path.parts:
            continue
        if path.name == "admin_partners.py":
            # Its only remaining hits are inside the COMMENT recording
            # what it used to compare. Read through the stripper instead
            # of exempting the file, so a real comparison still fails.
            from tests.source_text import code_only
            if any(lit in code_only(path.read_text(encoding="utf-8"))
                   for lit in ("== 'admin'", '== "admin"')):
                offenders.append(f"{path.relative_to(backend)} → comparison")
            continue
        if path.name in ("auth.py", "set_admin_role.py", "role_census.py"):
            continue  # the definition itself, and two admin tools
        if "migrations" in path.parts or path.name == "api_baseline.py":
            # WRITES, not gates. `SET role = 'admin'` assigns the
            # canonical spelling; it does not decide who is one. The
            # rule is about a second ANSWER to the question, and these
            # never ask it.
            continue
        text = path.read_text(encoding="utf-8")
        for spelling in ADMIN_ROLES:
            for literal in (f"== '{spelling}'", f'== "{spelling}"',
                            f"= '{spelling}'"):
                if literal in text:
                    offenders.append(f"{path.relative_to(backend)} → {literal}")
    assert offenders == [], f"a second definition of admin: {offenders}"


# ── The admin form cannot fail silently ──────────────────────────────

def test_a_role_that_grants_nothing_is_refused_by_name():
    """`adminn` used to be accepted, stored, and reported as success —
    the product declining and not saying so."""
    import routers.admin_api_v2 as mod
    src = inspect.getsource(mod._validate_role_change)
    assert "ASSIGNABLE_ROLES" in src
    assert "would grant nothing" in src
    # And it names what WOULD work, or the admin retries the same typo.
    assert "' or '.join(sorted(ASSIGNABLE_ROLES))" in src


def test_the_assignable_set_is_authorization_not_job_titles():
    """The interesting half, and step 3 narrowed it.

    While `users.role` carried both meanings this had to stay wide:
    registration wrote free text into the same column, so a closed set
    covering BOTH would have rejected values the product itself created.
    Step 3 removed that constraint — the job title has its own column and
    registration writes the authorization value from a literal — so the
    assignable set is now two values, not five.

    The three that left (`administrator`, `superadmin`, `super_admin`)
    are still RECOGNIZED by the gates, for rows history already wrote.
    Recognizing a spelling and minting more of it are different acts.
    """
    from routers.admin_api_v2 import ASSIGNABLE_ROLES
    assert ASSIGNABLE_ROLES == frozenset({'user', 'admin'})
    assert ASSIGNABLE_ROLES < frozenset({*ADMIN_ROLES, 'user'})
    src = inspect.getsource(
        __import__('routers.admin_api_v2', fromlist=['x'])._validate_role_change)
    assert "job title" in src.lower()


# ── CALLED, NOT READ ─────────────────────────────────────────────────
#
# The first draft of these three asserted that "status_code=409",
# "locked out" and "Ask another" APPEAR IN THE SOURCE. A mutation probe
# replaced the `if` with `if False:` — the raise block intact, the
# guard gone — and all 29 tests passed.
#
# Same class as the frontend's `{false && (`, in Python. For a page the
# fix is rendering; for a service it is CALLING. A string-presence pin
# cannot tell REACHABLE from PRESENT, and knowing that does not stop
# anybody writing one.

def _cursor_for(row):
    """A cursor that answers the one SELECT the guard makes."""
    from unittest.mock import MagicMock
    cur = MagicMock()
    cur.fetchone.return_value = row
    return cur


def _check(target_row, admin_email, new_role):
    from routers.admin_api_v2 import _validate_role_change
    return _validate_role_change(_cursor_for(target_row), 7, admin_email, new_role)


def test_self_demotion_is_refused_as_a_lockout():
    """THE PIN THIS FILE EXISTS FOR (second half).

    An admin removing their own last access is a lockout, not a decision:
    undoing it needs the console they just left.
    """
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        _check({"email": "boss@deedpro.com", "role": "admin"},
               "boss@deedpro.com", "user")
    assert exc.value.status_code == 409
    assert "locked out" in exc.value.detail
    # And it says who can undo it, or she is refused with nowhere to go.
    assert "Ask another" in exc.value.detail


def test_the_comparison_is_by_email_and_is_case_insensitive():
    """`get_current_admin` returns an EMAIL, not an id — comparing ids
    would need one it never receives. Addresses arrive in whatever case
    the token carries."""
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        _check({"email": "Boss@DeedPro.com", "role": "admin"},
               "boss@deedpro.com", "user")


def test_demoting_SOMEBODY_ELSE_is_allowed():
    """The guard is about a lockout, not about demotion. An admin
    removing another admin is an ordinary decision."""
    assert _check({"email": "other@deedpro.com", "role": "admin"},
                  "boss@deedpro.com", "user") is None


def test_demoting_a_non_admin_is_not_a_lockout():
    """Nothing to lose. Firing here would refuse a no-op."""
    assert _check({"email": "boss@deedpro.com", "role": "user"},
                  "boss@deedpro.com", "user") is None


def test_promotion_can_never_trip_the_lockout_check():
    """Granting admin cannot lock anybody out — and a guard that fired on
    promotion would make the console unable to add an admin, which is
    worse than the defect it fixes.

    Driven with a row that WOULD trip it if the early return were gone.

    One spelling, since step 3: the other three are recognized but no
    longer assignable, and asking this question about them would be
    asking it past a refusal that comes first.
    """
    assert _check({"email": "boss@deedpro.com", "role": "admin"},
                  "boss@deedpro.com", "admin") is None


def test_a_recognized_spelling_is_still_refused_as_an_ASSIGNMENT():
    """The two sets differ, and this is where the difference is visible.

    `Administrator` opens every gate for a row that already holds it —
    and cannot be written into a new one. A console that could write it
    would be manufacturing more of the divergence ROLE1 converged.
    """
    from fastapi import HTTPException
    for spelling in ("Administrator", "superadmin", "super_admin"):
        assert is_admin_role(spelling) is True, "still recognized"
        with pytest.raises(HTTPException) as exc:
            _check({"email": "x@y.z", "role": "user"}, "boss@deedpro.com", spelling)
        assert exc.value.status_code == 400


def test_an_unknown_role_is_refused_by_the_call_too():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        _check({"email": "x@y.z", "role": "user"}, "boss@deedpro.com", "adminn")
    assert exc.value.status_code == 400
    assert "would grant nothing" in exc.value.detail


def test_a_blank_role_is_refused_by_the_call_too():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        _check({"email": "x@y.z", "role": "user"}, "boss@deedpro.com", "   ")
    assert exc.value.status_code == 400
    assert "cannot be blank" in exc.value.detail


def test_the_validation_runs_before_the_update_is_built():
    import routers.admin_api_v2 as mod
    src = inspect.getsource(mod.admin_update_user)
    assert src.index("_validate_role_change") < src.index("cur.execute(query")


# ── The census, which is the deliverable ─────────────────────────────

def test_the_census_cannot_write():
    """A census that can mutate is a census somebody runs with the wrong
    flag. There is no `--apply`, deliberately."""
    import scripts.role_census as census
    src = inspect.getsource(census)
    from tests.source_text import code_only
    body = code_only(src)
    # Read through the stripper: the docstring SAYS "there is no
    # `--apply`", which is a description of the rule rather than a
    # violation of it. Third time this week a sweep caught its own
    # explanation.
    assert "--apply" not in body
    assert "UPDATE " not in body.upper()
    assert "add_argument" not in body


def test_the_census_reports_whose_access_the_convergence_changed():
    """The number that matters. Converging the gates admitted every
    non-'admin' admin spelling to two gates that previously refused
    them — that is a real access change and it needs naming per row."""
    import scripts.role_census as census
    src = inspect.getsource(census)
    assert "convergence CHANGED" in src
    assert "BTRIM(role) <> 'admin'" in src


def test_a_fourth_definition_was_found_and_deleted():
    """`utils/roles.py` defined `is_admin` accepting `admin` and
    `administrator` ONLY — missing `superadmin` and `super_admin` — and
    NOTHING IMPORTED IT.

    The investigation missed it; this sweep found it. Dead code carrying
    a false explanation is worse than no code, and a false SECURITY
    definition in a file named `roles.py` is worse still: it is not
    wrong until somebody imports it as the obvious helper, and then it
    is wrong quietly.
    """
    from pathlib import Path
    backend = Path(__file__).resolve().parents[1]
    assert not (backend / "utils" / "roles.py").exists()


def test_the_census_names_which_database_it_read():
    import scripts.role_census as census
    src = inspect.getsource(census)
    assert "assert_tables" in src
    assert "expected_database()" in src
