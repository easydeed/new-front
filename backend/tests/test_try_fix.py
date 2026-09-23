"""TRY-FIX — the three live-walkthrough rulings, pinned.

An external tester ran `/try` in production. What it showed them was:

  · a footer promising every PDF is watermarked, over deeds that were
    not;
  · a tamper step displaying `409 Refused` beside the sentence "the
    approval was accepted — the guard did not fire";
  · and, underneath both, a demo that had been minting permanent public
    verification records for a fictional parcel.

Each assertion below guards one of those from coming back.
"""
from __future__ import annotations

from pathlib import Path

from services.api_confirm_lifecycle import DEMO_KIND_FIXTURE, DEMO_KIND_TRY
from services.dtt_rates import compute_dtt
from routers.try_demo import (
    SAMPLE_PAYLOAD, SECOND_DRAFT_VALUE, TRAPS, VARIANTS, _build,
)
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]

CONFIRM_RAW = BACKEND.joinpath("routers/api_confirm.py").read_text()
CONFIRM_CODE = code_only(CONFIRM_RAW)
ROUTER_RAW = BACKEND.joinpath("routers/api_v1/router.py").read_text()
ROUTER_CODE = code_only(ROUTER_RAW)
TRY_RAW = BACKEND.joinpath("routers/try_demo.py").read_text()
TRY_CODE = code_only(TRY_RAW)
ADMIN_CODE = code_only(BACKEND.joinpath("routers/admin_api_v2.py").read_text())


def flowed(text: str) -> str:
    """Prose with its line wrapping removed. See test_try_stage1."""
    return " ".join(text.split())


# ═══ (1) THE DEMO MINTS NO PUBLIC VERIFICATION RECORD ════════════════

def test_a_demo_approval_inserts_no_authenticity_row():
    """The insert is inside a branch, and the branch is `demo_kind`.

    `document_authenticity` is what `/api/v1/verify/{code}` answers
    from — no auth, no expiry. Every `/try` approval used to write one.
    """
    assert 'if row["demo_kind"]:' in CONFIRM_CODE
    assert "authenticity_id = None" in CONFIRM_CODE
    guard = CONFIRM_CODE.index('if row["demo_kind"]:')
    insert = CONFIRM_CODE.index("INSERT INTO document_authenticity")
    assert guard < insert, "the marker must be read BEFORE the insert"


def test_approve_can_actually_see_the_marker_it_branches_on():
    """The §14.2 shape this would otherwise take.

    A branch on `row["demo_kind"]` over a SELECT that never fetched the
    column raises rather than silently passing — but the column is easy
    to drop from the projection while the branch stays, so the
    projection is pinned to the branch.
    """
    select = CONFIRM_CODE[CONFIRM_CODE.index("FROM api_deeds") - 900:
                          CONFIRM_CODE.index("FROM api_deeds")]
    assert "demo_kind" in select


def test_public_verification_refuses_any_demo_row_from_the_deeds_fallback():
    """Closing one door and leaving the other open is not closing it.

    Writing no authenticity row is not sufficient on its own: the verify
    endpoint falls back to `api_deeds`, where the completed demo row
    lives for the three hours before retention reclaims it.
    """
    fallback = ROUTER_CODE[ROUTER_CODE.index("SELECT authenticity_id, document_id"):]
    fallback = fallback[:fallback.index('"""')]
    assert "demo_kind IS NULL" in fallback


def test_the_two_demo_predicates_point_in_opposite_directions_on_purpose():
    """Destroying names what it MAY touch; asserting names what it MAY NOT.

    `DELETE_DEMO_SQL` requires `demo_kind = 'try'` exactly, so an
    unmarked row can never be deleted. The verify fallback requires
    `demo_kind IS NULL`, so a row marked with a kind nobody has written
    yet is refused rather than confirmed. Both fail closed; "closed"
    means something different for each.
    """
    from services.api_confirm_lifecycle import DELETE_DEMO_SQL
    assert "demo_kind = %s" in DELETE_DEMO_SQL
    assert "IS NOT NULL" not in DELETE_DEMO_SQL
    assert "demo_kind IS NULL" in ROUTER_CODE
    # RAW, not code_only — the reconciliation IS the comment, and
    # code_only strips comments. Three pins in this repository have now
    # asserted prose against a stripped file and passed for the wrong
    # reason or failed for one.
    assert flowed(
        "Destroying fails closed by naming what it may touch."
    ) in flowed(ROUTER_RAW)


