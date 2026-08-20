"""DASH3 — the worklist, and the five rulings that shaped it.

Every assertion here is a RULING rather than a rendering: the ordering,
the unit the hero counts, what makes a row appear, and the one count
whose source can silently change meaning.
"""
from __future__ import annotations

from services import worklist as wl


def _rows(*specs):
    """Rows in a deliberately WRONG order, so a passing test means the
    sort did something rather than that the input was already sorted."""
    out = []
    for kind, days, prop in specs:
        row = wl.Row(kind=kind, tag="t", title="T", say="s", primary="p",
                     href="/x", sort_age=days, property=prop)
        out.append(row.as_dict())
    return out


# ═══ RULING 1 — CONSEQUENCE, NOT CHEAPNESS ═══════════════════════════

def test_bands_run_blocked_then_yours_then_nobody_waiting():
    """The design's annotation says "cheapest-to-clear first". Its own
    rows contradict it — "Archive all 4" is the cheapest action in the
    mockup and sorts LAST, and the stale row says why in its own copy:
    *"Nobody is waiting on these but you."*
    """
    rows = _rows(("stale", 21, "A"), ("you", None, "A"), ("chase", 8, "A"))
    groups = wl.group_rows(rows)
    assert [r["kind"] for r in groups[0]["items"]] == ["chase", "you", "stale"]


def test_the_cheapest_action_is_not_promoted():
    """The specific inversion, named. A collapsed stale row clears FOUR
    documents with one press and still sorts below a single blocked
    signing, because clearing the board is not the same as doing the
    work that matters."""
    rows = _rows(("stale", 30, "A"), ("chase", 1, "A"))
    groups = wl.group_rows(rows)
    assert groups[0]["items"][0]["kind"] == "chase"


def test_within_a_band_the_oldest_silence_is_first():
    rows = _rows(("chase", 3, "A"), ("chase", 19, "A"), ("chase", 8, "A"))
    ages = [r["sort_age"] for r in wl.group_rows(rows)[0]["items"]]
    assert ages == [19, 8, 3]


def test_an_unknown_age_sorts_last_rather_than_first():
    """DASH1's rule, kept: an unknown age is not evidence of urgency, and
    sorting `None` first would put every undated row above every dated
    one.

    TODAY'S ROW IS IN HERE ON PURPOSE. My first version of this test used
    only `None` and `2`, and it passed with the rule DELETED — because
    `-(None or 0)` and `-(2)` differ anyway, so the ordering came from the
    age term and the None-term was never consulted. `None` against `0` is
    the only pair that can tell them apart, and the undated row is placed
    FIRST in the input so a stable sort that does nothing leaves it there.
    The mutation probe is what found this; the test read correctly to me
    both before and after.
    """
    rows = _rows(("chase", None, "A"), ("chase", 0, "A"), ("chase", 5, "A"))
    ages = [r["sort_age"] for r in wl.group_rows(rows)[0]["items"]]
    assert ages == [5, 0, None]


def test_groups_order_by_their_most_consequential_row():
    rows = _rows(("stale", 40, "QUIET ST"), ("chase", 2, "BLOCKED AVE"))
    groups = wl.group_rows(rows)
    assert groups[0]["property"] == "BLOCKED AVE"


# ═══ RULING 2 — ROWS ARE THE UNIT ════════════════════════════════════

def test_the_hero_equals_the_rows_on_screen():
    """A worklist's count must equal what is visible or it is a metric
    again. Not "is close to" — equal, by construction, because the same
    function produces both."""
    rows = _rows(("chase", 1, "A"), ("you", None, "A"), ("stale", 9, "B"))
    groups = wl.group_rows(rows)
    assert wl.hero_count(groups) == 3
    assert wl.hero_count(groups) == sum(len(g["items"]) for g in groups)


def test_the_group_header_counts_the_same_unit_as_the_hero():
    """Two units on one screen is what DASH-FIX spent itself killing: a
    header counting DOCUMENTS beside a hero counting ROWS makes the
    reader convert between them silently and wrongly."""
    rows = _rows(("chase", 1, "A"), ("you", None, "A"), ("stale", 3, "B"))
    groups = wl.group_rows(rows)
    assert [g["open"] for g in groups] == [len(g["items"]) for g in groups]
    assert sum(g["open"] for g in groups) == wl.hero_count(groups)


