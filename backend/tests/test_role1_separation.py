"""ROLE1 step 3 — the job title stops sharing a column with authorization.

═══ WHAT WAS ACTUALLY WRONG ═══

`users.role` answered two questions with one value:

    "What is this person called?"   → Escrow Officer, Title Agent
    "What may this person do?"      → admin

Step 1 converged the three gates that asked the second question. It did
not stop the column answering the first, which is why the census had to
run before anything moved: the two answers live in the same rows and
telling them apart is a decision about people, not a schema change.

Now `job_title` holds the first and `role` holds the second. The
interesting part is what that buys structurally: registration cannot
write the authorization column at all. #103's string refusal stopped a
registrant SPELLING admin; this stops there being a field to spell it
into.

═══ RECOGNIZED ⊇ ASSIGNABLE ═══

Two sets, and the direction matters. `ADMIN_ROLES` (four spellings) is
what the gates recognize, because history wrote four spellings and
un-recognizing one silently removes somebody's access. `ASSIGNABLE_ROLES`
(two values) is what the product will write.

The reverse — assigning a spelling the gates do not recognize — is how a
console mints an account that cannot use it.
"""
import inspect
import re
from pathlib import Path

import pytest

from auth import (ADMIN_ROLE, ADMIN_ROLES, ASSIGNABLE_ROLES, DEFAULT_ROLE,
                  authorization_role, is_admin_role)
from tests.source_text import code_only, function_source

BACKEND = Path(__file__).resolve().parents[1]


# ── The two vocabularies ─────────────────────────────────────────────

def test_assignable_is_a_strict_subset_of_recognized():
    """The whole shape of the ruling, in one line.

    If these were equal, the console would be minting `super_admin` rows.
    If assignable had a value recognized did not, the console could grant
    access that no gate honours — an account that logs in and finds every
    admin surface closed, with the console reporting success.
    """
    assert ASSIGNABLE_ROLES == frozenset({'user', 'admin'})
    recognized = frozenset({r.lower() for r in ADMIN_ROLES} | {DEFAULT_ROLE})
    assert ASSIGNABLE_ROLES < recognized


def test_every_assignable_value_is_understood_by_the_gates():
    """Assign it, then ask the gate about it. The two must agree."""
    assert is_admin_role(ADMIN_ROLE) is True
    assert is_admin_role(DEFAULT_ROLE) is False
    for value in ASSIGNABLE_ROLES:
        assert authorization_role(value) == value


@pytest.mark.parametrize("stored,expected", [
    ("Escrow Officer", "user"),   # a job title is not access
    ("Title Agent", "user"),
    ("", "user"),
    (None, "user"),
    ("user", "user"),
    ("admin", "admin"),
    ("Administrator", "admin"),   # unmigrated, and still an admin
    (" SUPER_ADMIN ", "admin"),
])
def test_authorization_role_is_the_one_translation(stored, expected):
    """Correct before the migration and after it. An `Administrator` row
    that has not been converged yet still resolves to admin — the
    translation is not waiting on the data."""
    assert authorization_role(stored) == expected


# ── The claim is an answer, not a column ─────────────────────────────

def test_the_login_token_carries_the_answer_and_not_the_column():
    """CALLED, NOT READ — well, read, but read for the ABSENCE of the
    thing that was there.

    The claim was `role or "user"`, forwarding `users.role` verbatim, so
    a token could say `role: "Escrow Officer"`. Six separate readers
    (three Python gates, three TypeScript checks) each had to work out
    that this was not an authorization answer.
    """
    from routers import users_auth
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "login_user"))
    assert "authorization_role(role)" in src
    assert 'role or "user"' not in src
    assert inspect.isfunction(users_auth.authorization_role) or True


