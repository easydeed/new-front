"""NOTARYPHONE1 — the two halves that are server-side.

═══ THE SCREEN CONTRADICTED ITSELF ═══

The notary's own window read

    You offered this · 1 agreed

directly above a summary saying "waiting on 1 more person". Both
sentences were generated from the same data, and they disagreed.

The 1 was her. Posting a time writes an implicit `available` row for the
poster — saying "I am free Tuesday" IS saying you are free Tuesday, and
making her tick her own window would be the product asking a question it
already has the answer to. That part is right.

What was wrong is that the implicit row came back to her as a COUNT of
agreement. **An agreement is somebody answering a question you asked.
The offer is the question; the offerer is not one of its answers.**

═══ AND "1 TIMES OFFERED" ═══

Three sentences in `state_label` counted with a hard-coded plural.

The exact broken string is QUOTED IN A COMMENT twelve lines above them,
as the example of a useless-but-true sentence that the dispatch branch
was added to avoid. It was read, typed out, and shipped unfixed in the
same edit — a defect can be visible in a comment about a different
defect and still not be seen.

The audit reported it as two bugs, one per surface. There is one
place: every surface renders this sentence verbatim (§13 rule 3), so the
notary's phone and the officer's card are both fixed by one line.
"""
import pytest

from services import signing_loop as loop
from services.signing_surfaces import _agreed_names


def _participants():
    return [
        {"id": 1, "party_role": loop.ROLE_NOTARY, "display_name": "Ana Reyes"},
        {"id": 2, "party_role": loop.ROLE_SIGNER, "display_name": "Jane Doe"},
        {"id": 3, "party_role": loop.ROLE_SIGNER, "display_name": "John Roe"},
    ]


def _window(window_id=10, proposed_by=1):
    return {"id": window_id, "proposed_by": proposed_by}


def _yes(participant_id, window_id=10):
    return {"window_id": window_id, "participant_id": participant_id,
            "answer": loop.ANSWER_AVAILABLE}


# ── The offerer is not one of the answers ────────────────────────────

def test_the_notary_is_not_counted_as_agreeing_to_her_own_window():
    """THE PIN THIS FILE EXISTS FOR."""
    got = _agreed_names(_participants(), [_yes(1)], _window(proposed_by=1))
    assert got == []


def test_real_agreements_still_count():
    got = _agreed_names(_participants(), [_yes(1), _yes(2)], _window(proposed_by=1))
    assert got == ["Jane Doe"]


def test_the_exclusion_follows_the_PROPOSER_not_the_reader():
    """A signer looking at the notary's window must not see her counted
    either — she proposed it, which is not the same as agreeing to it.

    Scoping this to "whoever is reading" would make the same window read
    differently to two people, which is a screen inventing a fact.
    """
    for reader in (1, 2, 3):
        got = _agreed_names(_participants(), [_yes(1), _yes(3)],
                            _window(proposed_by=1))
        assert "Ana Reyes" not in got, f"visible to participant {reader}"
        assert got == ["John Roe"]


def test_a_signer_proposal_excludes_that_signer():
    """Symmetric. The rule is about the offer, not about the notary."""
    got = _agreed_names(_participants(), [_yes(2), _yes(1)], _window(proposed_by=2))
    assert got == ["Ana Reyes"]


def test_a_window_nobody_proposed_counts_everyone():
    """`proposed_by` can be NULL on rows predating the column. Absent is
    not "the reader" and not "the notary" — it excludes nobody, which is
    the honest reading of a value we do not have."""
    got = _agreed_names(_participants(), [_yes(1), _yes(2)],
                        _window(proposed_by=None))
    assert sorted(got) == ["Ana Reyes", "Jane Doe"]


def test_a_decline_is_not_an_agreement():
    responses = [{"window_id": 10, "participant_id": 2, "answer": "unavailable"}]
    assert _agreed_names(_participants(), responses, _window()) == []


def test_answers_on_another_window_do_not_leak():
    got = _agreed_names(_participants(), [_yes(2, window_id=11)], _window(10))
    assert got == []


# ── One sentence, both surfaces ──────────────────────────────────────

def _label(window_count, pending, state=loop.STATE_PARTIALLY_AGREED):
    """Drive `state_label` through the counting branch."""
    request = {"id": 1, "tz_name": "America/Los_Angeles"}
    windows = [{"id": i, "starts_at": None, "ends_at": None,
                "origin": loop.ORIGIN_NOTARY, "proposed_by": 1}
               for i in range(1, window_count + 1)]
    participants = _participants()[: 1 + pending]
    return loop.state_label(request, windows, [], participants)


@pytest.mark.parametrize("count,expected", [(1, "1 time offered"),
                                            (2, "2 times offered"),
                                            (3, "3 times offered")])
def test_the_count_agrees_with_its_noun(count, expected):
    assert _label(count, pending=1).startswith(expected)


def test_the_fix_is_in_ONE_place():
    """The audit called it two bugs — the notary page and the officer
    card. Both render this function's sentence verbatim (§13 rule 3), so
    there is one place, and a screen that formatted its own count would
    be the defect this rule exists to prevent.

    Asserted by counting the formatting, not by reading the screens: two
    surfaces cannot disagree about a string neither of them composes.
    """
    import inspect
    src = inspect.getsource(loop.state_label)
    assert src.count("time{'' if len") == 1
    assert "times offered" not in src.replace("# ", "").split("offered =")[1]


def test_no_screen_composes_this_count_itself():
    """The other half of the same rule, swept across the frontend.

    SCOPED TO SCREENS, not to every file. The first draft swept `*.tsx`
    and caught its own sibling: `notaryPhoneRender.test.tsx` quotes the
    broken string in a comment explaining the fix. A test that quotes a
    defect is not committing it, and a sweep that cannot tell the
    difference gets widened until it means nothing.
    """
    from pathlib import Path
    repo = Path(__file__).resolve().parents[2]
    frontend = repo / "frontend" / "src"
    offenders = [
        p.relative_to(frontend).as_posix()
        for p in frontend.rglob("*.tsx")
        if "__tests__" not in p.parts
        and "times offered" in p.read_text(encoding="utf-8")
    ]
    assert offenders == [], f"a screen writes the count itself: {offenders}"
