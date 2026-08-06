"""Doctrine B — the forbidden questions, asked.

The boundary is EXPLAIN YES, SELECT NO. A test suite for it has to do
something a unit test normally does not: ask the questions an escrow
officer actually types when she is unsure which document to draw, and
check what comes back.

It cannot call OpenAI in CI — a test that depends on a model's mood is a
test that fails on Tuesdays. So the corpus in
`services/ai_boundary_cases.json` holds the questions paired with the
answers a model gives, labelled compliant or violating, and the suite
asserts three things of every compliant one:

    EXPLANATION PRESENT   she learned how the instruments differ
    SELECTION ABSENT      nothing told her which to use
    DEFERRAL PRESENT      the answer says the choice is hers

and one thing of every violating one: the scanner catches it.

That corpus is honest reconstruction today and observation later — when
`ai_exchange_log` has real exchanges in it, they get appended and the
scanner is measured against what officers really asked. The trigger is
ledgered (OWNER_LEDGER: ~100 exchanges or first design-partner month).
"""
import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

import pytest

from services import ai_boundary, ai_prompts  # noqa: E402
from tests.source_text import code_only  # noqa: E402

_CORPUS = json.loads(Path(ai_boundary.CASES_PATH).read_text(encoding="utf-8"))
CASES = _CORPUS["cases"]
PROBES = _CORPUS["probes"]

VIOLATING = [c for c in CASES if c["flagged"]]
COMPLIANT = [c for c in CASES if not c["flagged"]]


def _ids(cases):
    return [c["question"][:44] + " | " + c["response"][:28] for c in cases]


# ── 1. The transcript: the forbidden questions, asked ────────────────

@pytest.mark.parametrize("case", VIOLATING, ids=_ids(VIOLATING))
def test_selection_language_is_caught(case):
    """The violating half. Each of these is an answer that took the
    decision out of the officer's hands."""
    flags = ai_boundary.scan(case["response"])
    assert flags, f"MISSED a selection: {case['response']!r} — {case['why']}"
    for f in flags:
        assert f.cue and f.instrument and f.excerpt


@pytest.mark.parametrize("case", COMPLIANT, ids=_ids(COMPLIANT))
def test_explanation_is_not_mistaken_for_selection(case):
    """The compliant half, and the harder one. A scanner that flagged
    these would be worse than none: the log fills with noise, nobody
    reads it, and the real violation sits in the middle of it."""
    flags = ai_boundary.scan(case["response"])
    assert flags == [], (
        f"FALSE POSITIVE on compliant text: "
        f"{[f.excerpt for f in flags]} — {case['why']}")


def test_the_corpus_asks_the_question_that_matters_more_than_once():
    """'Which deed should I use?' is THE question. It appears with a
    violating answer and a compliant one, because the difference between
    them is the whole ruling and a corpus that showed only one side
    would be arguing rather than testing."""
    questions = [c["question"] for c in CASES]
    both_ways = [q for q in set(questions) if questions.count(q) > 1]
    assert both_ways, "no question is answered both compliantly and not"

    for q in both_ways:
        answers = [c for c in CASES if c["question"] == q]
        assert any(a["flagged"] for a in answers)
        assert any(not a["flagged"] for a in answers)


def test_the_compliant_answers_actually_explain():
    """SELECTION ABSENT is only half the bar. An answer that refuses to
    choose AND refuses to explain is inside the boundary and useless —
    and the boundary was drawn at selection precisely so the explanation
    would survive."""
    substantive = [c for c in COMPLIANT if "?" not in c["response"]]
    assert substantive
    for case in substantive:
        assert len(case["response"]) > 120, case["question"]