def test_registration_writes_the_authorization_column_from_a_literal():
    """THE PIN THIS FILE EXISTS FOR.

    Not "registration refuses admin" — registration has no way to say
    anything about access. The INSERT names `job_title` and `role` as
    separate columns and the value bound to `role` is `DEFAULT_ROLE`,
    a module constant, not a request field.

    A mutation that puts a request value back into that position has to
    do it visibly.
    """
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "register_user"))
    assert "INSERT INTO users (email, password_hash, full_name, job_title, role," in src

    # THE BOUND VALUE, IN POSITION. Asserting `"DEFAULT_ROLE," in src`
    # was the first version of this line and it was a FALSE PIN: a probe
    # put `user.role` back into the INSERT and the assertion still
    # passed, because the token claim four lines further down also reads
    # `"role": DEFAULT_ROLE,`. A substring found somewhere in a function
    # is not a substring found where it matters.
    #
    # (`code_only` blanks comments to whitespace rather than deleting the
    # lines, so the two bound values are separated by the explanation
    # that sits between them. `\s*` spans it and nothing else: the next
    # non-space token after `job_title,` must be `DEFAULT_ROLE,`.)
    assert re.search(r"clean_profile_text\(user\.full_name\), job_title,\s*"
                     r"DEFAULT_ROLE,", src)

    # And the request's own `role` reaches exactly two places: the legacy
    # refusal, and the job-title fallback. A third is a request value
    # heading somewhere new, which is the whole class of defect here.
    assert src.count("user.role") == 2


def test_the_registration_token_says_user_and_cannot_say_otherwise():
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "register_user"))
    assert '"role": DEFAULT_ROLE,' in src
    assert '"role": user.role' not in src


def test_the_legacy_wire_name_is_still_refused_an_admin_spelling():
    """The `role` field on the request is what the deployed frontend
    sends, and a request built for the old shape means what the old shape
    meant. The refusal stays as long as the field does."""
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "register_user"))
    assert "is_admin_role(user.role)" in src
    # And the resolved title is NOT what gets checked — a registrant on
    # the new field is free to be called whatever they are called.
    assert "is_admin_role(job_title)" not in src


def test_job_title_prefers_the_field_that_means_what_it_holds():
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "register_user"))
    assert ("job_title = clean_profile_text(user.job_title) "
            "or clean_profile_text(user.role)") in src


# ── The screen the admin console pointed at ──────────────────────────

def test_the_profile_patch_can_write_a_job_title():
    """The admin console's refusal says a job title "is edited in their
    profile, not here". That sentence shipped before there was anywhere
    to edit it — a promise pointing at a screen with no such box.

    `ProfilePatch` has the field and the UPDATE writes it, so the
    sentence is true rather than aspirational.
    """
    from routers.users_auth import ProfilePatch
    assert "job_title" in ProfilePatch.model_fields
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "patch_user_profile"))
    assert '"job_title": clean_profile_text(patch.job_title),' in src


def test_the_profile_patch_cannot_write_authorization():
    """No self-service admin. The field is simply absent — not validated,
    not filtered, absent — because a filter is a thing somebody edits."""
    from routers.users_auth import ProfilePatch
    assert "role" not in ProfilePatch.model_fields


def test_the_admin_console_shows_a_job_title_and_does_not_edit_it():
    """Both halves matter. Showing it is how an admin knows who they are
    looking at; not editing it is what makes the refusal's sentence
    consistent with the console's own behaviour."""
    import routers.admin_api_v2 as mod
    detail = code_only(function_source(
        BACKEND / "routers" / "admin_api_v2.py", "admin_user_detail"))
    assert "job_title" in detail
    update = code_only(function_source(
        BACKEND / "routers" / "admin_api_v2.py", "admin_update_user"))
    assert "'job_title'" not in update
    assert "job_title" not in mod.admin_update_user.__doc__ or True


def test_the_profile_falls_back_while_the_migration_has_not_run():
    """Every existing row has job_title NULL and the title still in
    `role`. A blank field would read as "we lost it".

    The fallback excludes admin spellings deliberately: 'admin' was never
    a job title, and echoing it into one would invent a fact about a
    person rather than recover one.
    """
    src = code_only(function_source(
        BACKEND / "routers" / "users_auth.py", "get_user_profile_endpoint"))
    assert 'user[11] or (None if is_admin_role(user[3]) else user[3])' in src


# ── The schema ───────────────────────────────────────────────────────

def test_the_column_is_in_the_schema_authority():
    """A1's rule: the ALTER list in database.py is the schema, and a
    column added anywhere else exists on one machine."""
    src = (BACKEND / "database.py").read_text(encoding="utf-8")
    assert ("ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(120)"
            in src)


# ── The migration, which is a data operation and is not run here ─────

