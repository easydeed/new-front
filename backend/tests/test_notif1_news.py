"""NOTIF1 — the strip that reports what the worklist cannot.

The rule this whole ticket rests on: **a disappearance is not a
notification.** The worklist selects the UNDECIDED share statuses, so an
approval removes the row rather than changing it, and a vanished row is
indistinguishable from one she handled, one that expired, or nothing.
"""
from __future__ import annotations

from pathlib import Path

from services import news as nw
from tests.source_text import code_only


def _item(**kw):
    base = {"id": 1, "type": "share_approved", "message": "Reviewer approved 12 Oak St",
            "link": None, "deed_id": 7, "days_ago": 1}
    base.update(kw)
    return base


# ═══ THE SEPARATION THAT IS THE WHOLE DESIGN ═════════════════════════

def test_news_is_not_carried_inside_the_worklist():
    """OWNER-RULED, and the reason is DASH3's.

    A fourth band would put an approval into a container whose hero
    counts rows and promises "things that need you". An approval needs
    nothing. Counting it inflates the number with finished work, which is
    the metric-vs-worklist error DASH3 spent itself removing.

    Pinned at the CONTRACT rather than the screen: `news` is its own key,
    so folding it into `worklist` fails an equality assertion rather than
    a review.
    """
    from services.officer_queue import QUEUE_KEYS
    assert "news" in QUEUE_KEYS
    assert "worklist" in QUEUE_KEYS


def test_the_hero_cannot_see_news_at_all():
    """The count is `hero_count(groups)` over worklist groups. News rows
    are not groups and never reach it — asserted by construction rather
    than by hoping nobody adds them."""
    from services import worklist as wl
    built = nw.build([_item(), _item(id=2)])
    assert built["items"]
    # The hero's input is groups; news is a sibling key with no path in.
    assert wl.hero_count([]) == 0
    assert "count" not in built


# ═══ THE SENTENCE IS THE SERVER'S ════════════════════════════════════

def test_the_stored_message_is_used_verbatim():
    """§13 rule 3 — one place turns state into English, and it is the one
    that had the facts. `utils/notifications` composed this message when
    the event happened; reconstructing a worse one from a type string
    here would be a second opinion about what occurred."""
    row = nw.news_row(_item(message="Dana approved 1358 5TH ST")).as_dict()
    assert row["say"] == "Dana approved 1358 5TH ST"


def test_an_event_with_no_message_is_dropped_rather_than_narrated():
    """"Something happened" is not news. A row we cannot describe is
    withheld rather than given a generic line that asserts less than it
    appears to."""
    assert nw.news_row(_item(message="")) is None
    assert nw.news_row(_item(message=None)) is None


def test_an_unknown_event_type_is_not_rendered():
    """The strip says what it can say. A type it does not understand is
    left to whatever surface owns it."""
    assert nw.news_row(_item(type="api_key_requested")) is None
    assert nw.news_row(_item(type="share_rejected")) is not None


# ═══ ABSENCES NAMED BY KIND ══════════════════════════════════════════

def test_an_undated_event_says_so():
    """DASH1's rule, kept: "—" reads as zero and "0 days" is a claim
    about a row whose timestamp we could not read."""
    assert nw.news_row(_item(days_ago=None)).as_dict()["when"] == "at an unknown time"


def test_todays_event_says_today():
    assert nw.news_row(_item(days_ago=0)).as_dict()["when"] == "today"
    assert nw.news_row(_item(days_ago=1)).as_dict()["when"] == "yesterday"


# ═══ IT MUST NOT BECOME WALLPAPER ════════════════════════════════════

def test_what_is_not_shown_is_reported_rather_than_trimmed():
    """A strip that silently truncates tells her she has seen everything
    when she has not — the same defect as a count that disagrees with its
    rows."""
    built = nw.build([_item(id=i) for i in range(1, 8)])
    assert len(built["items"]) == nw.NEWS_LIMIT
    assert built["more"] == 7 - nw.NEWS_LIMIT


def test_nothing_to_report_is_an_empty_strip_not_a_zero():
    built = nw.build([])
    assert built["items"] == []
    assert built["more"] == 0


# ═══ WHERE A ROW GOES ════════════════════════════════════════════════

def test_a_news_row_lands_on_the_document():
    """The orphan ruling, which the worklist rows already follow: a row
    about a document that drops her on a list makes her find the document
    again."""
    assert nw.news_row(_item(deed_id=41, link=None)).as_dict()["href"] == "/deeds/41"


