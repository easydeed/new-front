"""DASH1 — the officer's queue: what is waiting on somebody.

One endpoint, because the dashboard asking three services three questions
and stitching the answers on the client is how a screen ends up rendering
a partial truth when one of the three fails. The shape it returns is
asserted by equality in `services/officer_queue.py`.

READ-ONLY. Nothing here writes, nothing here infers that a signing
happened, and nothing here decides what "stale" means — that number lives
in the service module so the screens cannot each hold an opinion.
"""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

import db
from auth import get_current_user_id
from services import officer_queue as q
from services import signing_loop as loop

router = APIRouter()


def _rows(cur) -> List[Dict[str, Any]]:
    return [dict(r) for r in (cur.fetchall() or [])]


@router.get("/dashboard/queue")
def officer_queue(user_id: int = Depends(get_current_user_id)) -> Dict[str, Any]:
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")

    upcoming: List[Dict[str, Any]] = []
    awaiting: List[Dict[str, Any]] = []
    idle: List[Dict[str, Any]] = []

    with db.conn.cursor() as cur:
        # ── Signings ──────────────────────────────────────────────────
        #
        # One query for the aggregate, then the children per request, the
        # same shape `officer_agenda` uses. The state is DERIVED (T-5),
        # so it cannot be filtered in SQL without re-implementing
        # `request_state` in another language — which is the duplication
        # this codebase keeps deleting.
        cur.execute("""
            SELECT sr.*, d.property_address,
                   (SELECT display_name FROM signing_participants
                     WHERE signing_request_id = sr.id AND party_role = 'notary'
                     ORDER BY id LIMIT 1) AS notary_name
              FROM signing_requests sr
              JOIN deeds d ON d.id = sr.deed_id
             WHERE sr.officer_user_id = %s
               AND sr.cancelled_at IS NULL
        """, (user_id,))
        requests = _rows(cur)

        cutoff = q.upcoming_cutoff()
        for req in requests:
            cur.execute("SELECT * FROM signing_windows WHERE signing_request_id = %s",
                        (req["id"],))
            windows = _rows(cur)
            cur.execute("SELECT r.* FROM signing_responses r JOIN signing_windows w "
                        "ON w.id = r.window_id WHERE w.signing_request_id = %s",
                        (req["id"],))
            responses = _rows(cur)
            cur.execute("SELECT * FROM signing_participants WHERE signing_request_id = %s",
                        (req["id"],))
            participants = _rows(cur)

            state = loop.request_state(req, windows, responses)
            summary = loop.state_label(req, windows, responses, participants)

            if state == loop.STATE_BOOKED:
                booked_at = req.get("booked_at")
                # SOON, not ever. A booking three months out is real and
                # is not what she needs on a dashboard this morning.
                if booked_at and booked_at <= cutoff:
                    upcoming.append({
                        "kind": "signing",
                        "id": req["id"],
                        "deed_id": req["deed_id"],
                        "property": req.get("property_address"),
                        "when": booked_at.isoformat(),
                        "who": req.get("notary_name"),
                        "summary": summary,
                    })
                continue

            if state in (loop.STATE_EXPIRED,):
                continue

            days = q.days_since(req.get("created_at"))
            awaiting.append({
                "kind": "signing",
                "id": req["id"],
                "deed_id": req["deed_id"],
                "property": req.get("property_address"),
                "who": req.get("notary_name"),
                "days_waiting": days,
                "stale": q.is_stale(days),
                # The server's sentence, verbatim — §13 rule 3. This
                # screen does not compose its own account of a scheduling
                # state any more than the other three do.
                "summary": summary,
            })

        # ── Review shares nobody has answered ─────────────────────────
        #
        # `sent` and `viewed` are the two undecided statuses. A share
        # that was approved, rejected, revoked or expired is not waiting
        # on anybody, whatever else it is.
        cur.execute("""
            SELECT ds.id, ds.deed_id, ds.status, ds.created_at,
                   ds.recipient_name, ds.recipient_email,
                   d.property_address
              FROM deed_shares ds
              JOIN deeds d ON d.id = ds.deed_id
             WHERE ds.owner_user_id = %s
               AND ds.status IN ('sent', 'viewed')
               AND (ds.expires_at IS NULL OR ds.expires_at > now())
             ORDER BY ds.created_at ASC
        """, (user_id,))
        for row in _rows(cur):
            days = q.days_since(row.get("created_at"))
            awaiting.append({
                "kind": "review",
                "id": row["id"],
                "deed_id": row["deed_id"],
                "property": row.get("property_address"),
                "who": (row.get("recipient_name") or "").strip()
                       or row.get("recipient_email"),
                "days_waiting": days,
                "stale": q.is_stale(days),
                "summary": ("Opened, no answer yet" if row["status"] == "viewed"
                            else "Sent, not opened yet"),
            })

        # ── Her own drafts, untouched ─────────────────────────────────
        cur.execute("""
            SELECT id, deed_type, property_address, updated_at, created_at
              FROM deeds
             WHERE user_id = %s
               AND COALESCE(status, 'draft') NOT IN ('completed', 'deleted')
               AND COALESCE(updated_at, created_at) < %s
             ORDER BY COALESCE(updated_at, created_at) ASC
             LIMIT 10
        """, (user_id, q.idle_cutoff()))
        for row in _rows(cur):
            idle.append({
                "kind": "draft",
                "id": row["id"],
                "deed_type": row.get("deed_type"),
                "property": row.get("property_address"),
                "days_idle": q.days_since(row.get("updated_at") or row.get("created_at")),
            })

    upcoming.sort(key=lambda r: r["when"])
    # Longest-waiting first: the oldest silence is the one worth chasing.
    # `days_waiting` may be None for a row we cannot date, and those sort
    # last rather than first — an unknown age is not evidence of urgency.
    awaiting.sort(key=lambda r: (r["days_waiting"] is None,
                                 -(r["days_waiting"] or 0)))
    return q.queue(upcoming=upcoming, awaiting=awaiting, idle_drafts=idle)