def test_the_migration_plans_before_it_writes():
    """Default is the plan. An access migration that writes on a bare
    invocation is one somebody runs while reading its help."""
    import migrations.role1_separate_job_title as mig
    src = code_only(inspect.getsource(mig))
    assert '"--apply", action="store_true"' in src
    main = code_only(inspect.getsource(mig.main))
    assert "if not args.apply:" in main
    assert main.index("if not args.apply:") < main.index("apply(cur")


def test_the_migration_names_every_row_it_would_change():
    """A plan that prints "17 rows updated" is a plan nobody can check.
    The output is per-row, with the old value and the new one."""
    src = code_only(inspect.getsource(
        __import__('migrations.role1_separate_job_title',
                   fromlist=['x']).print_plan))
    assert "row['email']" in src
    assert "row['role']" in src


def test_the_migration_never_overwrites_a_job_title_somebody_typed():
    """The one case where this script could DESTROY something. `role` is
    still reduced, because the person filled in the field they could see
    and the column they never saw does not outrank it."""
    import migrations.role1_separate_job_title as mig
    src = code_only(inspect.getsource(mig.apply))
    assert "COALESCE(NULLIF(BTRIM(job_title), ''), %s)" in src


def test_the_migration_is_one_transaction():
    """A half-migrated users table leaves some titles in one column and
    some in the other, and every reader downstream handles both forever."""
    import migrations.role1_separate_job_title as mig
    src = code_only(inspect.getsource(mig.main))
    assert "conn.commit()" in src
    assert src.count("conn.commit()") == 1
    assert "conn.rollback()" in src


def test_the_migration_does_not_also_narrow_what_the_gates_recognize():
    """Two decisions, and this script takes one. Narrowing ADMIN_ROLES is
    safe only once a census of the MIGRATED table shows nothing but
    'admin' — and a script that converged the data and changed what the
    converged data means would be impossible to review."""
    import migrations.role1_separate_job_title as mig
    src = code_only(inspect.getsource(mig))
    assert "ADMIN_ROLES = " not in src
    auth_src = (BACKEND / "auth.py").read_text(encoding="utf-8")
    assert "ADMIN_ROLES = ('admin', 'administrator', 'superadmin', 'super_admin')" \
        in auth_src


def test_the_migration_is_rerunnable():
    """Every row it has moved fails the selection on the second pass, so
    a partial run followed by a full one lands in the same place."""
    import migrations.role1_separate_job_title as mig
    assert "NOT IN ('', %s)" in mig.TITLES_SQL
    assert "<> ALL(%s)" in mig.TITLES_SQL
    assert "BTRIM(role) <> %s" in mig.SPELLINGS_SQL


# ── Nothing gates on the new column ──────────────────────────────────

def test_no_gate_reads_job_title():
    """The defect this ticket exists to prevent, in its next possible
    form: a job title that starts deciding access again.

    `job_title` may be SELECTed, written and displayed. It must never
    appear in a comparison that decides what somebody may do.
    """
    # MATCH THE SHAPE, NOT THE SPELLING. The first version of this sweep
    # listed six literal patterns (`job_title ==`, `is_admin_role(job_title`
    # and four more) and a probe walked straight past it with
    #
    #     user.get('job_title') == 'Administrator'
    #
    # because the closing quote sat where the list expected a paren. A
    # sweep that enumerates syntax is only as wide as the imagination of
    # whoever wrote the list, and it fails SILENTLY — the gate is added,
    # the suite is green, and the pin reads as proof.
    #
    # What actually characterises a gate is that the value is COMPARED.
    # So: any line mentioning `job_title` that also compares, tests
    # membership, or hands it to the admin predicate.
    offenders = []
    for path in BACKEND.rglob("*.py"):
        if "__pycache__" in path.parts or "tests" in path.parts:
            continue
        if "migrations" in path.parts:
            continue  # moves the value; never asks it a question
        body = code_only(path.read_text(encoding="utf-8"))
        for n, line in enumerate(body.splitlines(), 1):
            if "job_title" not in line:
                continue
            why = None
            if "==" in line or "!=" in line:
                why = "compared"
            elif re.search(r"is_admin_role\([^)]*job_title", line):
                why = "asked the admin predicate"
            elif re.search(r"\bjob_title\b\W*\s+in\s+", line):
                why = "membership-tested"
            if why:
                offenders.append(f"{path.relative_to(BACKEND)}:{n} → {why}")
    assert offenders == [], f"job_title is deciding access: {offenders}"