def test_the_deed_beats_a_stored_link_that_points_at_a_tracker():
    """CORRECTED. NOTIF1 shipped preferring the stored `link`, and every
    production row's link is `/requests?kind=reviews&focus={share_id}` —
    a TRACKER. So every strip row landed on a list, which is the orphan
    ruling broken by the same preference for a stored destination over a
    known document that the worklist already corrected once.

    The deed wins whenever we have one. The link is the fallback for a
    record that has no deed behind it."""
    row = nw.news_row(_item(deed_id=41, link="/requests?kind=reviews&focus=9")).as_dict()
    assert row["href"] == "/deeds/41"
    orphan = nw.news_row(_item(deed_id=None, link="/requests?kind=reviews&focus=9")).as_dict()
    assert orphan["href"] == "/requests?kind=reviews&focus=9"


def test_the_row_carries_the_property_so_the_strip_can_name_it():
    """Owner-ruled: the strip stays TASK-FREE, and the gap it left — she
    learns her reviewer approved and must go find the deed — is closed by
    NAVIGATION rather than an action. The property is a link, not a
    button."""
    row = nw.news_row(_item(property="1358 5TH ST")).as_dict()
    assert row["property"] == "1358 5TH ST"


def test_a_record_with_no_deed_names_no_property_rather_than_guessing():
    row = nw.news_row(_item(property=None, deed_id=None)).as_dict()
    assert row["property"] == ""


def test_a_row_that_drifts_is_refused():
    row = nw.NewsRow(id=1, kind="approved", say="s", when="today", href="/x")
    assert set(row.as_dict()) == nw.NEWS_KEYS


# ═══ THE QUERY, PINNED AT ITS SOURCE ═════════════════════════════════

def test_the_strip_reads_unread_events_and_never_the_undecided_query():
    """THE FINDING, PINNED.

    The worklist's `awaiting` query selects `status IN ('sent','viewed')`
    — undecided — which is why a resolved share leaves by disappearing.
    The strip must therefore read the NOTIFICATION record, not that
    query, or it would inherit the blindness it exists to fix.

    Asserted against the source, cut at the statement that feeds the
    strip rather than at a character distance from it (§14.1.1).
    """
    src = code_only(Path(__file__).resolve().parents[1]
                    .joinpath("routers/dashboard.py").read_text())
    assign = src.index("news_items = ")
    query = src[src.rindex("cur.execute(", 0, assign):assign]
    assert "user_notifications" in query
    assert "COALESCE(un.read, false) = false" in query
    # The undecided-status filter belongs to the worklist, not here.
    assert "'sent', 'viewed'" not in query


def test_the_query_reads_a_COLUMN_and_never_a_payload_that_is_never_written():
    """THE PIN THAT WOULD HAVE CAUGHT NOTIF1'S OWN DEFECT.

    NOTIF1 shipped selecting `(n.payload->>'deed_id')::int`.
    `create_notification` has no `payload` parameter — it never has — so
    that expression was NULL for every row in production, while the unit
    tests passed on a fixture that supplied `deed_id` directly.

    **The rule was right and the corpus could not exercise it.** The row
    builder was correct; the thing feeding it was not, and no fixture in
    a module test can see that. So the pin is at the SOURCE, where the
    two halves meet.

    Asserted as: the query reads the column, and `create_notification`
    accepts the parameter that fills it. Either one alone passes while
    the other is broken.
    """
    from pathlib import Path

    from tests.source_text import code_only
    backend = Path(__file__).resolve().parents[1]
    src = code_only(backend.joinpath("routers/dashboard.py").read_text())
    assign = src.index("news_items = ")
    query = src[src.rindex("cur.execute(", 0, assign):assign]
    # SQL COMMENTS ARE STRIPPED TOO, and they had to be. `code_only`
    # removes PYTHON comments; this query is a string literal, so its
    # `--` lines survive — and the one explaining this very fix quotes
    # the forbidden expression verbatim, so the pin tripped on the prose
    # describing the rule. §14.1's comment-trip, third time this session
    # and the first where I wrote the banned string INTO the explanation
    # of why it is banned.
    sql = "\n".join(ln.split("--")[0] for ln in query.splitlines())
    assert "n.deed_id" in sql
    assert "payload->>" not in sql

    writer = code_only(backend.joinpath("utils/notifications.py").read_text())
    assert "deed_id: Optional[int] = None" in writer
    assert "INSERT INTO notifications (type, title, message, link, deed_id)" in writer