def test_a_document_with_nothing_outstanding_is_still_a_row():
    """THE ROW THE OLD HERO COULD NOT COUNT.

    Zero outstanding checks meant zero contribution to "N fields need
    your eyes" — so a document with every field confirmed and nothing
    printed was invisible while being the readiest work she had. Owner-
    ruled: it is correctly a row.
    """
    row = wl.ready_row({"deed_id": 93, "deed_type": "grant-deed",
                        "property": "1358 5TH ST"}).as_dict()
    assert row["kind"] == "you"
    assert "confirmed" in row["say"]
    assert row["primary"]


def test_the_two_populations_survive_in_what_the_row_says():
    """They stop being the headline number and do NOT stop existing: the
    count of outstanding checks is the row's sentence."""
    row = wl.accuracy_row({"deed_id": 7, "checks": ["a", "b", "c"],
                           "property": "X"}).as_dict()
    assert "3 fields" in row["say"]
    one = wl.accuracy_row({"deed_id": 7, "checks": ["a"], "property": "X"}).as_dict()
    assert "1 field needs" in one["say"]


# ═══ COLLAPSE, AND WHAT A COLLAPSED ROW PROMISES ═════════════════════

def test_idle_drafts_on_one_property_collapse_to_one_row():
    row = wl.stale_group_row([
        {"id": 78, "property": "P", "days_idle": 21, "deed_type": "grant-deed"},
        {"id": 79, "property": "P", "days_idle": 30, "deed_type": "grant-deed"},
        {"id": 80, "property": "P", "days_idle": 12, "deed_type": "grant-deed"},
    ]).as_dict()
    assert row["deed_ids"] == [78, 79, 80]
    assert "Archive all 3" == row["primary"]
    # The AGE is the oldest, not the newest: the row's claim is about how
    # long this has been sitting.
    assert row["sort_age"] == 30


def test_a_single_idle_draft_does_not_say_all_1():
    row = wl.stale_group_row([{"id": 5, "property": "P", "days_idle": 9}]).as_dict()
    assert row["primary"] == "Archive it"


# ═══ ABSENCES ARE NAMED BY KIND ══════════════════════════════════════

def test_an_undated_row_says_the_age_is_unknown():
    """DASH1's rule. "—" reads as zero and "0 days" is a claim about a
    row whose timestamp we could not read."""
    row = wl.chase_row({"kind": "signing", "id": 1, "deed_id": 2,
                        "days_waiting": None, "summary": "s"}).as_dict()
    assert row["age"] == "age unknown"


def test_todays_row_says_today():
    row = wl.chase_row({"kind": "signing", "id": 1, "deed_id": 2,
                        "days_waiting": 0, "summary": "s"}).as_dict()
    assert row["age"] == "today"


def test_the_server_sentence_is_used_verbatim():
    """§13 rule 3 — one place turns state into English. This module
    arranges rows; it does not get a second opinion about what a
    scheduling state means."""
    row = wl.chase_row({"kind": "signing", "id": 1, "deed_id": 2,
                        "days_waiting": 4,
                        "summary": "Opened, no answer yet"}).as_dict()
    assert row["say"] == "Opened, no answer yet"


# ═══ THE RECORDING PIN ═══════════════════════════════════════════════

def test_recorded_counts_come_from_the_caller_and_are_per_property():
    rows = _rows(("chase", 1, "1358 5TH ST"))
    groups = wl.group_rows(rows, recorded={"1358 5TH ST": 4})
    assert groups[0]["recorded"] == 4


