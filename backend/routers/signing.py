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

    return {
        "success": True,
        "signing_request_id": request_id,
        "expires_at": expires.isoformat(),
        "participants": [
            {"id": pid, "party_role": role, "name": name,
             "link": f"{APP_URL()}/signing/{token}"}
            for pid, (role, token, name, _email) in tokens.items()
        ],
        # The notary is asked first: she posts availability, and the
        # signers are invited once there is something to answer. Emailing
        # a consumer "pick a time" before any time exists would be asking
        # them to do nothing.
        "next": "the notary posts her availability",
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
    return token_view(token, http_request)


@router.post("/signing/{token}/decline/{window_id}")
def notary_decline(token: str, window_id: int, http_request: Request):
    """The notary declines a signer's proposal. Notary-only."""
    me = _participant_by_token(token, http_request)
    if me["party_role"] != loop.ROLE_NOTARY:
        raise HTTPException(status_code=403, detail="Only the notary declines a proposal")
    with db.conn.cursor() as cur:
        cur.execute("""UPDATE signing_windows SET declined_at = now()
                        WHERE id = %s AND signing_request_id = %s
                          AND origin = %s AND declined_at IS NULL""",
                    (window_id, me["signing_request_id"], loop.ORIGIN_SIGNER_PROPOSAL))
    db.conn.commit()
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
