"""What survives NOTARY1: the vocabulary, one honest sentence, one .ics.

═══ WHAT THIS MODULE IS NOW ═══

NOTARY1 coordinated a signing as a `deed_shares` row — the officer
proposed windows, the notary tapped one. §13.1 reversed that model,
NOTARY2 rebuilt it as an aggregate across four tables
(`services/signing_loop.py`), #162 removed NOTARY1's write path on
evidence, and the read side went with it.

What is left here is what OUTLIVED the feature, and each piece has a
living caller:

  - THE VOCABULARY. `SHARE_KIND_REVIEW` / `SHARE_KIND_SIGNING` is how the
    two fail-closed refusals in `routers/sharing.py`, the shared row
    contract and the migration script RECOGNISE a NOTARY1 row. Removing
    the ability to make more of them is not the same act as removing the
    ability to read what exists.
  - `windows_of` — the migration script's parser for `proposed_windows`.
  - `scheduling_state` / `scheduling_label` — the officer's list still
    renders a line for such a row (`services/shared_deed_row.py`).
  - `build_ics` — NOTARY2 sends the same kind of calendar copy.
  - `default_expiry` — every share, of either kind.

DELETED WITH THE FEATURE, and worth naming because they were a SECOND
ANSWER to questions NOTARY2 answers for itself: `normalize_windows` and
`MAX_WINDOWS = 3` (NOTARY2 validates its own posts, at five), `find_window`
(index-into-officer-proposed-list, a shape that no longer exists),
`window_label` and `window_labels` (`signing_loop.window_label` writes
every window this product shows, and it takes a timezone, which this one
never did), `window_to_ics`. Two divergent answers to "how many windows"
lived in this repo, and only one of them was reachable.

═══ THE RULE THAT DID NOT RETIRE ═══

A scheduled time is an ARRANGEMENT, not a legal act, and "confirmed"
must still mean somebody said so. `scheduling_label()` is why the words
are written once: no surface may render `scheduled` as a claim that the
signing WILL happen, and a label composed screen by screen is how that
distinction erodes. It also refuses to attribute an arrangement to
anybody it cannot name — an unrecognised asserter gets "Signing time
recorded", not a person.

The same rule, in NOTARY2's vocabulary, is `signing_loop.state_label`.

═══ NO SIGNER CONTACT ON THIS ROW ═══

NOTARY1 stored none, deliberately, and that has not changed for
`deed_shares`. §13.1 gave signers their own participation in NOTARY2 —
on one purgeable row in `signing_participants`, with a purge job behind
it — which is a different mechanism with its own retention rule, not a
relaxation of this one.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# A share is one of two kinds. The kind is stored rather than inferred
# from which columns happen to be populated, because "this share has
# proposed_windows so it must be a signing request" is the sort of
# inference that breaks the first time somebody adds windows to a review.
SHARE_KIND_REVIEW = "review"
SHARE_KIND_SIGNING = "signing_request"
SHARE_KINDS = (SHARE_KIND_REVIEW, SHARE_KIND_SIGNING)

# Who asserted the time. Both are humans; they are different humans, and
# the record keeps them apart (owner ruling 3).
ASSERTED_BY_NOTARY = "notary"
ASSERTED_BY_OFFICER = "officer"
ASSERTERS = (ASSERTED_BY_NOTARY, ASSERTED_BY_OFFICER)

def windows_of(row: Dict[str, Any]) -> List[Dict[str, str]]:
    """The stored windows, whatever shape the driver handed back.

    NON-DICT ENTRIES ARE DROPPED, and that is a widening of this function
    rather than a quiet tightening: `signing_migration` carried its own
    private copy that filtered them, this one did not, and the two have
    now converged HERE — on the filtering behaviour, because every caller
    goes on to read `w["start"]` and a bare string in the list is a
    crash rather than a window.

    Flagged because a narrowing and a widening look identical in a diff.
    The migration's behaviour is unchanged; this function's is, and only
    in the direction of not raising on data it cannot use.
    """
    raw = row.get("proposed_windows")
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return []
    if not isinstance(raw, list):
        return []
    return [w for w in raw if isinstance(w, dict)]


def scheduling_state(row: Dict[str, Any]) -> Optional[str]:
    """DERIVED. Never read from, never written to, `status`.

        None          not a signing request
        'proposed'    windows offered, nobody has picked
        'scheduled'   somebody asserted a time

    Deliberately absent: any state meaning "happened". A passed window is
    not a signing, and this function will not invent one — see the module
    docstring's rule 1.
    """
    if row.get("share_kind") != SHARE_KIND_SIGNING:
        return None
    return "scheduled" if row.get("scheduled_at") else "proposed"


def scheduling_label(row: Dict[str, Any]) -> Optional[str]:
    """The words a surface may show, written once.

    THE POINT OF THIS FUNCTION is that "scheduled" must never read as
    "will happen". A time is an arrangement two people made; the product
    knows it was made and knows nothing about whether it was kept. Every
    surface calls this rather than composing its own sentence, so the
    distinction cannot erode one screen at a time.
    """
    state = scheduling_state(row)
    if state is None:
        return None
    if state == "proposed":
        n = len(windows_of(row))
        return f"Signing request sent — {n} time{'s' if n != 1 else ''} proposed, none chosen yet"

    when = row.get("scheduled_at")
    when_text = when.strftime("%B %d, %Y at %-I:%M %p") if hasattr(when, "strftime") else str(when)
    who = row.get("scheduled_by")
    if who == ASSERTED_BY_NOTARY:
        return f"Notary confirmed availability for {when_text}"
    if who == ASSERTED_BY_OFFICER:
        return f"You recorded a signing time of {when_text}"
    # An asserter we do not recognise is not a licence to describe the
    # arrangement as anybody's — say what is known and no more.
    return f"Signing time recorded: {when_text}"


def build_ics(*, summary: str, start: datetime, end: datetime,
              location: Optional[str], description: str, uid: str) -> bytes:
    """A minimal, valid iCalendar event.

    Hand-built rather than pulling a dependency: RFC 5545 for a single
    VEVENT is a dozen lines, and a new package on the deploy path for
    twelve lines of text is a poor trade.

    METHOD:PUBLISH, not REQUEST. REQUEST makes it an invitation with an
    organiser expecting RSVPs, and we are not running the notary's
    calendar — this is a copy of an arrangement already made, for them to
    file. The distinction matters for the same reason the rest of this
    module does.
    """
    def esc(text: str) -> str:
        return (str(text).replace("\\", "\\\\").replace(";", r"\;")
                .replace(",", r"\,").replace("\n", r"\n"))

    def stamp(dt: datetime) -> str:
        return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//DeedPro//Signing//EN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{esc(uid)}",
        f"DTSTAMP:{stamp(datetime.now(timezone.utc))}",
        f"DTSTART:{stamp(start)}",
        f"DTEND:{stamp(end)}",
        f"SUMMARY:{esc(summary)}",
        f"DESCRIPTION:{esc(description)}",
    ]
    if location:
        lines.append(f"LOCATION:{esc(location)}")
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return ("\r\n".join(lines) + "\r\n").encode("utf-8")


def default_expiry(days: int = 14) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)
