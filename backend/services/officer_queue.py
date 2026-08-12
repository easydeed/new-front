"""DASH1 — what is waiting on somebody, computed in one place.

═══ THE FINDING THIS ANSWERS ═══

The dashboard showed only AUTHORING state: four counters and a feed of
completed deeds. Nothing on it was WORKFLOW state — and workflow state is
the escrow officer's actual job. Knowing who owes her something, and how
long it has been owed, is what she does forty times a day; creating a
deed is what she does once per file. The page had four entry points for
the second and none for the first.

So she could not answer "what is stuck?", "what signs tomorrow?" or "who
has not responded?" without visiting two other pages.

═══ WHY THE SERVER DECIDES WHAT "STALE" MEANS ═══

`/signings` carried `STUCK_AFTER_DAYS = 5` in TypeScript. Adding a second
threshold here — in Python, for the same question — is how the partner
category list came to have four copies and how `phoneSearchKey` came to
be right in one language and wrong in the other.

So the number lives HERE, the server computes `days_waiting` and `stale`
per row, and the screens render what they are told. The agenda payload
carries the same flag from the same function, and the frontend constant
is deleted rather than left as a second opinion.

═══ WHAT COUNTS AS "WAITING ON SOMEBODY" ═══

Three things, and they are different questions with different answers:

  * A SIGNING THAT IS BOOKED and happens soon. Nothing is owed; she
    needs to know it is coming.
  * A REQUEST NOBODY HAS ANSWERED — a review share still sent/viewed, or
    a signing request nobody has agreed a time for. Somebody owes her a
    reply, and how long they have owed it is the whole signal.
  * A DRAFT SHE HAS NOT TOUCHED. Nobody owes her anything; she owes
    herself.

They are kept apart rather than merged into one list, because "chase
somebody" and "finish something" are different actions and a single
undifferentiated pile makes her sort them by hand every morning.

**NOTHING HERE INFERS THAT ANYTHING HAPPENED.** §13 holds: a booked
signing whose time has passed is still booked. The queue reports what is
arranged and what is unanswered; it never reports what was done.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence

# ── The thresholds, named once ───────────────────────────────────────
#
# STALE_AFTER_DAYS was `STUCK_AFTER_DAYS` in the agenda page's
# TypeScript. It is not a deadline — nothing expires because of it — it
# is the point at which silence is worth a phone call.
STALE_AFTER_DAYS = 5
# How far ahead "soon" reaches. A week is the horizon an escrow officer
# plans on; a month of upcoming signings is a calendar, not a queue.
UPCOMING_DAYS = 7
# A draft nobody has touched for this long is not in progress, it is
# forgotten. Deliberately longer than the stale threshold: her own work
# waiting on her is less urgent than somebody else's silence.
IDLE_DRAFT_DAYS = 7


def days_since(when: Optional[datetime], now: Optional[datetime] = None) -> Optional[int]:
    """Whole days since `when`, or None if we do not know when.

    None rather than 0. Zero reads as "today", which is a claim; None
    reads as "we do not know", which is true and keeps the row out of
    every count that depends on an age.
    """
    if when is None:
        return None
    now = now or datetime.now(timezone.utc)
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    return max(0, (now - when).days)


def is_stale(days: Optional[int]) -> bool:
    """An unknown age is NOT stale — fail quiet, not fail loud.

    A row we cannot date must not be pushed into her attention count on
    the strength of a missing timestamp: the number she checks before
    anything else has to be trustworthy, and one false entry costs more
    than one missed entry.
    """
    return days is not None and days >= STALE_AFTER_DAYS


def upcoming_cutoff(now: Optional[datetime] = None) -> datetime:
    return (now or datetime.now(timezone.utc)) + timedelta(days=UPCOMING_DAYS)


def idle_cutoff(now: Optional[datetime] = None) -> datetime:
    return (now or datetime.now(timezone.utc)) - timedelta(days=IDLE_DRAFT_DAYS)


# ── The payload's shape, asserted by equality ────────────────────────
#
# Same allowlist-by-key-set rule the NOTARY2 token surfaces and the
# Shared Deeds row builder follow: a field cannot enter or leave this
# payload silently, because a screen reading a key the server stopped
# sending renders `undefined` and says nothing about it.
QUEUE_KEYS = frozenset({
    "upcoming",        # booked signings inside UPCOMING_DAYS
    "awaiting",        # requests nobody has answered
    "idle_drafts",     # untouched drafts
    "needs_attention", # ONE number, and it is the stale ones
    "thresholds",      # the numbers above, so no screen retypes them
    "badges",          # per-page waiting counts for the sidebar
})

UPCOMING_KEYS = frozenset({"kind", "id", "deed_id", "property", "when",
                           "who", "summary"})
AWAITING_KEYS = frozenset({"kind", "id", "deed_id", "property", "who",
                           "days_waiting", "stale", "summary"})
IDLE_KEYS = frozenset({"kind", "id", "deed_type", "property", "days_idle"})


def queue(*, upcoming: Sequence[Dict[str, Any]],
          awaiting: Sequence[Dict[str, Any]],
          idle_drafts: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """Assemble the payload and assert its shape.

    `needs_attention` is computed HERE rather than by the screen, and it
    is deliberately not "everything in the queue": a signing that is
    booked for Thursday needs nothing from her, and counting it would
    make the number she checks first mean "there are rows below".

    It is the stale unanswered requests. That is the number that, when it
    is zero, means nobody is waiting on her and nobody has gone quiet.
    """
    for row in upcoming:
        assert set(row) == UPCOMING_KEYS, f"upcoming row drifted: {sorted(row)}"
    for row in awaiting:
        assert set(row) == AWAITING_KEYS, f"awaiting row drifted: {sorted(row)}"
    for row in idle_drafts:
        assert set(row) == IDLE_KEYS, f"idle row drifted: {sorted(row)}"

    payload = {
        "upcoming": list(upcoming),
        "awaiting": list(awaiting),
        "idle_drafts": list(idle_drafts),
        "needs_attention": len([r for r in awaiting if r["stale"]]),
        # DASH1 item 6 — THE AMBIENT SIGNAL.
        #
        # Counted here rather than by the sidebar, for the same reason
        # `needs_attention` is: a screen filtering the list itself would
        # be a second opinion about what counts as waiting, and two
        # numbers claiming to answer one question is the disease this
        # ticket spent its first half removing.
        #
        # These are NOT the attention count. A badge says "there are
        # things here"; the attention number says "these have gone
        # quiet". Different claims, deliberately different numbers.
        "badges": {
            "signings": len([r for r in awaiting if r["kind"] == "signing"]),
            "shared_deeds": len([r for r in awaiting if r["kind"] == "review"]),
        },
        "thresholds": {
            "stale_after_days": STALE_AFTER_DAYS,
            "upcoming_days": UPCOMING_DAYS,
            "idle_draft_days": IDLE_DRAFT_DAYS,
        },
    }
    assert set(payload) == QUEUE_KEYS, (
        f"the officer queue drifted from its contract: {sorted(payload)}")
    return payload