def test_the_fixture_kind_is_also_refused_by_the_verify_fallback():
    """`IS NULL` is not `<> 'try'`. Both demo kinds are excluded, and so
    is any third one added later without anybody revisiting this."""
    assert DEMO_KIND_TRY != DEMO_KIND_FIXTURE
    assert "demo_kind IS NULL" in ROUTER_CODE
    assert f"demo_kind <> '{DEMO_KIND_TRY}'" not in ROUTER_CODE


def test_an_unmarkable_demo_row_fails_the_request():
    """The marker's cost changed, so its failure direction had to.

    An unmarked demo row used to be a housekeeping miss. It is now a row
    whose approval mints a permanent public claim — so the route refuses
    to hand out a draft it could not mark.
    """
    assert "if not _mark_demo_row(" in TRY_CODE
    assert "def _mark_demo_row(data) -> bool:" in TRY_CODE
    assert "cur.rowcount == 1" in TRY_CODE, (
        "an UPDATE that matched nothing succeeds loudly and marks nothing")


def test_the_audit_deletes_only_what_it_is_NAMED():
    """REWRITTEN after the first real audit (2026-09-23).

    The first version deleted every row matching "demo parcel AND
    orphaned". Wrong shape twice: the predicate is INFERENTIAL, against
    this project's own rule that destroying fails closed by naming what
    it MAY TOUCH — and on the day it was needed it would have removed
    ZERO, because neither row was orphaned yet. A quiet no-op reads as
    "nothing to do".
    """
    code = code_only(
        BACKEND.joinpath("scripts/demo_authenticity_audit.py").read_text())
    assert 'nargs="+", metavar="SHORT_CODE"' in code
    assert "DELETE FROM document_authenticity WHERE short_code = ANY(%s)" in code
    assert "WHERE id = ANY(%s)" not in code, "the inferential delete must be gone"
    refuse = code.index("unknown = wanted - known")
    delete = code.index("DELETE FROM document_authenticity")
    assert refuse < delete, "membership check must precede the DELETE"


def test_the_audit_is_report_only_without_arguments():
    code = code_only(
        BACKEND.joinpath("scripts/demo_authenticity_audit.py").read_text())
    guard = code.index("if not args.delete:")
    delete = code.index("DELETE FROM document_authenticity")
    assert guard < delete, "the default path must return before deleting"


def test_orphaning_is_recorded_as_NOT_reducing_reachability():
    """The fact that decides the sequencing. `verify_document` queries
    `document_authenticity` by short_code FIRST and unconditionally, so
    a demo row answers `valid: true` whether or not its deed row
    survives. Waiting for the sweep removes the corroborating deed and
    nothing else."""
    raw = BACKEND.joinpath("scripts/demo_authenticity_audit.py").read_text()
    assert flowed("Orphaning changes nothing about reachability") in flowed(raw)
    first = ROUTER_CODE.index("FROM document_authenticity")
    fallback = ROUTER_CODE.index("SELECT authenticity_id, document_id")
    assert first < fallback, "the authenticity lookup runs first"


def test_the_closed_population_is_stated_rather_than_implied():
    """No authenticity row is written for a demo approval any more, so
    there is no marker to add and no future rows to reach. A cleanup
    tool that reads as permanent invites someone to widen its predicate
    later."""
    raw = BACKEND.joinpath("scripts/demo_authenticity_audit.py").read_text()
    assert flowed("no authenticity row is inserted for a demo approval any "
                  "more") in flowed(raw)


def test_the_audit_identifies_demo_rows_from_the_payload_not_by_hand():
    """A constant typed beside the sample stops matching when the sample
    moves, and a script that matches nothing reports zero."""
    code = code_only(
        BACKEND.joinpath("scripts/demo_authenticity_audit.py").read_text())
    assert 'SAMPLE_PAYLOAD["property"]["apn"]' in code
    assert "8888-000-001" not in code


# ═══ (2) THE WATERMARK IS DECIDED BY THE ROUTE ═══════════════════════

def test_the_demo_route_forces_the_watermark_regardless_of_the_key():
    """THE PRODUCTION DEFECT.

    The page claims every PDF rendered there is watermarked. The
    mechanism was `api_keys.is_test`, which defaults FALSE and — until
    this ticket — had no update path at all. In production it was falsy
    and the claim was false.
    """
    assert '{**api_key, "is_test": True}' in TRY_CODE
    force = TRY_CODE.index('{**api_key, "is_test": True}')
    call = TRY_CODE.index("await create_deed(")
    assert force < call, "forced before the render, or it does nothing"