def test_the_compliant_answers_hand_the_decision_back():
    """DEFERRAL PRESENT — where a choice was actually asked for.

    Not every compliant answer needs it: "what does a quitclaim do" is a
    question about a document, not a request to choose. But an answer to
    "which should I use" that never says whose call it is has left the
    officer to infer it."""
    asked_to_choose = [
        c for c in COMPLIANT
        if any(w in c["question"].lower()
               for w in ("which", "should i", "best", "or ", "fill in"))
    ]
    assert len(asked_to_choose) >= 4, "the corpus must carry the real question"

    defer = ("choice is yours", "your call", "your decision", "stays with you",
             "is your choice", "not ours")
    for case in asked_to_choose:
        low = case["response"].lower()
        assert any(d in low for d in defer), (
            f"asked to choose and never said whose call it is: "
            f"{case['question']!r}")


def test_the_refusal_itself_is_in_the_corpus_and_does_not_flag():
    """'Can you just fill in the deed type for me?' — the request the
    boundary exists to decline. The decline must not itself trip the
    scanner, or the assistant is penalised for obeying."""
    refusals = [c for c in CASES if "fill in" in c["question"].lower()]
    assert refusals
    for case in refusals:
        assert not case["flagged"]
        assert ai_boundary.scan(case["response"]) == []
        assert "stays with you" in case["response"] or \
               ai_boundary.DEFERRAL in case["response"].lower()


# ── 1b. The phrasing probes ──────────────────────────────────────────

@pytest.mark.parametrize("probe", PROBES, ids=[p["text"][:52] for p in PROBES])
def test_the_phrasing_probes(probe):
    """The suite passed all twelve transcript cases on its first run.

    That was not reassurance. A corpus and a matcher written in the same
    sitting agree with each other by construction — the corpus does not
    test the matcher, it tests whether the author was internally
    consistent for an hour.

    Probing with phrasings the corpus did not contain found three real
    defects immediately: two false positives on 'the parties may use a
    grant deed' / 'officers commonly use a grant deed' (describing
    practice, not directing), and one false negative on 'a quitclaim
    deed is what you want' (the same statement as the one the cue list
    caught, in the other word order). Pinned so they cannot regress.
    """
    assert bool(ai_boundary.scan(probe["text"])) is probe["flagged"], probe["why"]


def test_the_probes_carry_both_defect_directions():
    """A probe set that only proved the scanner fires would have missed
    the two false positives, which were the worse bugs: a detector
    nobody trusts is a detector nobody reads."""
    assert any(p["flagged"] for p in PROBES)
    assert any(not p["flagged"] for p in PROBES)
    fixed = [p for p in PROBES if "fixed" in p["why"].lower()]
    assert len(fixed) >= 3, "the found defects stay in the record"


# ── 2. Layer 1: the prompt STATES the boundary ───────────────────────

def test_every_prompt_carries_the_boundary_not_just_a_disclaimer():
    """'Do not provide legal advice' is a phrase a model can satisfy
    while telling an officer which deed to draw. The standing
    instruction has to name the act it forbids."""
    for key in ai_prompts.PROMPTS:
        prompt = ai_prompts.system_prompt(key)
        assert "You do not make decisions" in prompt
        assert "you may not SELECT" in prompt
        assert "the choice is theirs" in prompt


def test_the_deed_type_prompt_no_longer_instructs_selection():
    """The prompt that made the ruling urgent. It used to read 'help
    users select the appropriate deed type for their transaction'."""
    prompt = ai_prompts.PROMPTS["deed_type_advisor"]
    assert "select the appropriate deed type" not in prompt.lower()
    assert "help users select" not in prompt.lower()
    # And it kept the half the boundary permits.
    assert "EXPLAIN" in prompt
    assert "choice is theirs" in prompt
    assert "do not choose for them" in prompt.lower()


def test_the_key_survived_the_rewrite():
    """Rewritten, not deleted, and not renamed: the client sends this
    key, and renaming it would be a breaking change wearing a doctrine
    fix's clothes."""
    assert "deed_type_advisor" in ai_prompts.PROMPTS
    assert ai_prompts.system_prompt("deed_type_advisor")


def test_no_shipped_prompt_would_itself_trip_the_scanner():
    """A prompt that told the model to do the thing the scanner flags
    would be the product arguing with itself."""
    for key, prompt in ai_prompts.PROMPTS.items():
        assert ai_boundary.scan(prompt) == [], key


# ── 3. The scanner's own properties ──────────────────────────────────

