"""NOTARY2 — the coordination loop's routes.

Three parties, three postures, and the differences are the design:

  OFFICER — session-authenticated. Creates the request, adds signers,
    watches, and may override the booked time. She does NOT gate the
    final time: notary + signers converging books it and she is told
    (owner ruling). Her override is recorded as HER assertion, distinct
    from the parties' agreement.

  NOTARY — token. Posts the times she is free, accepts or declines a
    signer's proposal, and sees the package she needs at the table.

  SIGNER — token, and THE FIRST CONSUMER SURFACE THIS PRODUCT HAS EVER
    HAD. Picks from the offered times or proposes one, up to the cap.
    Sees the street line, who is coordinating, who is coming, and the
    times. Nothing else — `services/signing_surfaces.py` builds that
    package from an allowlist and both the builder and the suite assert
    the key set by equality.

Every token route is unauthenticated and therefore throttled, per-token
and per-IP, the RED-H1.2 treatment. A token that can be enumerated is a
property address disclosed, and these are consumers' addresses now.
"""
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

import db
from auth import get_current_user_id
from services import officer_queue
from services import signing_loop as loop
from services import signing_purge, signing_surfaces
from utils.throttle import client_key, throttle

router = APIRouter()

APP_URL = lambda: os.getenv("FRONTEND_URL", "https://deedpro-frontend-new.vercel.app")  # noqa: E731


# ══════════════════════════════════════════════════════════════════════
# Payloads
# ══════════════════════════════════════════════════════════════════════

class SignerIn(BaseModel):
    """One signer on the request.

    Contact details are PER-REQUEST and land on `signing_participants`
    only (§13.1). Nothing here reaches `deeds`, the `parties` JSONB, or
    any profile table, and the suite sweeps the schema to prove it.
    """
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=320)
    phone: Optional[str] = None


class ProposedTime(BaseModel):
    """FLOW1 item 7 — the time the OFFICER is proposing (dispatch).

    Both ends carry a UTC offset, same as every other time in this
    feature: a bare wall-clock time makes the server guess a zone, which
    is how a calendar entry lands an hour out and somebody arrives at an
    empty office.
    """
    start: str
    end: str


class CreateSigningRequest(BaseModel):
    deed_id: int
    notary_email: str
    notary_name: Optional[str] = None
    notary_company: Optional[str] = None
    notary_partner_id: Optional[str] = None
    signers: List[SignerIn]
    location: Optional[str] = None
    # IANA, not an offset. A signing happens at one place and everybody
    # involved reads the clock on the wall where they are going.
    tz_name: str = "America/Los_Angeles"
    expires_in_days: int = 21
    # ── DISPATCH ──────────────────────────────────────────────────────
    #
    # Present  → the officer has a time and has already spoken to her
    #            signers. The notary is asked to ACCEPT an assignment.
    # Absent   → the availability loop, unchanged: the notary posts times
    #            and the signers pick.
    #
    # This is a FIELD rather than a mode flag because the presence of a
    # time IS the difference. A `mode: "dispatch" | "negotiate"` selector
    # would make her classify her own intent for the database's benefit
    # before acting on it — the same objection that kept `share_kind` off
    # the share modals.
    proposed_time: Optional[ProposedTime] = None
    # Dispatch only. She is asserting that she already has her signers'
    # agreement; the product records WHO said so rather than pretending
    # the signers answered it. Defaults to False so that a client which
    # sends a time without thinking about this gets a window the signers
    # must still answer — the safe half of the fork.
    signers_already_agreed: bool = False


class WindowIn(BaseModel):
    start: str
    end: str


class PostWindows(BaseModel):
    windows: List[WindowIn]


class AnswerIn(BaseModel):
    window_id: int
    answer: str


class ProposeIn(BaseModel):
    start: str
    end: str


class OfficerOverride(BaseModel):
    """Owner ruling: she retains an override. Recorded as her assertion."""
    window_id: Optional[int] = None
    booked_at: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════
# Loading
# ══════════════════════════════════════════════════════════════════════

def _rows(cur) -> List[Dict[str, Any]]:
    return [dict(r) for r in (cur.fetchall() or [])]


def _load(request_id: int) -> Dict[str, Any]:
    """The whole aggregate in one place. Four small queries beat four
    call sites each remembering which pieces convergence needs."""
    with db.conn.cursor() as cur:
        cur.execute("SELECT * FROM signing_requests WHERE id = %s", (request_id,))
        req = cur.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Signing request not found")
        req = dict(req)
        cur.execute("SELECT * FROM signing_participants WHERE signing_request_id = %s "
                    "ORDER BY id", (request_id,))
        participants = _rows(cur)
        cur.execute("SELECT * FROM signing_windows WHERE signing_request_id = %s "
                    "ORDER BY starts_at", (request_id,))
        windows = _rows(cur)
        cur.execute("SELECT r.* FROM signing_responses r JOIN signing_windows w "
                    "ON w.id = r.window_id WHERE w.signing_request_id = %s",
                    (request_id,))
        responses = _rows(cur)
        cur.execute("SELECT * FROM deeds WHERE id = %s", (req["deed_id"],))
        deed = dict(cur.fetchone() or {})
        cur.execute("SELECT id, full_name, email FROM users WHERE id = %s",
                    (req["officer_user_id"],))
        officer = dict(cur.fetchone() or {})
    return {"request": req, "participants": participants, "windows": windows,
            "responses": responses, "deed": deed, "officer": officer}


