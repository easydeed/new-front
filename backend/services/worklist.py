"""The dashboard becomes a worklist: rows grouped by property.

═══ THE FINDING DASH3 STARTED FROM ═══

Every DASH ticket added or corrected a module; none removed a category.
The result read as a metrics dashboard — four stat tiles, a "recently
worked on" list, a three-column split — for a user who opens the screen
to find the next task, not to learn how she is doing. Metrics dashboards
answer "how am I doing?"; a worklist answers "what's next?", and we built
the first while describing the second.

So the queue becomes the whole body, and this module is the assembly:
every actionable thing becomes ONE ROW, rows group by property, and the
groups order by consequence.

═══ ORDERING IS BY CONSEQUENCE (owner-ruled) ═══

    someone-else-is-blocked → your-turn → nobody-waiting

The design's own annotation says "ranked cheapest-to-clear first" and its
own rows contradict it: "Archive all 4" is the cheapest action in the
mockup and sorts LAST, while "Prepare it" is expensive and outranks
"Choose exemption". The stale row states the real rule in its own copy —
*"Nobody is waiting on these but you."* The annotation is superseded, and
the supersession is marked on the committed artifact so nobody re-derives
cheapest-first from a file in our own repository.

WITHIN a band, longest-waiting first: the oldest silence is the one worth
chasing, and an unknown age sorts last rather than first (an unknown age
is not evidence of urgency — DASH1's rule, kept).

═══ ROWS ARE THE UNIT, AND THAT IS A DELIBERATE NARROWING ═══

The hero counts ROWS. "3 things need you" over three rows is a promise
the screen keeps; "7 fields across 4 documents" is a number nobody can
point at, which is a metric wearing a worklist's clothes.

The two-population rule (unconfirmed candidates + required-and-empty)
SURVIVES — as what makes a row appear and what the row says, never as the
headline number. A document with every field confirmed and nothing left
to check is still a row, because it still needs her: `ready_to_finish`
below. It contributes 0 to the old accuracy figure and 1 to this one, and
that is the point of changing units.

**The group header counts rows too.** "6 open" meaning documents beside a
hero counting rows is two units on one screen, which is what DASH-FIX
spent itself killing.

═══ WHAT IS DELIBERATELY NOT A ROW ═══

A SUPERSEDED deed produces no your-turn and no nobody-waiting row. It is
not work she should do — the deed page stops her on arrival (§9's
disqualifying stop, which lives there and is not being moved). A chase
row survives supersession, because somebody outside is still genuinely
waiting for an answer and telling her that is not the same as inviting
her to work on it.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence

#: The three bands, in the order they are worked. The VALUE is the sort
#: key, so the ordering is data rather than a comparator somebody has to
#: keep in sync with the copy.
BAND_CHASE = 0    # someone else is blocked, or has gone quiet
BAND_YOU = 1      # her turn
BAND_STALE = 2    # nobody is waiting but her

BANDS = {"chase": BAND_CHASE, "you": BAND_YOU, "stale": BAND_STALE}

#: A row's shape, asserted on the way out. Same instinct as
#: `officer_queue.py`: a payload whose keys drift silently is a screen
#: that renders blanks nobody notices.
ROW_KEYS = frozenset({
    "kind", "band", "tag", "age", "title", "doc", "say", "sub",
    "primary", "secondary", "href", "deed_id", "deed_ids", "property",
    "county", "sort_age",
})

GROUP_KEYS = frozenset({"property", "county", "open", "recorded", "items"})


@dataclass
class Row:
    kind: str
    tag: str
    title: str
    say: str
    primary: str
    href: str
    deed_id: Optional[int] = None
    doc: str = ""
    sub: str = ""
    secondary: str = ""
    age: str = ""
    #: Days, for ordering. None sorts LAST within its band — an unknown
    #: age is not evidence of urgency.
    sort_age: Optional[int] = None
    property: str = ""
    county: str = ""
    deed_ids: List[int] = field(default_factory=list)

    def as_dict(self) -> Dict[str, Any]:
        out = {
            "kind": self.kind, "band": BANDS[self.kind], "tag": self.tag,
            "age": self.age, "title": self.title, "doc": self.doc,
            "say": self.say, "sub": self.sub, "primary": self.primary,
            "secondary": self.secondary, "href": self.href,
            "deed_id": self.deed_id, "deed_ids": self.deed_ids,
            "property": self.property, "county": self.county,
            "sort_age": self.sort_age,
        }
        assert set(out) == ROW_KEYS, f"row shape drifted: {sorted(out)}"
        return out


def _days_text(days: Optional[int]) -> str:
    """Ages read as English, and an unknown age SAYS it is unknown.

    DASH1's rule that an absence is named by kind: "—" would read as
    zero, and "0 days" would be a claim we cannot support about a row
    whose timestamp we could not date.
    """
    if days is None:
        return "age unknown"
    if days <= 0:
        return "today"
    if days == 1:
        return "1 day"
    return f"{days} days"


def _row_href(item: Dict[str, Any], is_signing: bool) -> str:
    """Where a workflow row goes when she presses it.

    THE DEED, whenever the row has one. A queue row is about a document,
    and landing on a tracker makes her find that document a second time.

    The tracker is the fallback rather than the default, for the row that
    genuinely has no deed behind it, and it uses the CANONICAL route:
    `/signings?focus=` and `/shared-deeds?focus=` are retired aliases that
    exist for mail already sent, and minting new links at them would grow
    the population those aliases were kept for.
    """
    deed_id = item.get("deed_id")
    if deed_id:
        return f"/deeds/{deed_id}"
    kind = "signings" if is_signing else "reviews"
    return f"/requests?kind={kind}&focus={item.get('id')}"


def _property_key(value: Optional[str]) -> str:
    return (value or "").strip().upper()


def chase_row(item: Dict[str, Any], county: str = "") -> Row:
    """Somebody outside is waiting, or has stopped answering.

    The SENTENCE comes from the server-side summary the signing loop
    already composes (§13 rule 3 — one place turns state into English).
    This module arranges rows; it does not get a second opinion about
    what a scheduling state means.
    """
    days = item.get("days_waiting")
    gone_quiet = bool(item.get("lapsed")) or bool(item.get("stale"))
    who = (item.get("who") or "").strip() or "the recipient"
    is_signing = item.get("kind") == "signing"
    return Row(
        kind="chase",
        tag="Gone quiet" if gone_quiet else "Waiting",
        age=_days_text(days),
        sort_age=days,
        title="Signing" if is_signing else "Review",
        doc=f"#{item.get('deed_id')}" if item.get("deed_id") else "",
        say=item.get("summary") or (
            f"{who} has not answered yet."),
        sub=f"With {who}." if who else "",
        primary="Open signing" if is_signing else "Open request",
        secondary="",
        # LANDS ON THE DEED, NOT THE TRACKER (the orphan ruling). A row
        # about a document that drops her on a list makes her find the
        # document again, which is the defect that ruling named.
        #
        # I got here twice over. The hrefs I copied from the module this
        # replaces pointed at `/signings?focus=` — a RETIRED alias kept
        # alive only for links already sitting in somebody's inbox, which
        # `test_link_contract.py` caught. Correcting that to the canonical
        # tracker route fixed the contract and broke the orphan ruling,
        # because the canonical tracker is still a tracker. The deed page
        # answers both: it is not an alias and it is not a list.
        href=_row_href(item, is_signing),
        deed_id=item.get("deed_id"),
        deed_ids=[item["deed_id"]] if item.get("deed_id") else [],
        property=item.get("property") or "",
        county=county,
    )


def upcoming_row(item: Dict[str, Any], county: str = "") -> Row:
    """A booked signing, soon. Her turn: the document has to be ready."""
    return Row(
        kind="you",
        tag="Signing booked",
        age=item.get("when_text") or "",
        sort_age=item.get("days_until"),
        title="Signing",
        doc=f"#{item.get('deed_id')}" if item.get("deed_id") else "",
        say=item.get("summary") or "A signing is booked.",
        sub=f"With {item.get('who')}." if item.get("who") else "",
        primary="Open signing",
        href=_row_href(item, True),
        deed_id=item.get("deed_id"),
        deed_ids=[item["deed_id"]] if item.get("deed_id") else [],
        property=item.get("property") or "",
        county=county,
    )


def accuracy_row(item: Dict[str, Any], county: str = "") -> Row:
    """A document with fields still needing her eyes.

    THE TWO POPULATIONS LIVE HERE, in what the row SAYS — the count of
    outstanding checks is the sentence, not the headline. `checks` mixes
    unconfirmed candidates with required-and-empty, exactly as
    `deed_accuracy` produces them, and the row does not flatten that
    distinction away: it reports the number and the screen offers the
    list.
    """
    checks = item.get("checks") or []
    n = len(checks)
    return Row(
        kind="you",
        tag="Needs your eyes",
        age="",
        sort_age=None,
        title=item.get("deed_type_label") or item.get("deed_type") or "Document",
        doc=f"#{item.get('deed_id')}" if item.get("deed_id") else "",
        say=(f"{n} field needs confirming before this can print."
             if n == 1 else
             f"{n} fields need confirming before this can print."),
        sub=item.get("escrow_no") and f"Escrow {item['escrow_no']}" or "",
        primary="Open it",
        secondary="",
        href=f"/deed-builder?resume={item.get('deed_id')}",
        deed_id=item.get("deed_id"),
        deed_ids=[item["deed_id"]] if item.get("deed_id") else [],
        property=item.get("property") or "",
        county=county,
    )


def ready_row(item: Dict[str, Any], county: str = "") -> Row:
    """Every field confirmed, and it still needs her.

    THE ROW THE OLD HERO COULD NOT COUNT. Zero outstanding checks means
    zero contribution to "N fields need your eyes" — so a document with
    nothing left to confirm and nothing yet printed was invisible on the
    old dashboard while being, in plain terms, the readiest work she had.
    """
    return Row(
        kind="you",
        tag="Unfinished",
        age="",
        sort_age=None,
        title=item.get("deed_type_label") or item.get("deed_type") or "Document",
        doc=f"#{item.get('deed_id')}" if item.get("deed_id") else "",
        say="Every field is confirmed. It needs you to finish it.",
        sub=item.get("escrow_no") and f"Escrow {item['escrow_no']}" or "",
        primary="Finish it",
        href=f"/deed-builder?resume={item.get('deed_id')}",
        deed_id=item.get("deed_id"),
        deed_ids=[item["deed_id"]] if item.get("deed_id") else [],
        property=item.get("property") or "",
        county=county,
    )


def stale_group_row(items: Sequence[Dict[str, Any]], county: str = "") -> Row:
    """Idle drafts on one property, COLLAPSED into a single row.

    Duplicates collapse per the design: four drafts on one parcel are one
    line with one action, not four lines competing with the work that is
    actually blocked. The row names the count and the action reports what
    it did — `Archive all N` inherits the per-row refusals rather than
    inventing a bulk rule (owner-ruled).
    """
    first = items[0]
    n = len(items)
    ages = [i.get("days_idle") for i in items if i.get("days_idle") is not None]
    oldest = max(ages) if ages else None
    ids = [i["id"] for i in items if i.get("id")]
    return Row(
        kind="stale",
        tag="Sitting",
        age=_days_text(oldest),
        sort_age=oldest,
        title=(f"{n} old drafts" if n > 1
               else (first.get("deed_type") or "Draft")),
        doc=" ".join(f"#{i}" for i in ids[:6]),
        say="Nobody is waiting on these but you." if n > 1
            else "Nobody is waiting on this but you.",
        sub=("All on this property. Archiving keeps them — you can bring "
             "them back." if n > 1 else
             "Archiving keeps it — you can bring it back."),
        primary=f"Archive all {n}" if n > 1 else "Archive it",
        secondary="Review them" if n > 1 else "Review it",
        # A SINGLE DRAFT GOES STRAIGHT TO THE BUILDER — deliberate, and
        # ruled: a draft has exactly one action, and the deed page would
        # offer that same action one navigation later.
        #
        # A COLLAPSED row has no single resume target, which is the one
        # place that ruling stops rather than being overridden: four
        # drafts on one parcel are four possible resumes, so the row goes
        # to the list that can show her all four. Reported, not silently
        # widened.
        href=(f"/deed-builder?resume={first.get('id')}" if n == 1
              else "/past-deeds?status=draft"),
        deed_id=first.get("id"),
        deed_ids=ids,
        property=first.get("property") or "",
        county=county,
    )


def _sort_key(row: Dict[str, Any]):
    """Consequence first; within a band, longest wait first.

    `sort_age is None` sorts LAST inside its band — an unknown age is not
    evidence of urgency, and sorting it first would put every undated row
    above every dated one.
    """
    return (row["band"], row["sort_age"] is None, -(row["sort_age"] or 0))


def group_rows(rows: Sequence[Dict[str, Any]],
               recorded: Optional[Dict[str, int]] = None,
               counties: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
    """Group by property, order within and across, count what is there.

    `recorded` maps a property key to how many RECORDED documents it has
    — and the caller must have counted those from `recorded_at`, never
    from `status = 'completed'`. See the router: reading status would make
    "4 recorded" mean "we rendered four PDFs", which is the `deeds.status`
    disease reappearing inside a count.
    """
    recorded = recorded or {}
    counties = counties or {}
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        buckets.setdefault(_property_key(row.get("property")), []).append(row)

    groups = []
    for key, items in buckets.items():
        items.sort(key=_sort_key)
        groups.append({
            "property": items[0].get("property") or "Property not set",
            "county": counties.get(key) or items[0].get("county") or "",
            # ROWS, not documents — one unit on the screen. The hero adds
            # these up and gets the same number it renders.
            "open": len(items),
            "recorded": recorded.get(key, 0),
            "items": items,
        })

    # Groups order by their most consequential row, then by that row's age.
    groups.sort(key=lambda g: _sort_key(g["items"][0]))
    for group in groups:
        assert set(group) == GROUP_KEYS, f"group shape drifted: {sorted(group)}"
    return groups


def hero_count(groups: Sequence[Dict[str, Any]]) -> int:
    """What the headline says, and it equals what is on screen.

    A worklist's count must equal the rows the reader can see, or it is a
    metric again. This is the one function that produces the number, so
    "3 things need you" and three rows cannot disagree.
    """
    return sum(len(g["items"]) for g in groups)