def test_the_broader_is_test_rule_survives_the_demo_fix():
    """The 2026-09-21 ruling is untouched: every dp_test_ render is
    watermarked. The demo stopped DEPENDING on it, not replacing it."""
    assert 'is_test=bool(api_key.get("is_test"))' in ROUTER_CODE
    assert "watermark_if_test(" in ROUTER_CODE


def test_the_admin_patch_no_longer_reports_a_field_it_cannot_write():
    """REWRITTEN, not deleted (§14.12). Both rulings are named.

    2026-09-22: `is_test` sat in the `RETURNING` clause among four
    settable fields and was never written — an interface asserting
    something it did not check — so it was made settable.

    2026-09-23: ruling 3 superseded that. The field is gone from the
    signature entirely, and `RETURNING` reporting it is now honest for a
    different reason: it is IMMUTABLE context about the key, not an echo
    of a setting this call could have changed.
    """
    assert 'is_test: Optional[bool] = Body(None, embed=True)' not in ADMIN_CODE
    assert "RETURNING id, key_prefix, name, is_active, is_test" in ADMIN_CODE


def test_nothing_can_turn_a_key_from_one_class_to_the_other():
    """REWRITTEN. The 2026-09-22 version pinned an ASYMMETRY — `dp_test_`
    → live refused, `dp_live_` → test allowed as "harmless".

    Ruling 3 retired the asymmetry on the owner's own reasoning: the
    prefix is the only thing a human reads, so a `dp_live_` key behaving
    as a test key is *also* a prefix that lies. Both directions are now
    unreachable because the field does not exist.
    """
    import inspect
    from routers.admin_api_v2 import update_api_key
    assert "is_test" not in set(inspect.signature(update_api_key).parameters)
    assert 'updates.append("is_test = %s")' not in ADMIN_CODE
    assert 'startswith("dp_test_")' not in ADMIN_CODE


def test_the_conflict_is_resolved_rather_than_still_held():
    """A flag left standing after its ruling arrives is the §14.33 shape
    — a record falsified by the event it describes."""
    raw = BACKEND.joinpath("routers/admin_api_v2.py").read_text()
    assert "HELD: THIS FIELD AND THE CREATION INVARIANT" not in raw
    assert flowed("Ruling 2 of 2026-09-23 is SUPERSEDED BY RULING 3") in flowed(raw)
    assert flowed("Recorded rather than deleted") in flowed(raw)
    assert flowed("A key's class is fixed at creation and a key of the "
                  "wrong class is recreated, not edited") in flowed(raw)


# ═══ (3) THE TAMPER PRESENTS AN ACTUAL TAMPER ════════════════════════

def test_the_second_draft_differs_in_a_figure_that_prints():
    """Draft B was the identical payload. WeasyPrint renders identical
    HTML to identical bytes, so the hashes matched and DRAFT_MISMATCH
    was unreachable — the guard was never shown a tamper."""
    a = _build(None, "Prospect")
    b = _build(None, "Prospect", "second_draft")
    assert a != b
    assert a["transfer_tax"]["value"] != b["transfer_tax"]["value"]
    assert a["transfer_tax"]["computed_amount"] != b["transfer_tax"]["computed_amount"]
    # Everything else is the same deed: same parties, same parcel.
    assert a["grantor"] == b["grantor"]
    assert a["grantee"] == b["grantee"]
    assert a["property"] == b["property"]


def test_the_second_draft_amount_is_derived_from_the_rate_table():
    """Never typed beside the value. The same derivation reproduces the
    sample's own figure, so this is the arithmetic the deed already
    relies on rather than a number that happens to agree today."""
    city = SAMPLE_PAYLOAD["property"]["city"]
    sample_derived = compute_dtt(SAMPLE_PAYLOAD["transfer_tax"]["value"], city)
    assert f"{sample_derived['total_tax']:.2f}" == \
        SAMPLE_PAYLOAD["transfer_tax"]["computed_amount"]

    b = _build(None, "Prospect", "second_draft")
    expected = compute_dtt(SECOND_DRAFT_VALUE, city)
    assert b["transfer_tax"]["computed_amount"] == f"{expected['total_tax']:.2f}"


