"""The hero number, and why counting one population would have lied.

═══ THE FINDING THAT CHANGED THE NUMBER ═══

The mockup's hero figure is "N fields still need your eyes, across M
documents" — the product's own promise made countable. Built from
unconfirmed candidates alone it would report ZERO for a draft where the
officer typed an address and left, because a field with no value has
nothing to confirm, and its largest values would come from drafts one
click from done.

Inverted, in the most prominent slot on the page. Owner ruling: change
the number to match the promise, not the wording to match the data.
"""
from pathlib import Path

import pytest

from services import deed_accuracy as acc
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]

CONFIRMED = {"source": "sitex", "confirmed_at": "2026-08-01T00:00:00Z"}
#: Every material field vouched for, so a test can vary ONE of them.
#: Leaving the others unstamped made the first draft of this suite fail
#: on fields it was not testing — an unstamped present value IS a
#: candidate, which is the browser's own backfill rule.
ALL_CONFIRMED = {k: CONFIRMED for k in
                 ("apn", "legalDescription", "owner", "grantor")}
CANDIDATE = {"source": "sitex", "confirmed_at": None}
TYPED_LEGACY = {"source": "user", "confirmed_at": None}


def deed(**over):
    row = {"deed_type": "grant-deed", "grantor_name": "JANE ROE",
           "grantee_name": "JOHN DOE", "legal_description": "LOT 3",
           "apn": "1111-222-333", "current_owner": "ROE, JANE",
           "vesting": "a single woman", "dtt": {"basis": "full_value"}}
    row.update(over)
    return row


# ── The empty draft: the case that made the first design wrong ───────

def test_a_barely_started_draft_reports_a_LARGE_number_not_zero():
    """THE PIN THIS FILE EXISTS FOR.

    She typed an address and left. Nothing is confirmed and nothing is
    unconfirmed — there are no values to confirm — so a candidates-only
    count says zero, and the number she checks first would tell her the
    document furthest from ready needs nothing.
    """
    started = {"deed_type": "grant-deed", "property_address": "123 Baseline St"}
    items = acc.outstanding(started, provenance=None)
    assert len(items) >= 4, items
    assert {i["field"] for i in items} >= {"grantor", "grantee",
                                           "legal_description", "dtt"}


def test_a_nearly_finished_draft_reports_a_SMALL_number():
    """The other end of the inversion. One unconfirmed APN and nothing
    else outstanding."""
    items = acc.outstanding(deed(), provenance={**ALL_CONFIRMED,
                                                "apn": CANDIDATE})
    assert [i["field"] for i in items] == ["apn"]


# ── The derivation rule, exactly as ruled ────────────────────────────

def test_a_confirmed_field_is_not_counted():
    assert acc.unconfirmed(ALL_CONFIRMED, deed()) == []


def test_an_unconfirmed_county_value_is_counted():
    out = acc.unconfirmed({**ALL_CONFIRMED, "apn": CANDIDATE}, deed())
    assert [i["field"] for i in out] == ["apn"]


def test_a_field_she_typed_is_already_confirmed_even_with_no_timestamp():
    """The backfill branch. A grantor stamped before provenance existed
    persists as `{'user', null}` and the browser treats it as confirmed
    on entry — asking her to re-confirm her own typing would be the
    product forgetting an answer she gave."""
    assert acc.unconfirmed({**ALL_CONFIRMED, "grantor": TYPED_LEGACY}, deed()) == []


def test_a_stamp_for_a_field_the_row_does_not_hold_is_not_counted():
    """A provenance entry without a value is not a thing to confirm —
    the same rule the browser gate applies to empty fields (U0)."""
    row = deed(apn="")
    assert acc.unconfirmed({**ALL_CONFIRMED, "apn": CANDIDATE}, row) == []


# ── Required-and-empty comes from the corpus, not a second list ──────

def test_the_required_half_reads_the_shared_corpus():
    """REQUIRED1's whole point. A second definition of "required" here
    would be the disease that ticket cured, one screen further out."""
    src = code_only((BACKEND / "services" / "deed_accuracy.py")
                    .read_text(encoding="utf-8"))
    assert "from services.required_fields import missing as missing_required" in src
    # And nothing local re-states what a deed needs.
    assert "grantee_name" not in src.replace('"grantor_name"', "")


def test_an_undeclared_transfer_tax_is_outstanding():
    items = acc.outstanding(deed(dtt=None), provenance={})
    assert "dtt" in {i["field"] for i in items}


def test_a_fixed_vesting_form_is_not_asked_for_a_vesting():
    """Flag-3 travels with the corpus, so the count inherits it."""
    row = deed(deed_type="grant-deed-jt", vesting="")
    assert "vesting" not in {i["field"] for i in acc.outstanding(row, {})}


# ── The disagreement: a fact, not a guess ────────────────────────────

def test_a_reordered_name_is_not_a_disagreement():
    """County records write `SMITH, JANE`; she types `JANE SMITH`.
    Comparing strings would flag every deed in the product, and a warning
    that always fires is one nobody reads."""
    assert acc.names_disagree(deed(grantor_name="JANE ROE",
                                   current_owner="ROE, JANE")) is None


def test_a_different_middle_name_IS_a_disagreement():
    """The mockup's own example, and the one worth stopping for: a deed
    rejects over exactly this."""
    found = acc.names_disagree(deed(grantor_name="MARIA L. RUIZ",
                                    current_owner="RUIZ, MARIA LUCIA"))
    assert found is not None
    assert found["typed"] == "MARIA L. RUIZ"
    assert found["record"] == "RUIZ, MARIA LUCIA"


def test_it_never_says_which_name_is_right():
    """§0. Both are legitimate — the record may be stale, she may be
    conveying from a name it does not carry, or one is a typo. A rule
    that picked would invent an answer about a person's identity on a
    recorded instrument."""
    found = acc.names_disagree(deed(grantor_name="MARIA L. RUIZ",
                                    current_owner="RUIZ, MARIA LUCIA"))
    text = " ".join(str(v) for v in found.values()).lower()
    for claim in ("should be", "correct", "incorrect", "wrong", "instead"):
        assert claim not in text


def test_a_missing_side_is_not_a_disagreement():
    """Nothing to compare. An absent county owner is a gap in the record
    (`OWNER_ABSENT_FROM_RECORD`), not a conflict with her typing."""
    assert acc.names_disagree(deed(current_owner="")) is None
    assert acc.names_disagree(deed(grantor_name="")) is None


def test_it_does_not_describe_a_document_the_product_has_never_held():
    """The mockup said "escrow instructions say X". The product has never
    ingested an escrow instruction — zero occurrences in the codebase —
    so that sentence would have named a source it does not hold."""
    src = (BACKEND / "services" / "deed_accuracy.py").read_text(encoding="utf-8")
    body = code_only(src)
    assert "escrow instruction" not in body.lower()


def test_an_unstamped_grantor_she_typed_is_not_re_asked():
    """MIRRORS the browser's `grantorFieldProvenance`. An unstamped
    grantor only predates stamping: equal to the county owner it arrived
    by prefill and is a candidate; anything else she typed, and typing is
    confirming. The two languages must agree, or the dashboard counts a
    field the builder shows as settled."""
    prov = {k: CONFIRMED for k in ("apn", "legalDescription", "owner")}
    typed = deed(grantor_name="JANE ROE", current_owner="SOMEBODY ELSE")
    assert acc.unconfirmed(prov, typed) == []

    prefilled = deed(grantor_name="ROE, JANE", current_owner="ROE, JANE")
    assert [i["field"] for i in acc.unconfirmed(prov, prefilled)] == ["grantor"]