def test_a_referral_to_an_attorney_is_not_a_selection():
    """The single most common legitimate 'recommend' in this domain, and
    it is in our own shipped prompts. Flagging it would bury the real
    signal under noise nobody reads."""
    assert ai_boundary.scan(
        "A grant deed carries implied warranties. I'd recommend consulting an "
        "attorney about which fits this transfer.") == []
    assert ai_boundary.scan(
        "Always recommend consulting with an attorney or tax advisor.") == []


def test_a_recommendation_with_no_instrument_is_not_this_scanner_s_business():
    """The boundary is about instrument SELECTION. 'You should double
    check the APN' is not it."""
    assert ai_boundary.scan("You should double-check the APN against the prelim.") == []


def test_the_instrument_list_is_built_from_the_registry():
    """A new instrument must not be able to enter the product and stay
    invisible to the scanner. This is the same failure mode as A2's
    third city list: a hand-kept copy that nobody compares."""
    from services.form_families import FAMILY_BY_DEED_TYPE
    terms = {t.lower() for t in ai_boundary.instrument_terms()}
    for slug in FAMILY_BY_DEED_TYPE:
        assert slug.replace("-", " ").replace("_", " ").lower() in terms, slug

    # And a form added to the registry shows up without touching this
    # module — asserted on the mechanism, not on today's contents.
    src = code_only(BACKEND / "services" / "ai_boundary.py")
    assert "FAMILY_BY_DEED_TYPE" in src


def test_longer_instrument_names_win():
    """'affidavit of death of joint tenant' must not be reported as
    'affidavit of death' — a flag that names the wrong document sends
    the reader to the wrong prompt."""
    flags = ai_boundary.scan(
        "You should use an affidavit of death of joint tenant here.")
    assert flags
    assert flags[0].instrument.lower() == "affidavit of death of joint tenant"


def test_the_scanner_never_throws_and_never_blocks():
    """It runs in the response path. An officer mid-file must not lose an
    answer we already paid for because a detector had an opinion."""
    for hostile in (None, "", "   ", "\x00" * 10, "deed " * 5000):
        assert isinstance(ai_boundary.scan(hostile), list)
    assert ai_boundary.flags_json(None) is None
    assert ai_boundary.flags_json("A quitclaim conveys what the grantor has.") is None


def test_flags_json_is_null_when_clean_and_parseable_when_not():
    """NULL-when-clean is what makes `WHERE boundary_flags IS NOT NULL`
    the whole audit query."""
    assert ai_boundary.flags_json("Nothing to see.") is None
    raw = ai_boundary.flags_json("You should use a quitclaim deed.")
    assert raw
    parsed = json.loads(raw)
    assert parsed[0]["instrument"].lower() == "quitclaim deed"
    assert parsed[0]["cue"]
    assert parsed[0]["excerpt"]


# ── 4. Layer 2 is wired into the response path ───────────────────────

def test_the_endpoint_scans_before_it_returns():
    src = code_only(BACKEND / "api" / "ai_assist.py")
    assert "flags_json" in src
    assert "boundary_flags" in src


def test_the_flag_is_stored_beside_the_exchange_that_produced_it():
    schema = code_only(BACKEND / "database.py")
    assert "boundary_flags" in schema
    assert "ADD COLUMN IF NOT EXISTS boundary_flags" in schema, \
        "logs created before Doctrine B need the column too"


def test_a_flag_does_not_withhold_the_response():
    """Stated as a test because a reader who assumes otherwise trusts
    something that does not exist. The scan happens, the warning is
    logged, and `ChatResponse(success=True, response=ai_response)` is
    returned unchanged."""
    src = code_only(BACKEND / "api" / "ai_assist.py")
    scan_at = src.index("flags_json(ai_response)")
    return_at = src.index("return ChatResponse(success=True", scan_at)
    between = src[scan_at:return_at]
    for mutating in ("ai_response =", "raise HTTPException", "return ChatResponse(success=False"):
        assert mutating not in between, \
            f"the scanner altered or suppressed the response: {mutating}"