def test_the_variant_is_not_a_trap():
    """A trap produces a 422. A second draft has to be a valid deed, or
    there is nothing to confirm."""
    assert set(VARIANTS) & set(TRAPS) == set()
    from schemas.api_v1.deeds import CreateDeedRequest
    payload = _build(None, "Prospect", "second_draft")
    CreateDeedRequest(**payload)  # raises if the variant broke validity


def test_an_unknown_variant_is_refused_rather_than_ignored():
    assert "Unknown variant. Known:" in TRY_RAW

# The Act-3 PAGE assertions live in `frontend/src/__tests__/tryPage.test.ts`,
# where `codeOnly` is the TypeScript comment stripper. A first draft of
# them sat here and used Python's `code_only`, which leaves `/* */`
# untouched — so a ban on a typed status code failed on the comment
# explaining why it was banned. Same §14.1 shape as asserting prose
# against a comment-stripped file: the tool has to own the language.


# ═══ (4) THE KEY CLASS — prefix and is_test cannot disagree ══════════
#
# Owner-ruled 2026-09-23, after the console minted `dp_live_…` for a key
# the owner had named `dp_test_`. The prefix is the only thing a human
# reads; a key whose prefix lies about its class is the defect underneath
# the whole watermark investigation.

def test_the_key_class_invariant_is_asserted_where_the_row_is_written():
    from utils.api_keys import KeyClassMismatch, assert_key_class

    assert_key_class("dp_test_abc123def456", True)
    assert_key_class("dp_live_abc123def456", False)
    for prefix, flag in (("dp_test_abc123def456", False),
                         ("dp_live_abc123def456", True)):
        try:
            assert_key_class(prefix, flag)
        except KeyClassMismatch:
            continue
        raise AssertionError(f"{prefix} with is_test={flag} was not refused")


def test_generated_keys_cannot_disagree_with_themselves():
    """Both halves come from one argument, and the function says so."""
    from utils.api_keys import generate_api_key, key_class_of
    for is_test in (True, False):
        _full, prefix, _hash = generate_api_key(is_test=is_test)
        assert key_class_of(prefix) is is_test


def test_creation_asserts_the_invariant_rather_than_trusting_it():
    assert "assert_key_class(key_prefix, is_test)" in ADMIN_CODE
    assert_at = ADMIN_CODE.index("assert_key_class(key_prefix, is_test)")
    insert_at = ADMIN_CODE.index("INSERT INTO api_keys")
    assert assert_at < insert_at, "asserted BEFORE the row is written"


def test_a_name_may_not_assert_a_class_the_checkbox_contradicts():
    """What actually happened: the class went into the field the eye
    lands on first, and the control that decides sat unticked below it.

    A form accepting a value that implies a class it will not produce is
    the third instance of this shape in one investigation — after the
    hardcoded `409` and the PATCH echoing `is_test` without writing it.
    """
    assert "The name says" in ADMIN_CODE
    assert "The 'Test key' checkbox decides the class" in ADMIN_CODE


def test_only_a_disagreement_is_refused():
    """A name that says nothing about the class is none of this
    endpoint's business, and a refusal that fires on an ordinary partner
    name would be worse than the defect."""
    assert "if claimed is not None and claimed != bool(is_test):" in ADMIN_CODE


# ═══ (5) THE USAGE DISPLAY THAT READ AS COMPLETE ═════════════════════

def test_deeds_created_survives_the_retention_that_empties_deed_count():
    """`deed_count` counts rows we STILL HOLD. `/try`'s are reclaimed
    after three hours, so a key serving the public demo settles back to
    0 while having rendered hundreds — the console read that as "this
    key has never made a deed"."""
    assert "as deeds_created" in ADMIN_CODE
    created = ADMIN_CODE[ADMIN_CODE.index("as deeds_created") - 400:
                         ADMIN_CODE.index("as deeds_created")]
    assert "api_usage_log" in created, "counted from the log, not the rows"
    assert "status_code = 200" in created


def test_the_demo_route_does_increment_the_usage_log():
    """The report's discriminating fact. `/try/deed` calls the real
    `create_deed`, which logs before it commits, under a SAVEPOINT — so
    a key `/try` has served CANNOT read zero requests. A key that does
    has never authenticated, whatever else is true of it."""
    success = ROUTER_CODE.index(
        '_log_usage(cursor, api_key["id"], "/api/v1/deeds", "POST", 200')
    commit = ROUTER_CODE.index("conn.commit()", success)
    assert commit > success
    assert "DELETE FROM api_usage_log" not in ROUTER_CODE
