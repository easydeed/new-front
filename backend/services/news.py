"""NOTIF1 — what happened, as distinct from what needs her.

═══ THE FINDING THIS EXISTS FOR ═══

The worklist selects `ds.status IN ('sent', 'viewed')` — the two
UNDECIDED statuses — because a worklist shows outstanding work and an
approval is the END of outstanding work. So when a reviewer approves, the
row does not change state. **It disappears.**

A DISAPPEARANCE IS NOT A NOTIFICATION. A vanished row is
indistinguishable from one she handled herself, one that expired, one
that was revoked, and from nothing at all. Nothing else on any screen
reports the event: the reviewer's own confirmation page, an admin
email-log filter and a settings toggle describing the email are the only
approval-aware surfaces in the product.

So the email was the only channel — which is precisely the failure E1
named when it added the in-app record: *"Before this, the approval
existed only as an email; a transport failure erased the event from the
owner's world entirely."* The record has been written faithfully ever
since and read by nobody.

═══ WHY THIS IS NOT A WORKLIST BAND (owner-ruled) ═══

The obvious cheap move is a fourth band. It is wrong. The hero counts
ROWS and promises "things that need you"; an approval needs nothing.
Adding it inflates that count with finished work, which is the
metric-vs-worklist error DASH3 spent itself removing.

**An approval is news, not a task, and the two do not share a
container.** Hence a separate strip: quieter than the queue, dismissible,
and contributing nothing to the hero.

═══ AND IT MUST NOT BECOME WALLPAPER ═══

A "what happened" line that accumulates forever stops being read. Two
mechanisms, both owner-ruled: the strip carries only UNREAD items, and
dismissing is one press. `NEWS_LIMIT` bounds what one render can show —
not because more cannot be fetched, but because a strip that can grow
without bound is a feed, and a feed is the thing this is not.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence

#: What one render will show. A strip that can grow without bound is a
#: feed; the count of anything beyond this is reported rather than
#: rendered, so "3 more" is a fact she is told rather than a silent trim.
NEWS_LIMIT = 4

#: Asserted on the way out, same instinct as `officer_queue` and
#: `worklist`: a payload whose keys drift silently is a screen rendering
#: blanks nobody notices.
NEWS_KEYS = frozenset({"id", "kind", "say", "when", "href", "deed_id"})

#: The notification types this strip understands. A type NOT in here is
#: deliberately NOT rendered — the strip says what it can say, and an
#: unknown event is left for whatever surface owns it rather than being
#: given a generic sentence that asserts less than it seems to.
KNOWN = {
    "share_approved": "approved",
    "share_rejected": "declined",
}


@dataclass
class NewsRow:
    id: int
    kind: str
    say: str
    when: str
    href: str
    deed_id: Optional[int] = None

    def as_dict(self) -> Dict[str, Any]:
        out = {
            "id": self.id, "kind": self.kind, "say": self.say,
            "when": self.when, "href": self.href, "deed_id": self.deed_id,
        }
        assert set(out) == NEWS_KEYS, f"news row drifted: {sorted(out)}"
        return out


def _when(days: Optional[int]) -> str:
    """Ages read as English, and an unknown age SAYS it is unknown.

    DASH1's rule, kept: "—" reads as zero and "0 days" is a claim we
    cannot support about a row whose timestamp we could not read.
    """
    if days is None:
        return "at an unknown time"
    if days <= 0:
        return "today"
    if days == 1:
        return "yesterday"
    return f"{days} days ago"


def news_row(item: Dict[str, Any]) -> Optional[NewsRow]:
    """One resolved event, or None if this is not an event we can name.

    THE SENTENCE IS THE SERVER'S (§13 rule 3). `utils/notifications`
    composed the message when the event happened, with the facts in hand;
    this reads it rather than reconstructing a worse one from a type
    string. A row whose stored message is empty is dropped rather than
    given a generic line — "something happened" is not news.
    """
    ntype = (item.get("type") or "").strip()
    if ntype not in KNOWN:
        return None
    message = (item.get("message") or "").strip()
    if not message:
        return None
    deed_id = item.get("deed_id")
    return NewsRow(
        id=item["id"],
        kind=KNOWN[ntype],
        say=message,
        when=_when(item.get("days_ago")),
        # LANDS ON THE DEED, not a list — the orphan ruling, which the
        # worklist rows already follow. The stored `link` is used when it
        # exists because whoever wrote the event knew where it pointed.
        href=(item.get("link") or (f"/deeds/{deed_id}" if deed_id else "/past-deeds")),
        deed_id=deed_id,
    )


def build(items: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """The strip's whole payload: what to show, and what is not shown.

    `more` is REPORTED rather than dropped. A strip that silently trims
    tells her she has seen everything when she has not, which is the
    same defect as a count that does not match its rows.
    """
    rows = [r.as_dict() for r in (news_row(i) for i in items) if r is not None]
    return {"items": rows[:NEWS_LIMIT], "more": max(0, len(rows) - NEWS_LIMIT)}
