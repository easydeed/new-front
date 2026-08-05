"""Doctrine A — the split, pinned on the property rather than the spelling.

Three kinds of test live here, and the order is the argument:

  1. THE CORPUS. `services/vesting_cases.json` is the authority for what
     the split does. The TypeScript twin reads the same file and asserts
     the same answers, so a change made in one language and not the other
     fails in the language that did not change.

  2. THE POSITION. Not "does the function return the right tuple" but
     "can a characterization reach a fact position by ANY path we ship".
     That question is asked of the actual import outputs, because the
     defect RED0 found was never in a function — it was in where a value
     landed.

  3. THE MIRROR. The two marker lists are compared character for
     character. This one guards a spelling, which is why it is third and
     not first.
"""
import json
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

import pytest

from services.vesting_split import (  # noqa: E402
    CASES_PATH, MARKERS, as_candidates, split_vested_owner,
)
from tests.source_text import code_only  # noqa: E402

CASES = json.loads(Path(CASES_PATH).read_text(encoding="utf-8"))["cases"]
REPO = BACKEND.parent


def _ids():
    return [c["input"][:48] or "<empty>" for c in CASES]


# ── 1. The corpus ──────────────────────────────────────────────────────

@pytest.mark.parametrize("case", CASES, ids=_ids())
def test_the_corpus(case):
    """Every case, exactly as written. `why` is on each row so a failure
    reads as a broken rule rather than a broken assertion."""
    got = split_vested_owner(case["input"])

    if case.get("absent"):
        assert got is None, case["why"]
        assert as_candidates(case["input"], "prelim") == {}, case["why"]
        return

    assert got is not None, case["why"]
    assert got.verbatim == case["verbatim"], case["why"]
    assert got.parties == case["parties"], case["why"]
    assert got.characterization == case["characterization"], case["why"]
    assert got.mixed_content == case["mixed_content"], case["why"]
    assert got.needs_review == case["needs_review"], case["why"]


def test_the_corpus_is_not_empty_and_covers_both_outcomes():
    """A corpus that quietly lost its hard cases would pass everything.

    The two that matter are the ones where NOTHING becomes a fact: a
    characterization with no name, and a name buried between markers.
    """
    assert len(CASES) >= 12
    assert any(c.get("needs_review") for c in CASES)
    assert any(c.get("needs_review") and c.get("characterization") is None
               for c in CASES), "the buried-name case must stay in the corpus"
    assert any(c.get("absent") for c in CASES)
    assert any(not c.get("absent") and not c["mixed_content"] for c in CASES), \
        "a bare name must stay in the corpus — the split must not disturb it"


# ── 2. The position ────────────────────────────────────────────────────

MARKER_RX = re.compile(
    r"\b(?:" + "|".join(f"(?:{m})" for m in MARKERS) + r")\b", re.IGNORECASE)


def _fact_values(payload):
    """Every string in `payload` that occupies a FACT position."""
    values = []
    owner = payload.get("owner")
    if isinstance(owner, dict):
        values.append(owner["value"])
    for c in payload.get("candidates", []) or []:
        values.append(c["value"])
    return values


@pytest.mark.parametrize("case", [c for c in CASES if not c.get("absent")],
                         ids=[c["input"][:48] for c in CASES if not c.get("absent")])
@pytest.mark.parametrize("source", ["prelim", "sitex"])
def test_no_characterization_ever_reaches_a_fact_position(case, source):
    """THE property. Not "the splitter splits" — "nothing we emit as a
    fact contains a legal characterization", asked of every case and both
    sources."""
    payload = as_candidates(case["input"], source)
    for value in _fact_values(payload):
        assert not MARKER_RX.search(value), (
            f"{value!r} occupies a fact position and contains a "
            f"characterization — {case['why']}")


@pytest.mark.parametrize("case", [c for c in CASES if not c.get("absent")],
                         ids=[c["input"][:48] for c in CASES if not c.get("absent")])
def test_a_proposal_is_never_a_candidate(case):
    """A legal choice is never auto-applied and never sits in candidate
    state inside the deed (doctrine §1). 'proposed' is a different word
    on purpose: code that treats candidates as confirmable-by-the-gate
    must not sweep this up."""
    proposal = as_candidates(case["input"], "prelim").get("vesting_proposal")
    if proposal:
        assert proposal["status"] == "proposed"
        assert proposal["status"] != "candidate"
        assert proposal.get("basis"), "§2.3 — a proposal names whose reading it is"


def test_the_basis_says_whose_reading_it_is_and_which_question_it_answers():
    """Two things the officer cannot see from the value alone: where it
    came from, and that it describes TODAY's title rather than the deed
    she is drafting."""
    prelim = as_candidates(
        "JOHN DOE, A SINGLE MAN", "prelim")["vesting_proposal"]["basis"]
    sitex = as_candidates(
        "JOHN DOE, A SINGLE MAN", "sitex")["vesting_proposal"]["basis"]
    assert "preliminary title report" in prelim
    assert "county record" in sitex
    assert prelim != sitex, "the claimant is part of the claim"
    for basis in (prelim, sitex):
        assert "CURRENT owner" in basis
        assert "your decision" in basis


def test_an_unsplittable_string_offers_nothing_and_says_so():
    payload = as_candidates(
        "JOHN DOE, AN UNMARRIED MAN AND MARY ROE, A SINGLE WOMAN, "
        "AS TENANTS IN COMMON", "prelim")
    assert "owner" not in payload, "a name we could not extract is not a fact"
    assert "vesting_proposal" not in payload, \
        "and a characterization we could not isolate is not a proposal"
    assert payload["mixed_content"] is True
    assert payload["verbatim"], "the original survives for audit"
    assert "yourself" in payload["needs_review"]


def test_the_verbatim_is_carried_but_is_not_offered_as_a_value():
    payload = as_candidates(
        "JOHN A. DOE AND JANE B. DOE, HUSBAND AND WIFE AS JOINT TENANTS",
        "prelim")
    assert payload["verbatim"] == (
        "JOHN A. DOE AND JANE B. DOE, HUSBAND AND WIFE AS JOINT TENANTS")
    # It is a bare string, not a Sourced/candidate shape. Nothing in the
    # confirmation model can pick it up and offer it for confirmation,
    # because it does not have the shape of something confirmable.
    assert isinstance(payload["verbatim"], str)
    assert payload["owner"]["value"] == "JOHN A. DOE AND JANE B. DOE"


# ── 3. The mirror ──────────────────────────────────────────────────────

TWIN = REPO / "frontend" / "src" / "lib" / "vestingSplit.ts"


def test_the_typescript_twin_carries_the_same_markers():
    """Character for character. The corpus is what actually holds the two
    implementations together — this is the cheaper failure to read."""
    src = code_only(TWIN.read_text(encoding="utf-8"))
    block = src[src.index("MARKERS"):src.index("];", src.index("MARKERS"))]
    ts_markers = re.findall(r"'([^']*)'", block)
    assert ts_markers == MARKERS, (
        "the marker lists have diverged — backend-only="
        f"{[m for m in MARKERS if m not in ts_markers]} frontend-only="
        f"{[m for m in ts_markers if m not in MARKERS]}")


def test_the_twin_reads_the_same_corpus():
    """A twin with its own private fixture list would pass on cases the
    Python side never sees, which is the drift the corpus exists to stop."""
    spec = (REPO / "frontend" / "src" / "__tests__" / "vestingSplit.test.ts")
    src = spec.read_text(encoding="utf-8")
    assert "vesting_cases.json" in src
    assert "'backend'" in src or '"backend"' in src