def test_the_recorded_count_reads_recorded_at_and_never_status():
    """THE PIN THE OWNER NAMED, and it is checked at the SOURCE.

    "Recorded" is the officer's own statement that the county took the
    document (`recorded_at`, RED0 R3-8). `status = 'completed'` means
    only that a PDF was rendered. Counting the second would silently make
    "4 recorded" mean "we rendered four PDFs" — the `deeds.status`
    disease reappearing inside a count, on the surface a pilot user reads
    first.

    Asserted against the QUERY rather than against a fixture, because a
    fixture proves what the numbers do and this proves where they come
    from.

    The window is cut at the STATEMENT that feeds the count — the last
    `cur.execute(` before the assignment — and not at a character
    distance from it. §14.1.1: a pin asserts the property, and a
    fixed-character window asserts how far apart two things happen to sit
    today. I wrote a 600-character window into `dashboardDayOne.test.ts`
    two days after recording that rule and it failed at 640; this is the
    same shape, so it gets the same correction before it can fail.
    """
    from pathlib import Path

    from tests.source_text import code_only
    src = code_only(Path(__file__).resolve().parents[1]
                    .joinpath("routers/dashboard.py").read_text())
    assign = src.index("recorded_counts")
    query = src[src.rindex("cur.execute(", 0, assign):assign]
    assert "recorded_at IS NOT NULL" in query
    assert "status = 'completed'" not in query
    assert "status='completed'" not in query


# ═══ SHAPE ═══════════════════════════════════════════════════════════

def test_a_row_that_drifts_is_refused():
    """Same instinct as `officer_queue`: a payload whose keys drift
    silently is a screen rendering blanks nobody notices."""
    row = wl.Row(kind="you", tag="t", title="T", say="s", primary="p", href="/x")
    assert set(row.as_dict()) == wl.ROW_KEYS


def test_a_group_that_drifts_is_refused():
    groups = wl.group_rows(_rows(("you", None, "A")))
    assert set(groups[0]) == wl.GROUP_KEYS


def test_a_row_with_no_property_still_lands_somewhere():
    """A deed with no address is a real state — the property is the first
    thing an officer fills and not the first thing that exists. It groups
    under a named absence rather than vanishing from a list whose count
    the hero is asserting."""
    groups = wl.group_rows(_rows(("you", None, "")))
    assert groups[0]["property"] == "Property not set"
    assert wl.hero_count(groups) == 1


# ═══ WHERE A ROW GOES — TWO RULINGS THAT PULL AGAINST EACH OTHER ═════

def test_a_row_about_a_document_lands_on_that_document():
    """THE ORPHAN RULING, and DASH3 broke it twice before restoring it.

    First by copying `/signings?focus=` out of the module this replaces —
    a RETIRED alias, caught by `test_link_contract.py`. Then by fixing
    that to the canonical tracker route, which satisfied the contract and
    broke this: the canonical tracker is still a tracker, and a row about
    a document that lands on a list makes her find the document again.

    The deed page is not an alias and not a list, so it answers both.
    """
    row = wl.chase_row({"kind": "signing", "id": 3, "deed_id": 41,
                        "days_waiting": 2, "summary": "s"}).as_dict()
    assert row["href"] == "/deeds/41"


def test_a_row_with_no_document_behind_it_uses_the_canonical_tracker():
    """And never the retired alias — new links must not grow the
    population of legacy paths those aliases were kept for."""
    row = wl.chase_row({"kind": "signing", "id": 3, "deed_id": None,
                        "days_waiting": 2, "summary": "s"}).as_dict()
    assert row["href"] == "/requests?kind=signings&focus=3"
    assert "?focus=" not in row["href"].split("&")[0]


def test_a_single_idle_draft_goes_straight_to_the_builder():
    """Ruled: a draft has exactly one action, and the deed page would
    offer that same action one navigation later."""
    row = wl.stale_group_row([{"id": 5, "property": "P", "days_idle": 9}]).as_dict()
    assert row["href"] == "/deed-builder?resume=5"


def test_a_collapsed_draft_row_goes_to_the_list_instead():
    """The one place that ruling STOPS rather than being overridden:
    four drafts on one parcel are four possible resumes, so the row goes
    where all four are visible. Named here so the boundary is a decision
    on the record."""
    row = wl.stale_group_row([
        {"id": 5, "property": "P", "days_idle": 9},
        {"id": 6, "property": "P", "days_idle": 4},
    ]).as_dict()
    assert row["href"] == "/past-deeds?status=draft"
