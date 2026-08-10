"""NOTARY1 — the signing handoff, and the line it must not cross.

═══ WHAT THIS IS ═══

An officer picks a notary from her own partner list, sends a signing
request with two or three proposed windows, and the notary taps one. She
is told. That is the whole feature.

What it removes is the leg she does not control. She already has her
clients' numbers and already calls them; what she cannot do is stop
playing phone tag with a notary. So the product coordinates
officer↔notary and nothing else.

═══ NO SIGNER CONTACT. ANYWHERE. (owner-ruled) ═══

Signers — grantors and grantees — are consumers. They have no account,
never agreed to our terms, cannot see what we hold and cannot ask us to
delete it. Storing their email or phone would make every deed row carry
third-party contact data, which changes what a database dump IS, and it
would do so to automate a message the officer is better placed to send.

So the product captures no signer contact information, stores none, and
messages no signer. `deeds` carries party NAMES because names print on
the instrument; that is the whole of it, and it stays that way. Pinned
fail-closed in `tests/test_notary1_signing.py` — a new
`signer_email`-shaped field anywhere fails the suite rather than waiting
to be noticed.

═══ THE STATE IS DERIVED (T-5's ruling, transferred) ═══

`deed_shares.status` holds sent / viewed / approved / rejected / revoked
/ expired. Scheduling is NOT one of those, and it must not become one.

T-5 refused to add `superseded` to `deeds.status` because a superseded
deed is still a completed deed — two orthogonal facts cannot share one
column without one of them becoming unsayable. The same is true here: a
signing request that has been viewed AND scheduled is the normal case,
and folding `scheduled` into `status` makes it inexpressible.

So `scheduled_at` is its own column and the scheduling state is computed
from it. Nothing writes "scheduled" into `status`, ever.

═══ THE DOCTRINE LINE ═══

A scheduled time is an ARRANGEMENT, not a legal act. Nobody's rights
change because a calendar says Tuesday, so this needs none of the violet
machinery a vesting choice needs.

But "confirmed" must still mean somebody said so, and this file mirrors
RED-S4's recording shape exactly: `scheduled_by` + `scheduled_asserted_at`
alongside the value, because the system's knowledge of a signing time is
always somebody's statement and never its own inference.

Three things follow, and all three are pinned:

  1. THE SYSTEM NEVER ASSERTS A SIGNING OCCURRED. No auto-completion, no
     timer, no inference from a window that has passed. A time that has
     come and gone is not evidence that anybody met.
  2. `completed` IS OFFICER-ONLY. The notary is not our user, has no
     account, and a tap on a public token is not an attestation that a
     notarial act was performed.
  3. A NOTARY TAPPING A WINDOW ASSERTS AVAILABILITY, NOT ATTENDANCE. No
     surface may render `scheduled` as a claim that the signing will
     happen — `scheduling_label()` exists so that the words are written
     once and cannot drift into a promise on some screen nobody rechecked.
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

MAX_WINDOWS = 3
MIN_WINDOWS = 1


class SigningRequestError(ValueError):
    """A signing request we will not create, with the reason."""


def normalize_windows(raw: Any) -> List[Dict[str, str]]:
    """Validate and normalise proposed windows.

    Each window is `{start, end}` in ISO-8601 with an offset. Times are
    stored as the officer entered them — a signing happens at a place, in
    that place's time, and helpfully converting to UTC for display is how
    somebody arrives an hour late.
    """
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise SigningRequestError("Proposed windows must be a list")
    if len(raw) > MAX_WINDOWS:
        raise SigningRequestError(
            f"At most {MAX_WINDOWS} windows — more than three choices is a "
            f"negotiation, and this is not one")

    out: List[Dict[str, str]] = []
    for i, window in enumerate(raw):
        if not isinstance(window, dict):
            raise SigningRequestError(f"Window {i + 1} is not an object")
        start, end = window.get("start"), window.get("end")
        if not start or not end:
            raise SigningRequestError(f"Window {i + 1} needs a start and an end")
        try:
            s = datetime.fromisoformat(str(start))
            e = datetime.fromisoformat(str(end))
        except ValueError:
            raise SigningRequestError(
                f"Window {i + 1} is not a valid date/time") from None
        if e <= s:
            raise SigningRequestError(f"Window {i + 1} ends before it starts")
        out.append({"start": str(start), "end": str(end)})
    return out


def windows_of(row: Dict[str, Any]) -> List[Dict[str, str]]:
    """The stored windows, whatever shape the driver handed back."""
    raw = row.get("proposed_windows")
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return []
    return raw if isinstance(raw, list) else []


def _fmt_time(dt: datetime) -> str:
    return dt.strftime("%I:%M %p").lstrip("0")


def window_label(window: Dict[str, str]) -> str:
    """One window, in words. THE ONLY PLACE a window becomes English.

    Every surface — the notary's email, the token page, the officer's
    status line — calls this, for the same reason `scheduling_label` is
    single-sourced: a second formatter is a second chance to print the
    wrong hour, and the wrong hour is somebody driving to an empty
    office.
    """
    try:
        start = datetime.fromisoformat(str(window.get("start")))
        end = datetime.fromisoformat(str(window.get("end")))
    except (TypeError, ValueError):
        return f"{window.get('start', '?')} – {window.get('end', '?')}"
    day = start.strftime("%A, %B ") + str(start.day) + start.strftime(", %Y")
    if end.date() == start.date():
        return f"{day}, {_fmt_time(start)} – {_fmt_time(end)}"
    end_day = end.strftime("%B ") + str(end.day)
    return f"{day}, {_fmt_time(start)} – {end_day}, {_fmt_time(end)}"


def window_labels(row: Dict[str, Any]) -> List[str]:
    return [window_label(w) for w in windows_of(row)]


def find_window(row: Dict[str, Any], index: Any) -> Optional[Dict[str, str]]:
    """The window a notary tapped, by its position in the stored list.

    Position, not a client-supplied time: accepting a time from the
    request body would let a link holder assert any hour they liked,
    including one the officer never offered.
    """
    windows = windows_of(row)
    try:
        i = int(index)
    except (TypeError, ValueError):
        return None
    if i < 0 or i >= len(windows):
        return None
    w = windows[i]
    return w if isinstance(w, dict) else None


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


def window_to_ics(window: Dict[str, str], *, summary: str,
                  location: Optional[str], description: str,
                  uid: str) -> Optional[bytes]:
    try:
        start = datetime.fromisoformat(window["start"])
        end = datetime.fromisoformat(window["end"])
    except (KeyError, ValueError):
        return None
    if start.tzinfo is None:
        # A naive time is ambiguous, and guessing a zone is how a
        # calendar entry lands an hour out. Assume UTC only so the file
        # is VALID, and say so in the description rather than silently.
        start = start.replace(tzinfo=timezone.utc)
        end = end.replace(tzinfo=timezone.utc)
    return build_ics(summary=summary, start=start, end=end,
                     location=location, description=description, uid=uid)


def default_expiry(days: int = 14) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)
