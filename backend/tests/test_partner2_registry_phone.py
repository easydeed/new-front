"""PARTNER2 — one phone rule in two languages, refereed by a corpus.

The normalization rule exists in Python (`services/phone.py`, so the
column's shape is a property of storage rather than of which client wrote
the row) and in TypeScript (`lib/phone.ts`, so she sees her number
formatted as she types it). Two implementations of one rule is exactly
the divergence this ticket is deleting elsewhere, so it gets the Doctrine
A treatment: a shared corpus both suites read, with the corpus as referee
rather than either implementation.

`frontend/src/__tests__/partnerRegistry.test.ts` reads the same file.
"""
import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from services.phone import format_phone, normalize_phone, phone_search_key  # noqa: E402

CASES = json.loads((BACKEND / "services" / "phone_cases.json").read_text())["cases"]


def test_the_corpus_is_not_empty_and_covers_the_awkward_shapes():
    """A corpus of only happy cases proves an implementation agrees with
    itself. The ones that matter are the ones where the rule declines to
    act — an extension, an international number, a note."""
    assert len(CASES) >= 10
    reasons = " ".join(c["why"] for c in CASES).lower()
    for shape in ("extension", "international", "idempotent", "empty"):
        assert shape in reasons, f"the corpus does not exercise the {shape} case"


def test_every_case_normalizes_as_the_corpus_says():
    for case in CASES:
        assert normalize_phone(case["input"]) == case["stored"], case["why"]


def test_every_case_displays_as_the_corpus_says():
    for case in CASES:
        assert format_phone(case["stored"]) == case["display"], case["why"]


def test_normalizing_is_idempotent():
    """An update round-trips a stored value, so a second pass must be a
    no-op. A rule that is not idempotent turns `+16265550134` into
    something else the second time somebody saves the row."""
    for case in CASES:
        once = normalize_phone(case["input"])
        assert normalize_phone(once) == once, case["why"]


def test_unparseable_input_survives_verbatim():
    """We do not discard what we cannot parse.

    An officer typing an extension, a UK number, or a note to herself has
    recorded information. Dropping it to keep a column tidy would be the
    product deciding it knows better than the person using it — and the
    loss would be silent, which is the part §4 objects to.
    """
    for raw in ("ask for Dana", "+44 20 7946 0958", "(626) 555-0134 x220"):
        assert normalize_phone(raw) == raw.strip()


def test_search_finds_the_same_row_however_either_side_was_typed():
    """The defect this closes: `partners.phone` was free text and the
    partners screen matched it as a substring, so a row saved as
    "626-555-0134" was invisible to somebody typing "(626) 555"."""
    stored = normalize_phone("626-555-0134")
    assert phone_search_key("(626) 555") in phone_search_key(stored)
    assert phone_search_key("6265550134") == phone_search_key(stored)


def test_the_write_path_normalizes_regardless_of_client():
    """The reason this exists in Python at all. Every UI surface
    normalizes before posting; the API does not have to."""
    from services.partners import normalize_partner_fields
    assert normalize_partner_fields({"phone": "626.555.0134"})["phone"] == "+16265550134"


def test_a_key_that_is_absent_stays_absent():
    """`update_partner` builds its SET clause from which keys exist, so
    inventing `phone` here would blank a column the caller never
    mentioned. PARTNER1's rule, and the phone step must respect it."""
    from services.partners import normalize_partner_fields
    assert "phone" not in normalize_partner_fields({"city": "Los Angeles"})


def test_a_blank_phone_becomes_null_not_plus_one():
    from services.partners import normalize_partner_fields
    assert normalize_partner_fields({"phone": "   "})["phone"] is None
