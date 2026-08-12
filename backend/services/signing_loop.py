"""NOTARY2 — the coordination loop, and the three rules it must not bend.

═══ WHAT CHANGED FROM NOTARY1, AND WHY ═══

NOTARY1 built Option A: the officer relayed, the product coordinated
officer↔notary, and no signer was ever contacted. The owner reversed it,
and the reasoning is worth carrying here rather than only in the doctrine
file, because this module is where it becomes code:

    The signers are the scheduling constraint. Routing around them
    recreated the phone tag the feature exists to kill.

Option A priced the officer's relaying at zero. It is not zero; it is the
whole problem. A notary offers three windows, the officer phones two
signers, one can do Tuesday and one cannot, and she is back on the phone
to the notary. So the loop is now: notary posts availability → signers
pick or propose → convergence books it → the officer is TOLD.

═══ SIGNER CONTACT: ONE ROW, PURGED, NOWHERE ELSE (§13.1) ═══

Signers are consumers. They have no account and no way to ask us for
anything. So their contact details live on `signing_participants` and
nowhere else — not on `deeds`, not in the `parties` JSONB, not on `users`
or `partners` — they are purged on a schedule by a MECHANISM rather than
a discipline, and `display_name` survives the purge because a name is not
contact information and the record of who agreed to what must outlive our
ability to reach them.

NOTARY1's fail-closed sweep is ANSWERED here, not deleted: it moves from
"no signer contact anywhere" to "one purgeable row, no other table."

═══ §13 STANDS UNCHANGED ═══

BOOKED IS NOT HAPPENED. There is no auto-completion, no timer, and
nothing in this module infers a signing from a clock. `completed` remains
the officer's word. A booking is an arrangement several people agreed to;
whether anybody kept it is not something this system knows, and the
sentence-writing functions below exist so that no surface can quietly
start claiming otherwise.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence

# ── Vocabulary ───────────────────────────────────────────────────────
ROLE_NOTARY = "notary"
ROLE_SIGNER = "signer"
PARTY_ROLES = (ROLE_NOTARY, ROLE_SIGNER)

ORIGIN_NOTARY = "notary"
ORIGIN_SIGNER_PROPOSAL = "signer_proposal"
ORIGIN_OFFICER = "officer"
ORIGINS = (ORIGIN_NOTARY, ORIGIN_SIGNER_PROPOSAL, ORIGIN_OFFICER)

ANSWER_AVAILABLE = "available"
ANSWER_UNAVAILABLE = "unavailable"
ANSWERS = (ANSWER_AVAILABLE, ANSWER_UNAVAILABLE)

BOOKED_BY_CONVERGENCE = "convergence"
BOOKED_BY_OFFICER = "officer"
BOOKERS = (BOOKED_BY_CONVERGENCE, BOOKED_BY_OFFICER)

# ── DISPATCH (FLOW1 item 7): who actually said it ────────────────────
#
# A response row used to mean one thing: this participant answered. In
# dispatch the officer answers on her signers' behalf — she rang them,
# they said Tuesday, and she is putting that on the record so the
# notary's acceptance is the last answer needed.
#
# Without this distinction the row would CLAIM A SIGNER SPOKE when the
# officer did. That is the same error `booked_by` exists to prevent, one
# level down: applied to the answers a booking is built from rather than
# to the booking itself.
ASSERTED_BY_PARTICIPANT = "participant"
ASSERTED_BY_OFFICER = "officer"
ASSERTERS = (ASSERTED_BY_PARTICIPANT, ASSERTED_BY_OFFICER)


def asserted_by(response: Dict[str, Any]) -> str:
    """Read the asserter, defaulting to the participant.

    A row written before this column existed was written by the person it
    is about, so the default is a fact rather than a guess — and reading
    it through one function means no call site has to remember that.
    """
    return response.get("asserted_by") or ASSERTED_BY_PARTICIPANT


def rests_on_an_officer_assertion(responses: Sequence[Dict[str, Any]],
                                  window_id: int) -> bool:
    """Did any counted `available` on this window come from the officer?

    THE SURFACES NEED THIS AND SO DOES THE COPY. A window everybody
    personally agreed to and a window the officer vouched for are both
    booked, and they are not the same claim — so nothing may describe
    the second as "everyone agreed".
    """
    return any(
        int(r["window_id"]) == int(window_id)
        and r.get("answer") == ANSWER_AVAILABLE
        and asserted_by(r) == ASSERTED_BY_OFFICER
        for r in responses
    )

# Owner ruling: three, AGGREGATE across the request. Not per signer —
# two signers alternating twice each is six emails and the same deadlock
# a cap exists to prevent.
MAX_SIGNER_PROPOSALS = 3

# How long signer contact survives a finished request. Proposed default;
# the number is the owner's to set, and whatever it becomes must match
# whatever the privacy statement says, because that sentence converts
# this practice into a promise.
CONTACT_RETENTION_DAYS = 90

MAX_WINDOWS_PER_POST = 5


class SigningLoopError(ValueError):
    """A request we will not accept, carrying the reason a human needs."""


# ── Derived state (T-5's ruling, third application) ──────────────────

STATE_REQUESTED = "requested"
STATE_WINDOWS_POSTED = "windows_posted"
STATE_PARTIALLY_AGREED = "partially_agreed"
STATE_BOOKED = "booked"
STATE_CANCELLED = "cancelled"
STATE_EXPIRED = "expired"


#: The states in which a request is still somebody's problem. Cancelled
#: and expired are over; everything else is waiting on a human.
#:
#: CANCEL1 item 4 needs this and it is deliberately NOT a list the screen
#: keeps: "is this signing still live" is a judgement about the state
#: vocabulary, and the vocabulary lives here. A client-side
#: `!['cancelled','expired'].includes(state)` is that judgement copied,
#: and it is the copy that will be missed when a state is added.
TERMINAL_STATES = (STATE_CANCELLED, STATE_EXPIRED)


def is_live(state: str) -> bool:
    """Is this request still waiting on somebody."""
    return state not in TERMINAL_STATES


def request_state(request: Dict[str, Any], windows: Sequence[Dict[str, Any]],
                  responses: Sequence[Dict[str, Any]],
                  now: Optional[datetime] = None) -> str:
    """The state, COMPUTED. There is no status column and there must not be.

    Deliberately absent from the vocabulary: anything meaning the signing
    HAPPENED. A booked time that has passed is still `booked` — a clock
    moving is not evidence that three people met in a room, and §13 is
    the whole reason this function cannot say otherwise.
    """
    now = now or datetime.now(timezone.utc)
    if request.get("cancelled_at"):
        return STATE_CANCELLED
    if request.get("booked_at"):
        return STATE_BOOKED
    expires = request.get("expires_at")
    if expires and expires < now:
        return STATE_EXPIRED
    live = [w for w in windows if not w.get("declined_at")]
    if not live:
        return STATE_REQUESTED
    if any(r.get("answer") == ANSWER_AVAILABLE for r in responses):
        return STATE_PARTIALLY_AGREED
    return STATE_WINDOWS_POSTED


# ── Convergence ──────────────────────────────────────────────────────

def converged_window_id(participants: Sequence[Dict[str, Any]],
                        windows: Sequence[Dict[str, Any]],
                        responses: Sequence[Dict[str, Any]]) -> Optional[int]:
    """The window everybody said yes to, or None.

    THE RULE: a window books when it is not declined, the notary answered
    `available`, and EVERY live signer answered `available`. Revoked
    participants are excluded — a signer removed from the request cannot
    hold the others hostage — and a request with no signers cannot
    converge on the notary alone, because a signing with nobody to sign
    is not an arrangement anybody made.

    DISPATCH (FLOW1 item 7) DOES NOT CHANGE THAT RULE. An officer-
    asserted signer row counts, because it is an answer on the record —
    the officer rang them and is saying so. What it does NOT do is
    disappear: `asserted_by` travels with it, every surface can say who
    spoke, and `state_label` refuses to call such a booking "everyone
    agreed". The count is the same question; the provenance is a
    different one, and conflating them is what this column prevents.

    Earliest wins when two windows qualify. Not "the most recently
    answered": if three people are free at two times, the sooner one is
    the one they meant, and picking by answer order would make the
    outcome depend on who happened to click last.
    """
    live = [p for p in participants if not p.get("revoked_at")]
    notaries = [p for p in live if p.get("party_role") == ROLE_NOTARY]
    signers = [p for p in live if p.get("party_role") == ROLE_SIGNER]
    if not notaries or not signers:
        return None

    yes: Dict[int, set] = {}
    for r in responses:
        if r.get("answer") == ANSWER_AVAILABLE:
            yes.setdefault(int(r["window_id"]), set()).add(int(r["participant_id"]))

    needed = {int(p["id"]) for p in notaries[:1]} | {int(p["id"]) for p in signers}

    candidates = [
        w for w in windows
        if not w.get("declined_at") and needed <= yes.get(int(w["id"]), set())
    ]
    if not candidates:
        return None
    return int(min(candidates, key=lambda w: w["starts_at"])["id"])


def outstanding_parties(participants: Sequence[Dict[str, Any]],
                        window_id: int,
                        responses: Sequence[Dict[str, Any]]) -> List[str]:
    """Who has not answered on this window — names only, never addresses.

    Used to tell the officer what a request is waiting on. It returns
    display names because that is what she needs to chase somebody; it
    does not return contact details, because a status line is not a
    reason to widen what a surface carries.
    """
    answered = {
        int(r["participant_id"]) for r in responses
        if int(r["window_id"]) == int(window_id)
    }
    return [
        (p.get("display_name") or "Unnamed")
        for p in participants
        if not p.get("revoked_at") and int(p["id"]) not in answered
    ]


# ── The words, written once (§13, rule 3) ────────────────────────────

def state_label(request: Dict[str, Any], windows: Sequence[Dict[str, Any]],
                responses: Sequence[Dict[str, Any]],
                participants: Sequence[Dict[str, Any]],
                now: Optional[datetime] = None) -> str:
    """The sentence every surface renders, composed in ONE place.

    THE POINT, unchanged from NOTARY1: "booked" must never read as "will
    happen". The product knows an arrangement was made and knows nothing
    about whether it was kept. Every screen calls this rather than
    writing its own version, so the distinction cannot erode one surface
    at a time — and both suites pin that no screen composes its own.
    """
    state = request_state(request, windows, responses, now=now)
    if state == STATE_CANCELLED:
        return "Signing request cancelled"
    if state == STATE_EXPIRED:
        return "Signing request expired — nobody agreed a time before the links lapsed"
    if state == STATE_BOOKED:
        when = _fmt_instant(request.get("booked_at"), request.get("tz_name"))
        if request.get("booked_by") == BOOKED_BY_OFFICER:
            return f"You recorded a signing time of {when}"
        # DISPATCH, and this branch is the reason `asserted_by` exists.
        #
        # "Everyone agreed" is a claim about who spoke. When the officer
        # recorded her signers' agreement and the notary accepted, the
        # booking is real and that sentence is not: the signers did not
        # answer this product, she did. So the sentence says what
        # actually happened, and the fact that it CAN say it is the whole
        # of the column's justification.
        booked_window = _booked_window_id(request, windows, responses)
        if booked_window is not None and rests_on_an_officer_assertion(
                responses, booked_window):
            notary = next((p for p in participants
                           if p.get("party_role") == ROLE_NOTARY), None)
            who = (notary or {}).get("display_name") or "the notary"
            return (f"Booked for {when} — you recorded the signers' "
                    f"agreement and {who} accepted")
        return f"Everyone agreed on {when}"
    if state == STATE_REQUESTED:
        notary = next((p for p in participants
                       if p.get("party_role") == ROLE_NOTARY), None)
        who = (notary or {}).get("display_name") or "The notary"
        # §11.1: a name is not a pronoun. This said "the times SHE is
        # free" about a notary whose pronouns nobody has told us — the
        # same defect FLOW1 swept out of the email templates, surviving
        # in the one function that writes every surface's sentence
        # because that sweep read utils/ and templates/ and not services/.
        return f"Waiting on {who} to post the times they are free"
    live = [w for w in windows if not w.get("declined_at")]

    # DISPATCH, before the notary has answered. Without this branch the
    # officer's agenda would read "1 times offered — waiting on 1 more
    # person" about a request where she chose the time, told her signers,
    # and is waiting on one specific professional to accept. True, and
    # useless, and it describes her own dispatch back to her as though
    # somebody else had offered it.
    dispatch = next((w for w in live
                     if w.get("origin") == ORIGIN_OFFICER
                     and rests_on_an_officer_assertion(responses, int(w["id"]))),
                    None)
    if dispatch is not None:
        notary = next((p for p in participants
                       if p.get("party_role") == ROLE_NOTARY), None)
        notary_id = int(notary["id"]) if notary else None
        accepted = any(
            int(r["window_id"]) == int(dispatch["id"])
            and notary_id is not None and int(r["participant_id"]) == notary_id
            and r.get("answer") == ANSWER_AVAILABLE
            for r in responses)
        if not accepted:
            who = (notary or {}).get("display_name") or "the notary"
            when = _fmt_instant(dispatch.get("starts_at"), request.get("tz_name"))
            return f"You proposed {when} — waiting on {who} to accept"

    if state == STATE_PARTIALLY_AGREED:
        pending = _pending_count(participants, live, responses)
        if pending == 1:
            return f"{len(live)} times offered — waiting on 1 more person"
        return f"{len(live)} times offered — waiting on {pending} more people"
    return f"{len(live)} times offered — nobody has answered yet"


def _booked_window_id(request: Dict[str, Any],
                      windows: Sequence[Dict[str, Any]],
                      responses: Sequence[Dict[str, Any]]) -> Optional[int]:
    """Which window a booked request settled on.

    `signing_requests` records WHEN it booked, not WHICH — the window is
    recoverable because a booked request has exactly one window whose
    start matches `booked_at`. Kept as a lookup rather than a new column
    on purpose: a second place to write the same fact is a second place
    for it to disagree with itself.
    """
    booked_at = request.get("booked_at")
    if not booked_at:
        return None
    for w in windows:
        if w.get("starts_at") == booked_at:
            return int(w["id"])
    return None


def _pending_count(participants: Sequence[Dict[str, Any]],
                   windows: Sequence[Dict[str, Any]],
                   responses: Sequence[Dict[str, Any]]) -> int:
    """People who have not answered on ANY live window."""
    answered = {int(r["participant_id"]) for r in responses
                if any(int(w["id"]) == int(r["window_id"]) for w in windows)}
    return len([p for p in participants
                if not p.get("revoked_at") and int(p["id"]) not in answered])


def proposal_refusal(officer_name: Optional[str]) -> str:
    """The honest sentence when the round-trip cap is reached.

    Owner ruling: it names the officer. "This has not converged" tells a
    signer nothing they can act on; "Dana will call you" tells them the
    thing that is about to happen, which is also true — the officer is
    notified in the same breath.
    """
    who = (officer_name or "").strip() or "The person coordinating this signing"
    return (f"These times still have not worked for everyone. {who} will call "
            f"you to sort it out — no need to do anything else here.")


# ── Windows ──────────────────────────────────────────────────────────

def parse_window(raw: Dict[str, Any]) -> Dict[str, datetime]:
    """One `{start, end}` with offsets, into instants.

    An offset is REQUIRED. NOTARY1 accepted naive times and assumed UTC,
    which produced a calendar file up to eight hours out — silently, on
    the one artifact whose entire job is being at the right moment. A
    time without a zone is not a time, and guessing one is how somebody
    drives to an empty office.
    """
    start, end = raw.get("start"), raw.get("end")
    if not start or not end:
        raise SigningLoopError("A time needs a start and an end")
    try:
        s = datetime.fromisoformat(str(start))
        e = datetime.fromisoformat(str(end))
    except ValueError:
        raise SigningLoopError("That is not a valid date and time") from None
    if s.tzinfo is None or e.tzinfo is None:
        raise SigningLoopError(
            "A time must carry its UTC offset — a wall-clock time without a "
            "zone is not a time, and guessing one lands somebody at an empty "
            "office an hour early")
    if e <= s:
        raise SigningLoopError("That time ends before it starts")
    return {"starts_at": s, "ends_at": e}


def parse_windows(raw: Any) -> List[Dict[str, datetime]]:
    if not isinstance(raw, list) or not raw:
        raise SigningLoopError("Offer at least one time")
    if len(raw) > MAX_WINDOWS_PER_POST:
        raise SigningLoopError(
            f"At most {MAX_WINDOWS_PER_POST} times at once")
    return [parse_window(w) for w in raw]


def _fmt_instant(value: Any, tz_name: Optional[str]) -> str:
    """An instant in the REQUEST's zone, in words.

    The zone comes from the request rather than from the server or the
    reader's browser: a signing happens at a place, and everybody
    involved should read the same clock — the one on the wall where they
    are going.
    """
    if not hasattr(value, "strftime"):
        return str(value)
    dt = value
    try:
        from zoneinfo import ZoneInfo
        if tz_name:
            dt = value.astimezone(ZoneInfo(tz_name))
    except Exception:
        # An unknown zone is not a reason to fail a status line. Render
        # the instant we have and let it be plainly UTC rather than
        # pretending to a locality we could not resolve.
        pass
    hour = dt.strftime("%I:%M %p").lstrip("0")
    return f"{dt.strftime('%A, %B')} {dt.day}, {dt.year} at {hour}"


def window_label(window: Dict[str, Any], tz_name: Optional[str]) -> str:
    """One window, in words, in the request's zone. The only place a
    window becomes English — see state_label for why that matters."""
    start, end = window.get("starts_at"), window.get("ends_at")
    if not hasattr(start, "strftime"):
        return f"{start} – {end}"
    text = _fmt_instant(start, tz_name)
    if hasattr(end, "strftime"):
        try:
            from zoneinfo import ZoneInfo
            e = end.astimezone(ZoneInfo(tz_name)) if tz_name else end
        except Exception:
            e = end
        text += f" – {e.strftime('%I:%M %p').lstrip('0')}"
    return text


def default_expiry(days: int = 21) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)
