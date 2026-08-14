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
from services import deed_accuracy as accuracy
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

        # ── What stands between her documents and being ready ─────────
        #
        # THE HERO NUMBER. Every unfinished document, not just the idle
        # ones: "7 fields still need your eyes, across 4 documents" is
        # the product's own promise made countable, and a promise counted
        # over a subset is a smaller promise.
        #
        # One pass, server-side, because the two populations come from
        # `required_fields.json` and a stored provenance block — neither
        # of which the screen holds.
        cur.execute("""
            SELECT id, deed_type, property_address, grantor_name, grantee_name,
                   legal_description, apn, vesting, parties, metadata
              FROM deeds
             WHERE user_id = %s
               AND COALESCE(status, 'draft') NOT IN ('completed', 'deleted')
               AND archived_at IS NULL
             ORDER BY COALESCE(updated_at, created_at) DESC
        """, (user_id,))
        accuracy_items: List[Dict[str, Any]] = []
        total_fields = 0
        for row in _rows(cur):
            meta = row.get("metadata") or {}
            checks = accuracy.outstanding(
                {**row,
                 "dtt": meta.get("dtt"),
                 "current_owner": meta.get("current_owner")},
                provenance=meta.get("provenance"))
            if not checks:
                continue
            total_fields += len(checks)
            accuracy_items.append({
                "deed_id": row["id"],
                "deed_type": row.get("deed_type"),
                "property": row.get("property_address"),
                # The field that ties this deed to the FILE, which is the
                # orientation the resume card exists to give. Added
                # deliberately rather than left to render blank where the
                # design shows a fact.
                # In `metadata`, not a column — the draft extras list is
                # where it has always lived.
                "escrow_no": meta.get("escrow_no"),
                "checks": checks,
            })

        # ── What she actually files ───────────────────────────────────
        #
        # The catalog is 21 California instruments and an officer files
        # three of them. Ordering the "start something new" list by her
        # own frequency puts her next document first; ordering it
        # alphabetically puts an affidavit she has never filed above the
        # grant deed she files weekly.
        #
        # THIS YEAR, and the window is named in the payload rather than
        # implied by the number — "14" over an unstated period is a
        # figure the reader has to guess the meaning of.
        cur.execute("""
            SELECT deed_type, COUNT(*) AS n
              FROM deeds
             WHERE user_id = %s
               AND COALESCE(status, '') <> 'deleted'
               AND created_at >= date_trunc('year', now())
             GROUP BY deed_type
             ORDER BY n DESC, deed_type
        """, (user_id,))
        instruments = [{"deed_type": r["deed_type"], "count": r["n"],
                        "period": "this year"}
                       for r in _rows(cur) if r.get("deed_type")]

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
    return q.queue(upcoming=upcoming, awaiting=awaiting, idle_drafts=idle,
                   instruments=instruments,
                   accuracy={"fields": total_fields,
                             "documents": len(accuracy_items),
                             "items": accuracy_items})