def _participant_by_token(token: str, http_request: Request) -> Dict[str, Any]:
    """Resolve a token to a participant, with the link's own scoping.

    Throttled BEFORE the database is touched: an unauthenticated route
    that queries first is a route somebody can use to measure us. The
    UUID guard is the same reason NOTARY1 has one — a malformed token is
    a Postgres TYPE ERROR, not a miss, and on a shared connection that
    aborts the whole request's transaction.
    """
    throttle(f"signing-token:{client_key(http_request)}", limit=60, window_seconds=60)
    try:
        uuid.UUID(token)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail="This link is not valid")
    throttle(f"signing-token:{token}", limit=120, window_seconds=60)

    with db.conn.cursor() as cur:
        cur.execute("SELECT * FROM signing_participants WHERE token = %s", (token,))
        me = cur.fetchone()
    if not me:
        raise HTTPException(status_code=404, detail="This link is not valid")
    me = dict(me)
    if me.get("revoked_at"):
        raise HTTPException(status_code=403, detail="This link has been withdrawn")
    if me.get("expires_at") and me["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="This link has expired")
    return me


def _owned_request(request_id: int, user_id: int) -> Dict[str, Any]:
    world = _load(request_id)
    if world["request"]["officer_user_id"] != user_id:
        # 404 not 403 — see _owned_deed_or_404's reasoning: "it exists but
        # is not yours" turns id enumeration into an inventory.
        raise HTTPException(status_code=404, detail="Signing request not found")
    return world


# ══════════════════════════════════════════════════════════════════════
# Officer
# ══════════════════════════════════════════════════════════════════════

@router.post("/signing-requests/v2")
def create_signing_request(payload: CreateSigningRequest,
                           user_id: int = Depends(get_current_user_id)):
    """Create the request and mint one token per participant."""
    from routers.sharing import _owned_deed_or_404

    deed = _owned_deed_or_404(payload.deed_id, user_id)
    if not payload.signers:
        raise HTTPException(status_code=400,
                            detail="A signing needs at least one signer")
    if len(payload.signers) > 6:
        raise HTTPException(status_code=400,
                            detail="At most six signers on one request")

    expires = datetime.now(timezone.utc) + timedelta(days=max(1, min(90, payload.expires_in_days)))

    # Parsed BEFORE anything is written. A time we would refuse must not
    # leave a half-made request behind, and `parse_windows` refuses a
    # naive time outright rather than assuming a zone.
    dispatch_window = None
    if payload.proposed_time is not None:
        try:
            dispatch_window = loop.parse_windows(
                [{"start": payload.proposed_time.start,
                  "end": payload.proposed_time.end}])[0]
        except loop.SigningLoopError as e:
            raise HTTPException(status_code=400, detail=str(e))
    elif payload.signers_already_agreed:
        # An assertion about a time, with no time. Refused rather than
        # ignored: silently dropping it would record nothing and tell her
        # nothing, and she would believe her signers were on the record.
        raise HTTPException(
            status_code=400,
            detail="You can only record the signers' agreement alongside a "
                   "proposed time")

    try:
        with db.conn.cursor() as cur:
            cur.execute(
                """INSERT INTO signing_requests
                       (deed_id, officer_user_id, location, tz_name, expires_at)
                   VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (payload.deed_id, user_id,
                 payload.location or deed.get("property_address"),
                 payload.tz_name, expires))
            request_id = cur.fetchone()["id"]

            people = [(loop.ROLE_NOTARY, payload.notary_name, payload.notary_company,
                       payload.notary_email, None, payload.notary_partner_id)]
            people += [(loop.ROLE_SIGNER, s.name, None, s.email, s.phone, None)
                       for s in payload.signers]
            tokens = {}
            for role, name, company, email, phone, partner_id in people:
                token = str(uuid.uuid4())
                cur.execute(
                    """INSERT INTO signing_participants
                           (signing_request_id, party_role, display_name,
                            company_name, email, phone, partner_id, token, expires_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    (request_id, role, name, company, email, phone,
                     partner_id, token, expires))
                tokens[cur.fetchone()["id"]] = (role, token, name, email)

            # ── DISPATCH: the officer's time, and who agreed to it ─────
            if dispatch_window is not None:
                cur.execute(
                    """INSERT INTO signing_windows
                           (signing_request_id, starts_at, ends_at, origin,
                            proposed_by)
                       VALUES (%s, %s, %s, %s, NULL) RETURNING id""",
                    (request_id, dispatch_window["starts_at"],
                     dispatch_window["ends_at"], loop.ORIGIN_OFFICER))
                window_id = cur.fetchone()["id"]
                # `proposed_by` is NULL because the officer is not a
                # participant. #156's migration pointed officer windows at
                # the NOTARY, which reads as her having offered a time she
                # has never seen; `origin` carried the truth and the column
                # contradicted it.

                if payload.signers_already_agreed:
                    # THE ROW SAYS WHO SPOKE. She rang them; they said
                    # this works; she is putting that on the record so the
                    # notary's acceptance is the last answer needed. It is
                    # written as HER assertion, not as theirs — which is
                    # the entire reason `asserted_by` exists.
                    for pid, (role, _t, _n, _e) in tokens.items():
                        if role != loop.ROLE_SIGNER:
                            continue
                        cur.execute(
                            """INSERT INTO signing_responses
                                   (window_id, participant_id, answer, asserted_by)
                               VALUES (%s, %s, %s, %s)""",
                            (window_id, pid, loop.ANSWER_AVAILABLE,
                             loop.ASSERTED_BY_OFFICER))
                # The NOTARY gets no such row. She has not been asked yet,
                # and an assignment nobody has accepted is not a booking.
        db.conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        try:
            db.conn.rollback()
        except Exception:
            pass
        print(f"[NOTARY2] ❌ could not create signing request: {e}")
        # §4: a request we did not store is not a request. Nobody gets a
        # link to a row that does not exist.
        raise HTTPException(status_code=500, detail="Could not create the signing request")

    # Ask the notary. The SIGNERS are not emailed yet — in EITHER flow,
    # and for the same reason each time: there is nothing for them to do.
    # Under negotiation there are no times to pick from; under dispatch
    # the time is not settled until the notary accepts, and telling a
    # consumer their signing is at 10am on Tuesday before anybody has
    # agreed to attend is §13's error committed by email. They are told
    # when it books.
    _invite_notary(request_id, dispatched=dispatch_window is not None)

    return {
        "success": True,
        "signing_request_id": request_id,
        "expires_at": expires.isoformat(),
        "participants": [
            {"id": pid, "party_role": role, "name": name,
             "link": f"{APP_URL()}/signing/{token}"}
            for pid, (role, token, name, _email) in tokens.items()
        ],
        "next": ("the notary accepts or declines the time you proposed"
                 if dispatch_window is not None
                 else "the notary posts the times they are free"),
    }


@router.get("/signing-requests/v2/{request_id}")
def officer_view(request_id: int, user_id: int = Depends(get_current_user_id)):
    world = _owned_request(request_id, user_id)
    return _officer_payload(world)


@router.get("/signing-requests/v2")
def officer_agenda(user_id: int = Depends(get_current_user_id)):
    """Part D — every signing across every file, soonest first.

    An AGENDA rather than a month grid (owner-accepted cut). A list
    sorted by date answers "what is coming up and what is stuck"
    completely; the grid is the attractive version of the same facts.

    Read-only aggregation. No new state, no availability engine.
    """
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT sr.*, d.property_address, d.deed_type,
                   (SELECT display_name FROM signing_participants
                     WHERE signing_request_id = sr.id AND party_role = 'notary'
                     ORDER BY id LIMIT 1) AS notary_name
              FROM signing_requests sr
              JOIN deeds d ON d.id = sr.deed_id
             WHERE sr.officer_user_id = %s
             ORDER BY COALESCE(sr.booked_at, sr.expires_at) ASC
        """, (user_id,))
        rows = _rows(cur)

        out = []
        for row in rows:
            cur.execute("SELECT * FROM signing_windows WHERE signing_request_id = %s",
                        (row["id"],))
            windows = _rows(cur)
            cur.execute("SELECT r.* FROM signing_responses r JOIN signing_windows w "
                        "ON w.id = r.window_id WHERE w.signing_request_id = %s",
                        (row["id"],))
            responses = _rows(cur)
            cur.execute("SELECT * FROM signing_participants WHERE signing_request_id = %s",
                        (row["id"],))
            participants = _rows(cur)
            out.append({
                "id": row["id"],
                "deed_id": row["deed_id"],
                "property_address": row.get("property_address"),
                "deed_type": row.get("deed_type"),
                "notary_name": row.get("notary_name"),
                "state": loop.request_state(row, windows, responses),
                # The server's sentence, rendered verbatim by every
                # surface — §13 rule 3.
                "summary": loop.state_label(row, windows, responses, participants),
                "booked_at": _iso(row.get("booked_at")),
                "booked_by": row.get("booked_by"),
                # FLOW1 item 4: WHEN SHE ASKED. The agenda's stuck signal
                # is "nobody has moved in five days", and until now the
                # payload carried no created_at — so the screen
                # reconstructed the age as `expires_at minus 21 days`,
                # duplicating default_expiry()'s constant as a magic
                # number in another language. Changing the default expiry
                # would have silently re-aimed every stuck badge. Same
                # family as item 0: a fact the screen shows, that the
                # server never sent, inferred.
                "created_at": _iso(row.get("created_at")),
                # DASH1: WHETHER IT HAS GONE QUIET, decided here.
                # The agenda page carried `STUCK_AFTER_DAYS = 5` in
                # TypeScript; the dashboard needed the same judgement, and
                # a second threshold in Python for the same question is
                # how the partner category list came to have four copies.
                # One number, in services/officer_queue.py, and the
                # screens render what they are told.
                "days_waiting": officer_queue.days_since(row.get("created_at")),
                "stale": (loop.request_state(row, windows, responses)
                          in (loop.STATE_REQUESTED, loop.STATE_WINDOWS_POSTED)
                          and officer_queue.is_stale(
                              officer_queue.days_since(row.get("created_at")))),
                "expires_at": _iso(row.get("expires_at")),
                "signers": len([p for p in participants
                                if p["party_role"] == loop.ROLE_SIGNER]),
            })

    # Housekeeping rides an authenticated read rather than a public one:
    # the officer's own page is a fine place to spend 20ms, and a
    # consumer's token view is not.
    signing_purge.sweep_if_due(db.conn)
    return out


@router.post("/signing-requests/v2/{request_id}/override")
def officer_override(request_id: int, payload: OfficerOverride,
                     user_id: int = Depends(get_current_user_id)):
    """She sets or changes the time herself.

    Recorded as `booked_by = 'officer'`, which is the whole point: the
    record must never claim the parties agreed to a time she chose. Both
    assertions are real; they are different assertions.
    """
    world = _owned_request(request_id, user_id)
    if payload.window_id is not None:
        window = next((w for w in world["windows"]
                       if int(w["id"]) == int(payload.window_id)), None)
        if window is None:
            raise HTTPException(status_code=400, detail="That is not one of the times offered")
        when = window["starts_at"]
    elif payload.booked_at:
        try:
            when = datetime.fromisoformat(payload.booked_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400,
                                detail="booked_at must be an ISO-8601 date and time")
        if when.tzinfo is None:
            raise HTTPException(
                status_code=400,
                detail="That time needs its UTC offset — a wall-clock time "
                       "without a zone is not a time")
    else:
        raise HTTPException(status_code=400, detail="Give a time or one of the offered windows")

    with db.conn.cursor() as cur:
        # No `WHERE booked_at IS NULL` guard here, deliberately, and the
        # difference from convergence is the point: convergence writes
        # once and never argues with itself, while an override is the
        # officer CORRECTING the record — including a booking that
        # already exists.
        cur.execute("""UPDATE signing_requests
                          SET booked_at = %s, booked_by = %s,
                              booked_asserted_at = now(), updated_at = now()
                        WHERE id = %s""",
                    (when, loop.BOOKED_BY_OFFICER, request_id))
    db.conn.commit()
    return _officer_payload(_load(request_id))


MAX_REMINDERS = 3


@router.post("/signing-requests/v2/{request_id}/remind")
def officer_remind(request_id: int, user_id: int = Depends(get_current_user_id)):
    """Nudge whoever has not answered. OFFICER-TRIGGERED ONLY, and capped.

    Not automatic, per the ruling — and the reason is worth stating,
    because "send a reminder after 48h" is the obvious feature. Half the
    parties here are CONSUMERS who never signed up. An uncapped automatic
    sender pointed at somebody's client is a spam vector aimed through
    our own customer, and she is the one who would be blamed for it. She
    decides when a nudge is appropriate; she knows whether she has
    already phoned them.

    Capped at three per participant regardless, because "she decides" is
    not a defence if the button can be held down.

    Only people who have ANSWERED NOTHING are reminded. Somebody who said
    "not that time" has answered; re-asking them the same question is how
    a product teaches people to ignore it.
    """
    world = _owned_request(request_id, user_id)
    req = world["request"]
    if req.get("booked_at") or req.get("cancelled_at"):
        raise HTTPException(status_code=409,
                            detail="This signing is settled — there is nobody to chase")

    live_windows = [w for w in world["windows"] if not w.get("declined_at")]
    answered = {int(r["participant_id"]) for r in world["responses"]}
    tz = req.get("tz_name")
    labels = [loop.window_label(w, tz) for w in live_windows]
    officer_name, company = _officer_bits(world)
    notary = next(iter(_party(world, loop.ROLE_NOTARY)), {})
    street = (world["deed"].get("property_address") or "").split(",")[0].strip()

    sent, skipped = [], []
    from utils.notifications import send_signing_reminder
    for p in world["participants"]:
        if p.get("revoked_at") or not p.get("email"):
            continue
        if int(p["id"]) in answered:
            skipped.append({"name": p.get("display_name"), "why": "already answered"})
            continue
        if int(p.get("reminders_sent") or 0) >= MAX_REMINDERS:
            skipped.append({"name": p.get("display_name"), "why": "reminded three times"})
            continue
        consumer = p["party_role"] == loop.ROLE_SIGNER
        # A signer with no times to look at cannot act on a reminder, so
        # chasing them would be noise aimed at the wrong person — the
        # notary is who the request is waiting on.
        if consumer and not labels:
            skipped.append({"name": p.get("display_name"), "why": "no times posted yet"})
            continue
        ok, reason = send_signing_reminder(
            recipient_email=p["email"],
            recipient_name=p.get("display_name") or "",
            officer_name=officer_name, officer_company=company,
            notary_name=notary.get("display_name"),
            property_text=street if consumer else (world["deed"].get("property_address") or ""),
            window_texts=labels, link=_link(p), is_consumer=consumer)
        # The ATTEMPT counts, not the delivery — fail-closed, because
        # this is a spam cap pointed at consumers. "The transport
        # reported an error" is not proof nothing arrived (a timeout
        # after acceptance looks identical to a rejection), and the cost
        # of the two mistakes is asymmetric: undercounting means somebody
        # gets a fourth email they did not consent to, overcounting means
        # the officer picks up the phone one nudge early.
        with db.conn.cursor() as cur:
            cur.execute("UPDATE signing_participants SET reminders_sent = "
                        "reminders_sent + 1, updated_at = now() WHERE id = %s",
                        (p["id"],))
        sent.append({"name": p.get("display_name"), "delivered": ok, "reason": reason})
    db.conn.commit()
    return {"success": True, "sent": sent, "skipped": skipped,
            "remaining_per_person": MAX_REMINDERS}


@router.post("/signing-requests/v2/{request_id}/cancel")
def officer_cancel(request_id: int, user_id: int = Depends(get_current_user_id)):
    _owned_request(request_id, user_id)
    with db.conn.cursor() as cur:
        cur.execute("UPDATE signing_requests SET cancelled_at = now(), "
                    "updated_at = now() WHERE id = %s AND cancelled_at IS NULL",
                    (request_id,))
        cur.execute("UPDATE signing_participants SET revoked_at = now(), "
                    "updated_at = now() WHERE signing_request_id = %s "
                    "AND revoked_at IS NULL", (request_id,))
    db.conn.commit()
    return _officer_payload(_load(request_id))


def _officer_payload(world: Dict[str, Any]) -> Dict[str, Any]:
    """Her view. Wider than the token surfaces because she typed these
    people in — but it still shows what each party can see, so that "what
    does the signer get" is answerable without reading this file."""
    req, parts = world["request"], world["participants"]
    windows, responses = world["windows"], world["responses"]
    tz = req.get("tz_name")
    return {
        "id": req["id"],
        "deed_id": req["deed_id"],
        "property_address": world["deed"].get("property_address"),
        "tz_name": tz,
        "state": loop.request_state(req, windows, responses),
        "summary": loop.state_label(req, windows, responses, parts),
        "booked_at": _iso(req.get("booked_at")),
        "booked_by": req.get("booked_by"),
        "booked_asserted_at": _iso(req.get("booked_asserted_at")),
        "created_at": _iso(req.get("created_at")),
        "expires_at": _iso(req.get("expires_at")),
        "cancelled_at": _iso(req.get("cancelled_at")),
        "proposals_remaining": max(0, loop.MAX_SIGNER_PROPOSALS
                                   - int(req.get("signer_proposals") or 0)),
        "participants": [
            {"id": p["id"], "party_role": p["party_role"],
             "name": p.get("display_name"), "email": p.get("email"),
             "company": p.get("company_name"),
             "link": f"{APP_URL()}/signing/{p['token']}",
             "viewed_at": _iso(p.get("last_viewed_at")),
             "revoked": bool(p.get("revoked_at")),
             "contact_purged": bool(p.get("contact_purged_at"))}
            for p in parts
        ],
        "windows": [
            {"id": w["id"], "label": loop.window_label(w, tz),
             "origin": w.get("origin"), "declined": bool(w.get("declined_at")),
             "waiting_on": loop.outstanding_parties(parts, int(w["id"]), responses)}
            for w in windows
        ],
    }


def _iso(value: Any) -> Any:
    return value.isoformat() if hasattr(value, "isoformat") else value


# ══════════════════════════════════════════════════════════════════════
# Token surfaces
# ══════════════════════════════════════════════════════════════════════

@router.get("/signing/{token}")
def token_view(token: str, http_request: Request):
    """One route, two packages. Which one you get is decided by the row
    your token resolves to, never by a query parameter."""
    me = _participant_by_token(token, http_request)
    world = _load(me["signing_request_id"])

    with db.conn.cursor() as cur:
        cur.execute("UPDATE signing_participants SET last_viewed_at = now() "
                    "WHERE id = %s", (me["id"],))
    db.conn.commit()

    if me["party_role"] == loop.ROLE_NOTARY:
        return signing_surfaces.notary_package(
            request=world["request"], me=me, participants=world["participants"],
            windows=world["windows"], responses=world["responses"],
            deed=world["deed"], officer=world["officer"], token=token)
    return signing_surfaces.signer_package(
        request=world["request"], me=me, participants=world["participants"],
        windows=world["windows"], responses=world["responses"],
        deed=world["deed"], officer=world["officer"])


@router.post("/signing/{token}/windows")
def notary_post_windows(token: str, payload: PostWindows, http_request: Request):
    """The notary posts the times she is free. Notary-only."""
    me = _participant_by_token(token, http_request)
    if me["party_role"] != loop.ROLE_NOTARY:
        raise HTTPException(status_code=403,
                            detail="Only the notary posts availability")
    try:
        parsed = loop.parse_windows([w.model_dump() for w in payload.windows])
    except loop.SigningLoopError as e:
        raise HTTPException(status_code=400, detail=str(e))

    with db.conn.cursor() as cur:
        for w in parsed:
            cur.execute(
                """INSERT INTO signing_windows
                       (signing_request_id, starts_at, ends_at, origin, proposed_by)
                   VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (me["signing_request_id"], w["starts_at"], w["ends_at"],
                 loop.ORIGIN_NOTARY, me["id"]))
            window_id = cur.fetchone()["id"]
            # Posting a time IS saying she is free then. Making her then
            # tick her own windows would be the product asking a question
            # it already has the answer to.
            cur.execute(
                """INSERT INTO signing_responses (window_id, participant_id, answer)
                   VALUES (%s, %s, %s)
                   ON CONFLICT (window_id, participant_id) DO UPDATE
                       SET answer = EXCLUDED.answer, asserted_at = now()""",
                (window_id, me["id"], loop.ANSWER_AVAILABLE))
    db.conn.commit()
    _book_if_converged(me["signing_request_id"])
    # Tell the signers only if there is still a question for them.
    #
    # The first version keyed off `_book_if_converged`'s return, which was
    # wrong in a way a test caught: that function returns None BOTH when
    # nothing converged AND when the request was already booked, so
    # posting a spare time to a settled request emailed every signer
    # "pick one" for a signing that was done. Two different situations
    # behind one falsy value.
    _tell_signers_windows_posted(me["signing_request_id"])
    return token_view(token, http_request)


@router.post("/signing/{token}/answer")
def answer_window(token: str, payload: AnswerIn, http_request: Request):
    """Anybody with a live token answers one window.

    A signer saying yes may be the answer that books it. The notary
    saying yes to a signer's proposal is how she accepts one.
    """
    me = _participant_by_token(token, http_request)
    throttle(f"signing-answer:{token}", limit=30, window_seconds=60)
    if payload.answer not in loop.ANSWERS:
        raise HTTPException(status_code=400, detail="Answer must be available or unavailable")

    with db.conn.cursor() as cur:
        cur.execute("SELECT * FROM signing_windows WHERE id = %s AND "
                    "signing_request_id = %s",
                    (payload.window_id, me["signing_request_id"]))
        window = cur.fetchone()
        if not window:
            raise HTTPException(status_code=404, detail="That time is not on this request")
        if window["declined_at"]:
            raise HTTPException(status_code=409, detail="That time is no longer offered")
        cur.execute(
            """INSERT INTO signing_responses (window_id, participant_id, answer)
               VALUES (%s, %s, %s)
               ON CONFLICT (window_id, participant_id) DO UPDATE
                   SET answer = EXCLUDED.answer, asserted_at = now()""",
            (payload.window_id, me["id"], payload.answer))
    db.conn.commit()
    _book_if_converged(me["signing_request_id"])
    return token_view(token, http_request)


@router.post("/signing/{token}/propose")
def signer_propose(token: str, payload: ProposeIn, http_request: Request):
    """A signer offers a time the notary did not.

    THIS CREATES A PROPOSAL, NOT A BOOKING (owner ruling). It lands as a
    window the notary must accept — she answers `available` on it, which
    may immediately converge — or decline.
    """
    me = _participant_by_token(token, http_request)
    if me["party_role"] != loop.ROLE_SIGNER:
        raise HTTPException(status_code=403,
                            detail="The notary posts availability rather than proposing")
    throttle(f"signing-propose:{token}", limit=10, window_seconds=3600)

    world = _load(me["signing_request_id"])
    req = world["request"]
    if req.get("booked_at"):
        raise HTTPException(status_code=409, detail="A time is already agreed")

    used = int(req.get("signer_proposals") or 0)
    if used >= loop.MAX_SIGNER_PROPOSALS:
        # The honest refusal, naming the officer (owner ruling). An
        # unbounded thread is how a scheduling tool becomes a chat app,
        # and the graceful degradation is the phone call that works.
        raise HTTPException(
            status_code=409,
            detail=loop.proposal_refusal(world["officer"].get("full_name")))

    try:
        parsed = loop.parse_window(payload.model_dump())
    except loop.SigningLoopError as e:
        raise HTTPException(status_code=400, detail=str(e))

    with db.conn.cursor() as cur:
        cur.execute(
            """INSERT INTO signing_windows
                   (signing_request_id, starts_at, ends_at, origin, proposed_by)
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (me["signing_request_id"], parsed["starts_at"], parsed["ends_at"],
             loop.ORIGIN_SIGNER_PROPOSAL, me["id"]))
        window_id = cur.fetchone()["id"]
        cur.execute(
            """INSERT INTO signing_responses (window_id, participant_id, answer)
               VALUES (%s, %s, %s)""",
            (window_id, me["id"], loop.ANSWER_AVAILABLE))
        cur.execute("UPDATE signing_requests SET signer_proposals = signer_proposals + 1, "
                    "updated_at = now() WHERE id = %s", (me["signing_request_id"],))
    db.conn.commit()
    _tell_notary_of_proposal(me["signing_request_id"], me, window_id)
    return token_view(token, http_request)


@router.post("/signing/{token}/decline/{window_id}")
def notary_decline(token: str, window_id: int, http_request: Request):
    """The notary declines a time somebody else proposed. Notary-only.

    FLOW1 item 7 widened this from signer proposals to OFFICER windows
    too, and the fallback it opens is the point of the whole design.

    A declined assignment leaves a request with no live window — which is
    exactly the state a fresh request is in. So `request_state` returns
    to `requested`, the label goes back to "waiting on the notary to post
    the times they are free", and `POST /signing/{token}/windows` works
    unchanged. Dispatch failing degrades into the negotiation loop that
    was already built, at the cost of no new code, which is why the
    fallback was estimated at nearly free.

    HER OWN WINDOWS STAY OUT OF IT. Declining a time she posted herself
    would be a retraction, not a refusal, and it has a different meaning
    and a different audience.
    """
    me = _participant_by_token(token, http_request)
    if me["party_role"] != loop.ROLE_NOTARY:
        raise HTTPException(status_code=403, detail="Only the notary declines a proposal")
    with db.conn.cursor() as cur:
        cur.execute("""UPDATE signing_windows SET declined_at = now()
                        WHERE id = %s AND signing_request_id = %s
                          AND origin = ANY(%s) AND declined_at IS NULL
                    RETURNING origin""",
                    (window_id, me["signing_request_id"],
                     [loop.ORIGIN_SIGNER_PROPOSAL, loop.ORIGIN_OFFICER]))
        declined = cur.fetchone()
    db.conn.commit()
    if declined and declined["origin"] == loop.ORIGIN_OFFICER:
        # She proposed it; she is the one who needs to know it is off.
        # Best-effort, like every other notification here: a decline that
        # happened must not be undone because a mail server was slow.
        _tell_officer_dispatch_declined(me["signing_request_id"])
    return token_view(token, http_request)


# ══════════════════════════════════════════════════════════════════════
# Convergence
# ══════════════════════════════════════════════════════════════════════

def _book_if_converged(request_id: int) -> Optional[int]:
    """Check after every answer, and write the booking ONCE.

    `WHERE booked_at IS NULL` is the guard, exactly like T-5's
    supersession pointer: two final answers arriving together must not
    produce two bookings, and the loser of that race is a no-op rather
    than an error — both parties did say yes.

    Nothing here marks anything completed. §13: the parties agreed a
    time; whether they kept it is not something this system knows.
    """
    world = _load(request_id)
    if world["request"].get("booked_at") or world["request"].get("cancelled_at"):
        return None
    window_id = loop.converged_window_id(
        world["participants"], world["windows"], world["responses"])
    if window_id is None:
        return None
    window = next(w for w in world["windows"] if int(w["id"]) == window_id)
    with db.conn.cursor() as cur:
        cur.execute("""UPDATE signing_requests
                          SET booked_at = %s, booked_by = %s,
                              booked_asserted_at = now(), updated_at = now()
                        WHERE id = %s AND booked_at IS NULL
                    RETURNING id""",
                    (window["starts_at"], loop.BOOKED_BY_CONVERGENCE, request_id))
        won = cur.fetchone()
    db.conn.commit()
    if not won:
        return None
    _tell_everyone(request_id)
    _tell_everyone_booked(request_id)
    return window_id


def _tell_everyone(request_id: int) -> None:
    """The in-app record first, then the emails. E1's ordering.

    Best-effort and never fatal: a booking that happened must not be
    undone because a mail server was slow.
    """
    try:
        world = _load(request_id)
        from utils.notifications import create_notification
        create_notification(
            db.conn,
            user_id=world["request"]["officer_user_id"],
            ntype="signing_booked",
            title="Signing time agreed",
            message=loop.state_label(world["request"], world["windows"],
                                     world["responses"], world["participants"]),
            link=f"/signings?focus={request_id}",
        )
    except Exception as e:
        try:
            db.conn.rollback()
        except Exception:
            pass
        print(f"[NOTARY2] ⚠️ booking notification failed (non-blocking): {e}")


# ══════════════════════════════════════════════════════════════════════
# Telling people
#
# Every send is best-effort and never fatal. A booking that HAPPENED must
# not be undone because a mail server was slow — and every attempt lands
# in `email_log` through the one transport regardless, so "did they get
# it" is answerable at 3am (ADMIN3).
# ══════════════════════════════════════════════════════════════════════

def _party(world: Dict[str, Any], role: str) -> List[Dict[str, Any]]:
    return [p for p in world["participants"]
            if p["party_role"] == role and not p.get("revoked_at")]


def _link(p: Dict[str, Any]) -> str:
    return f"{APP_URL()}/signing/{p['token']}"


def _officer_bits(world: Dict[str, Any]):
    officer = world["officer"]
    return officer.get("full_name") or "Your escrow officer", officer.get("company_name")


def _invite_notary(request_id: int, dispatched: bool = False) -> None:
    """Ask the notary — and ask the right question.

    DISPATCH AND NEGOTIATION ARE DIFFERENT QUESTIONS, so they are
    different emails rather than one email with a conditional clause.
    "When are you free?" and "can you take this, at this time, at this
    address?" want different answers and different buttons, and a
    professional deciding whether to accept an assignment should not have
    to work out which one she has been sent.
    """
    try:
        world = _load(request_id)
        notary = next(iter(_party(world, loop.ROLE_NOTARY)), None)
        if not notary or not notary.get("email"):
            return
        name, company = _officer_bits(world)
        if dispatched:
            _dispatch_notary(world, notary, name, company)
            return
        from utils.notifications import send_notary_invited
        ok, reason = send_notary_invited(
            recipient_email=notary["email"],
            notary_name=notary.get("display_name") or "",
            officer_name=name, officer_company=company,
            deed_type=world["deed"].get("deed_type") or "deed",
            property_address=world["deed"].get("property_address"),
            county=world["deed"].get("county"),
            link=_link(notary),
            expires_at=_fmt_day(world["request"].get("expires_at")),
        )
        if not ok:
            print(f"[NOTARY2] ⚠️ notary invite not sent: {reason}")
    except Exception as e:
        print(f"[NOTARY2] ⚠️ notary invite failed (non-blocking): {e}")


def _dispatch_notary(world, notary, officer_name, officer_company) -> None:
    """The assignment email: one time, a place, accept or decline."""
    from utils.notifications import send_notary_dispatched

    window = next((w for w in world["windows"]
                   if w.get("origin") == loop.ORIGIN_OFFICER
                   and not w.get("declined_at")), None)
    if window is None:
        return
    ok, reason = send_notary_dispatched(
        recipient_email=notary["email"],
        notary_name=notary.get("display_name") or "",
        officer_name=officer_name, officer_company=officer_company,
        deed_type=world["deed"].get("deed_type") or "deed",
        property_address=world["deed"].get("property_address"),
        county=world["deed"].get("county"),
        # window_label() writes every time this product shows. A template
        # that formatted its own would be a second place for the wording
        # to drift, and the .ics bug proved how that ends.
        when_text=loop.window_label(window, world["request"].get("tz_name")),
        location=world["request"].get("location"),
        link=_link(notary),
        expires_at=_fmt_day(world["request"].get("expires_at")),
    )
    if not ok:
        print(f"[NOTARY2] ⚠️ dispatch not sent: {reason}")


def _tell_officer_dispatch_declined(request_id: int) -> None:
    """The notary said no to the time. Tell the officer, in app.

    An in-app notification rather than a nineteenth email template: she
    is a logged-in user with a notifications surface, the request is
    already on her agenda, and the state there tells the rest of the
    story. §4's rule is that the event must be visible, not that it must
    arrive by post.
    """
    try:
        world = _load(request_id)
        notary = next(iter(_party(world, loop.ROLE_NOTARY)), None)
        who = (notary or {}).get("display_name") or "The notary"
        from utils.notifications import create_notification
        create_notification(
            db.conn,
            user_id=world["request"]["officer_user_id"],
            ntype="signing_dispatch_declined",
            title="A notary declined the time you proposed",
            message=(f"{who} cannot make the time you proposed for "
                     f"{world['deed'].get('property_address') or 'your deed'}. "
                     "They can post the times they are free instead."),
            link=f"/signings?focus={request_id}",
        )
    except Exception as e:
        try:
            db.conn.rollback()
        except Exception:
            pass
        print(f"[NOTARY2] ⚠️ decline notice failed (non-blocking): {e}")


def _tell_signers_windows_posted(request_id: int) -> None:
    """Each signer gets their OWN link. One shared link would let any
    signer answer as another, and a consumer surface is not the place to
    discover that."""
    try:
        world = _load(request_id)
        if world["request"].get("booked_at") or world["request"].get("cancelled_at"):
            return  # nothing left to ask them
        tz = world["request"].get("tz_name")
        live = [w for w in world["windows"] if not w.get("declined_at")]
        if not live:
            return
        labels = [loop.window_label(w, tz) for w in live]
        notary = next(iter(_party(world, loop.ROLE_NOTARY)), {})
        name, company = _officer_bits(world)
        from utils.notifications import send_signing_windows_posted
        for signer in _party(world, loop.ROLE_SIGNER):
            if not signer.get("email"):
                continue
            ok, reason = send_signing_windows_posted(
                recipient_email=signer["email"],
                signer_name=signer.get("display_name") or "",
                officer_name=name, officer_company=company,
                notary_name=notary.get("display_name"),
                property_street=world["deed"].get("property_address"),
                window_texts=labels, link=_link(signer))
            if not ok:
                print(f"[NOTARY2] ⚠️ signer notice not sent: {reason}")
    except Exception as e:
        print(f"[NOTARY2] ⚠️ signer notices failed (non-blocking): {e}")


def _tell_notary_of_proposal(request_id: int, proposer: Dict[str, Any],
                             window_id: int) -> None:
    try:
        world = _load(request_id)
        notary = next(iter(_party(world, loop.ROLE_NOTARY)), None)
        if not notary or not notary.get("email"):
            return
        window = next((w for w in world["windows"] if int(w["id"]) == int(window_id)), None)
        if window is None:
            return
        name, _company = _officer_bits(world)
        from utils.notifications import send_signing_proposal_received
        send_signing_proposal_received(
            recipient_email=notary["email"],
            notary_name=notary.get("display_name") or "",
            signer_name=proposer.get("display_name") or "A signer",
            officer_name=name,
            property_address=world["deed"].get("property_address"),
            window_text=loop.window_label(window, world["request"].get("tz_name")),
            link=_link(notary))
    except Exception as e:
        print(f"[NOTARY2] ⚠️ proposal notice failed (non-blocking): {e}")


def _tell_everyone_booked(request_id: int) -> None:
    """The `.ics` to all three parties, and the register differs by who.

    The signer's copy carries the STREET LINE and the officer's name; the
    professionals get the full address and a link into the record. An
    email is not a loophole in the surface allowlist — what a party may
    see does not widen because the channel changed.
    """
    try:
        from utils.email import attachment
        from utils.notifications import send_signing_booked

        world = _load(request_id)
        req, deed = world["request"], world["deed"]
        tz = req.get("tz_name")
        when = req.get("booked_at")
        window = next((w for w in world["windows"]
                       if w.get("starts_at") == when), None)
        when_text = loop.window_label(window, tz) if window else str(when)
        officer_name, _c = _officer_bits(world)
        notary = next(iter(_party(world, loop.ROLE_NOTARY)), {})
        full_address = deed.get("property_address") or ""
        street = full_address.split(",")[0].strip()

        ics = None
        if window and hasattr(window.get("starts_at"), "astimezone"):
            ics = signing_ics(window, full_address, officer_name)
        files = [attachment("signing.ics", ics, "text/calendar")] if ics else []

        for p in world["participants"]:
            if p.get("revoked_at") or not p.get("email"):
                continue
            consumer = p["party_role"] == loop.ROLE_SIGNER
            send_signing_booked(
                recipient_email=p["email"],
                recipient_name=p.get("display_name") or "",
                when_text=when_text,
                property_text=street if consumer else full_address,
                notary_name=notary.get("display_name"),
                officer_name=officer_name,
                is_consumer=consumer,
                link=f"{APP_URL()}/signings",
                attachments=files)
    except Exception as e:
        print(f"[NOTARY2] ⚠️ booking notices failed (non-blocking): {e}")


def signing_ics(window: Dict[str, Any], address: str, officer_name: str) -> bytes:
    """METHOD:PUBLISH, per §13 — a copy of an arrangement people made, not
    an invitation from an organiser expecting an RSVP. Reuses NOTARY1's
    builder rather than a second one: two iCalendar writers is two places
    for a timezone to go wrong."""
    from services.signing import build_ics
    return build_ics(
        summary=f"Notary signing — {address}" if address else "Notary signing",
        start=window["starts_at"], end=window["ends_at"],
        location=address or None,
        description=(f"Arranged through DeedPro by {officer_name}. "
                     "Everyone involved agreed to this time."),
        uid=f"signing-request-{window['signing_request_id']}@deedpro")


def _fmt_day(value: Any) -> Optional[str]:
    return value.strftime("%B %d, %Y") if hasattr(value, "strftime") else None
