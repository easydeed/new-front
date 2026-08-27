"""PCOR-WIZ step 1 — the allowlist that makes everything downstream survivable.

═══ WHAT IS AND IS NOT ASSERTED HERE ═══

Nothing in this file tests a wizard, because there is no wizard. This is
the filter, shipped before any surface exists so there is no window in
which the data path is complete and the filter is not.

The property under test is one sentence: **a buyer is never shown a Part 1
reassessment exclusion.** Everything below is that sentence, checked from
a different side each time.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from services.pcor_field_split import (
    FILLED_FROM_DEED,
    OFFICER_ONLY,
    buyer_answerable,
    is_officer_only,
)
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
REFERENCE = BACKEND / "forms" / "county" / "ca" / "los_angeles" / "boe502a_rev18.pdf"

# ═══ THE EXTRACTION FLOOR ════════════════════════════════════════════
#
# Every count below is a MEASUREMENT of the hash-pinned reference, taken
# 2026-08-26. They are written down so that a change in the form, in
# pypdf, or in how we walk the field tree FAILS rather than silently
# re-baselining — §14.4's subject, and the reason the eslint gate has a
# file floor.
#
# A widget count that drifts down is the dangerous direction: fewer
# extracted fields means the allowlist covers a smaller share of the form
# than it claims, and every uncovered field defaults to the buyer.
TOTAL_ENTRIES = 228          # AcroForm entries including parent nodes
TOTAL_WIDGETS = 177          # actual inputs
TEXT_WIDGETS = 65
BUTTON_WIDGETS = 112


def _all_fields():
    pypdf = pytest.importorskip("pypdf")
    reader = pypdf.PdfReader(str(REFERENCE))
    return reader.get_fields()


def test_the_reference_still_yields_what_was_measured():
    """THE FLOOR. If this fails, every count in the ledger entry and every
    membership below describes a document we are no longer reading."""
    fields = _all_fields()
    assert len(fields) == TOTAL_ENTRIES, (
        f"the reference PDF yielded {len(fields)} AcroForm entries, not "
        f"{TOTAL_ENTRIES}. The split was measured against a specific "
        f"revision; re-measure before trusting anything else in this file.")

    widgets = {k: str(v.get("/FT")) for k, v in fields.items()
               if str(v.get("/FT")) in ("/Tx", "/Btn")}
    assert len(widgets) == TOTAL_WIDGETS
    assert sum(1 for t in widgets.values() if t == "/Tx") == TEXT_WIDGETS
    assert sum(1 for t in widgets.values() if t == "/Btn") == BUTTON_WIDGETS


def test_every_allowlisted_name_actually_exists_in_the_form():
    """THE PIN THAT CATCHES A TYPED NAME, and it is the one this file
    exists for.

    Two of the 57 names carry characters invisible in an editor — item A's
    yes box has U+00AD SOFT HYPHEN, item J's no box has U+2011
    NON-BREAKING HYPHEN. Both look like ordinary hyphens.

    **A name that matches nothing protects nothing**, and it does so
    silently: the allowlist still has 57 entries, the file still reads as
    complete, and the field it was meant to withhold flows to the buyer.
    Only comparing against the real document can tell the two apart.
    """
    actual = set(_all_fields())
    missing = sorted(OFFICER_ONLY - actual)
    assert not missing, (
        f"{len(missing)} allowlisted name(s) match no field in the "
        f"reference — they are protecting nothing:\n  " +
        "\n  ".join(repr(m) for m in missing))


def test_every_filled_name_actually_exists_too():
    actual = set(_all_fields())
    assert not sorted(FILLED_FROM_DEED - actual)


def test_the_three_buckets_partition_the_form_exactly():
    """No field belongs to two buckets, and none belongs to none.

    The second half is the one that matters: an unplaced field is not
    inert. `buyer_answerable` derives by subtraction, so anything nobody
    classified would reach a consumer if it were not for this assertion
    plus the subtraction default.
    """
    fields = _all_fields()
    widgets = {k for k, v in fields.items()
               if str(v.get("/FT")) in ("/Tx", "/Btn")}

    assert not (OFFICER_ONLY & FILLED_FROM_DEED), "a field cannot be both"

    buyer = buyer_answerable(widgets)
    assert len(OFFICER_ONLY & widgets) == 57
    assert len(FILLED_FROM_DEED & widgets) == 9
    assert len(buyer) == 111
    assert len(OFFICER_ONLY & widgets) + len(FILLED_FROM_DEED & widgets) \
        + len(buyer) == TOTAL_WIDGETS


# ═══ THE PROPERTY, FROM THE OTHER SIDE ═══════════════════════════════
#
# The pattern below is NOT the mechanism — the whole ruling is that a
# pattern cannot be trusted to classify these fields. It is a TRIPWIRE:
# untrustworthy as a classifier, useful as an alarm. If something that
# reads like a Part 1 exclusion turns up in the buyer's set, the form
# changed and somebody must look.
PART1_SHAPE = re.compile(
    r"(This transfer is|This transaction is|This is a transfer|"
    r"The recorded document (creates|substitutes)|"
    r"This property is subject to a lease)", re.I)


def test_nothing_shaped_like_an_exclusion_reaches_the_buyer():
    fields = _all_fields()
    widgets = {k for k, v in fields.items()
               if str(v.get("/FT")) in ("/Tx", "/Btn")}
    leaked = sorted(f for f in buyer_answerable(widgets) if PART1_SHAPE.search(f))
    assert not leaked, (
        "a field reading like a Part 1 legal characterization is in the "
        "buyer's set:\n  " + "\n  ".join(repr(x) for x in leaked))


def test_the_unlettered_part_one_widgets_are_held():
    """The five that any prefix rule would miss — L1's three sub-checkboxes,
    item J's explanation, and Q's free text. Named individually because they
    are the specific reason this file rejects a pattern, and a regression
    here is the one that would look most like working code.

    ITEM J'S WAS FOUND BY THE TRIPWIRE BELOW, not by enumeration: it has no
    letter AND a county typo ("recorded only a requirement"), so it survived
    a careful manual pass. That is the argument for keeping a pattern we do
    not trust to classify — as an alarm it caught what the decision missed.
    """
    for name in [
        "This is a transfer of property 1. to/from a revocable trust that "
        "may be revoked by the transferor and is for the benefit of the "
        "transferor, and/or",
        "This is a transfer of property 1. to/from a revocable trust that "
        "may be revoked by the transferor and is for the benefit of the "
        "transferor's spouse",
        "This is a transfer of property 1. to/from a revocable trust that "
        "may be revoked by the transferor and is for the benefit of "
        "register domestic partner",
        "Q. Other. his transfer is to",
        "This transaction is recorded only a requirement for financing "
        "purposes or to create, terminate, or reconvey a security interest "
        "(e.g. cosigner).  If yes, please explain",
    ]:
        assert is_officer_only(name), name


def test_a_lettered_name_is_not_enough_to_be_withheld():
    """The mirror, and it is why a prefix rule fails in BOTH directions.

    These carry Part 1 letters and are Part 2/3 facts. If the module ever
    starts matching on the letter, they get swept into the officer's pile
    and the buyer is asked nothing at all — a quieter failure than the
    other direction, and still a failure.
    """
    for name in ("A. Type of property transferred Condominium",
                 "B. Type of transfer purchase",
                 "C. First deed of trust FHA",
                 "D. Second deed of trust amount"):
        assert not is_officer_only(name), name


def test_the_transfer_date_is_withheld_and_its_neighbour_is_not():
    """OWNER-RULED, and the pair is the point. Both are Part 2 item A's
    territory; only one is a claim.

    `A. Date of transfer, if other than recording date` goes to the officer
    because the buyer cannot decline it — filling it claims the transfer
    date differs from the recording date, leaving it blank claims they
    match, and one of those moves a tax year. Compare the deed-side
    `transfer_date`, ruled blank because we cannot know when an unsigned
    deed was executed: **there blank is an omission; here blank is an
    assertion.**
    """
    assert is_officer_only("A. Date of transfer, if other than recording date")
    assert not is_officer_only("A. Type of property transferred other. Description")


def test_the_personal_property_pair_stays_with_the_buyer_TOGETHER():
    """OWNER-RULED. Two boxes on ONE ROW of Part 3 — measured at page 2,
    both at y between 247 and 260, at x=330 and x=485. Value, and
    incentives.

    A classifier sorted them into opposite buckets on the strength of a
    slash in their names (§14.15). They are ruled together: buyer-
    answerable, because it is their furniture and they are the only ones
    who know, and removing the question removes the DISCLOSURE rather than
    the incentive — the form's own instructions already require an
    itemized list before any adjustment.

    Pinned as a pair so a future edit cannot move one without the other.
    """
    pair = ("B. if yes, enter the value of the personal/business property",
            "B. if yes, enter the value of the personal business property "
            "incentives_1")
    for name in pair:
        assert not is_officer_only(name), name


# ═══ THE ALLOWLIST IS DECLARED, NOT DERIVED ══════════════════════════

def test_the_module_contains_no_classifier():
    """A set computed from a pattern would agree with itself no matter what
    the pattern became — the same reason NOTARY2's surfaces write their key
    sets down. This asserts the module does not import `re` or build the
    allowlist from anything.
    """
    src = code_only(BACKEND.joinpath("services/pcor_field_split.py").read_text())
    assert "import re" not in src, (
        "the split must not be pattern-derived — the whole ruling is that "
        "a pattern misclassifies these fields in both directions")
    assert "startswith" not in src
    assert "OFFICER_ONLY: FrozenSet[str] = frozenset({" in src


def test_matching_is_exact_and_not_normalised():
    """Case-folding or hyphen-normalising would defeat the point: the
    allowlist's value is that it matches the PDF's BYTES, not something
    that looks like them. The soft hyphen in item A is the test case."""
    real = ("A. This transfer is solely between spouses (addition or removal "
            "of a spouse, death of a spouse, divorce settlement, etc.)\xadyes")
    assert is_officer_only(real)
    # The same string with an ordinary hyphen is a DIFFERENT field name and
    # must not match — if it did, the allowlist would be matching shapes.
    assert not is_officer_only(real.replace("\xad", "-"))
