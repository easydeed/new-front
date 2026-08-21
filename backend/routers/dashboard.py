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
from services import news as nw
from services import worklist as wl

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
                # GONE QUIET BY EVENT rather than by age. Every time she
                # offered has passed with no answer, which is a stronger
                # signal than five days of silence: a waiting request may
                # yet be answered, and an offer that has run out cannot
                # be. Kept separate from `stale` because the two need
                # different sentences and different remedies.
                "lapsed": state == loop.STATE_LAPSED,
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
                # A REVIEW SHARE CANNOT LAPSE. Lapsing is about offered
                # times running out and a share offers none — it carries
                # an `expires_at`, and an expired share is already
                # filtered out by the query above rather than reported as
                # gone quiet. False rather than absent, because the row
                # shape is asserted by equality.
                "lapsed": False,
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
            SELECT id, deed_type, property_address, county, grantor_name,
                   grantee_name, legal_description, apn, vesting, parties,
                   metadata, superseded_by
              FROM deeds
             WHERE user_id = %s
               AND COALESCE(status, 'draft') NOT IN ('completed', 'deleted')
               AND archived_at IS NULL
             ORDER BY COALESCE(updated_at, created_at) DESC
        """, (user_id,))
        accuracy_items: List[Dict[str, Any]] = []
        ready_items: List[Dict[str, Any]] = []
        counties: Dict[str, str] = {}
        total_fields = 0
        # ── AND HOW MANY DOCUMENTS THERE WERE TO LOOK AT ──────────────
        #
        # `documents` below counts the ones with something outstanding,
        # which means it is zero in TWO unrelated situations: every open
        # document is confirmed, and there are no open documents. The
        # screen was rendering "every field on every open document is
        # confirmed" for both — a sentence that is earned in the first
        # case and vacuous in the second, where an officer who has made
        # nothing is congratulated for it on her first morning.
        #
        # This is the count of documents SCANNED. It is what lets the
        # screen tell an empty set from a clean one, which is DASH1's
        # naming-which-kind-of-absence rule applied to the population
        # rather than to a single row.
        open_documents = 0
        for row in _rows(cur):
            open_documents += 1
            meta = row.get("metadata") or {}
            if row.get("county") and row.get("property_address"):
                counties.setdefault(
                    (row["property_address"] or "").strip().upper(), row["county"])
            # A SUPERSEDED DEED IS NOT HER WORK. The deed page stops her
            # on arrival (§9); putting it in the worklist would be
            # inviting the work the stop exists to prevent. Chase rows
            # survive supersession — somebody outside is still waiting,
            # and telling her that is not inviting her to work on it.
            if row.get("superseded_by") is not None:
                continue
            checks = accuracy.outstanding(
                {**row,
                 "dtt": meta.get("dtt"),
                 "current_owner": meta.get("current_owner")},
                provenance=meta.get("provenance"))
            if not checks:
                # DASH3: every field confirmed, nothing printed yet. It
                # contributes ZERO to the accuracy figure — which is why
                # the old dashboard could not show it — and it is the
                # readiest work she has. A row of its own now.
                ready_items.append({
                    "deed_id": row["id"],
                    "deed_type": row.get("deed_type"),
                    "property": row.get("property_address"),
                    "escrow_no": meta.get("escrow_no"),
                })
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

        # ── How many documents on each property have RECORDED ────────
        #
        # `recorded_at IS NOT NULL`, and NEVER `status = 'completed'`.
        # The distinction is the whole pin: `completed` means a PDF was
        # rendered, and recording is the officer's own statement that the
        # county took it (RED0 R3-8). Counting status would silently turn
        # "4 recorded" into "we rendered four PDFs" — the `deeds.status`
        # disease reappearing inside a count, on the surface a pilot user
        # reads first.
        cur.execute("""
            SELECT property_address, COUNT(*) AS n
              FROM deeds
             WHERE user_id = %s
               AND recorded_at IS NOT NULL
               AND COALESCE(status, '') <> 'deleted'
             GROUP BY property_address
        """, (user_id,))
        recorded_counts = {
            (r["property_address"] or "").strip().upper(): r["n"]
            for r in _rows(cur)
        }

        # ── NOTIF1: what HAPPENED, which the queries above cannot show ──
        #
        # Everything above selects work that is OUTSTANDING. A resolved
        # share leaves those results by disappearing, so the one event an
        # officer most needs told — her reviewer answered — is the one
        # event this screen could not report. The in-app record has been
        # written since E1 and read by nobody.
        #
        # UNREAD only, and joined to the deed so the row can land on the
        # document rather than a list.
        cur.execute("""
            SELECT n.id, n.type, n.message, n.link, n.created_at,
                   (n.payload->>'deed_id')::int AS deed_id
              FROM user_notifications un
              JOIN notifications n ON n.id = un.notification_id
             WHERE un.user_id = %s
               AND COALESCE(un.read, false) = false
             ORDER BY n.created_at DESC
             LIMIT 25
        """, (user_id,))
        news_items = [{
            "id": r["id"], "type": r["type"], "message": r["message"],
            "link": r.get("link"), "deed_id": r.get("deed_id"),
            "days_ago": q.days_since(r.get("created_at")),
        } for r in _rows(cur)]

    upcoming.sort(key=lambda r: r["when"])
    # Longest-waiting first: the oldest silence is the one worth chasing.
    # `days_waiting` may be None for a row we cannot date, and those sort
    # last rather than first — an unknown age is not evidence of urgency.
    awaiting.sort(key=lambda r: (r["days_waiting"] is None,
                                 -(r["days_waiting"] or 0)))
    # ── DASH3: the same facts, as one worklist ───────────────────────
    #
    # Assembled from the populations above rather than re-queried: two
    # queries answering one question is how the accuracy figure and the
    # queue came to disagree in the first place. The screen renders
    # `worklist`; `accuracy`, `awaiting`, `upcoming` and `idle_drafts`
    # stay in the payload because other things read them and because a
    # shape asserted by equality is not something to break in passing.
    rows: List[Dict[str, Any]] = []
    for item in awaiting:
        rows.append(wl.chase_row(item).as_dict())
    for item in upcoming:
        rows.append(wl.upcoming_row(item).as_dict())
    for item in accuracy_items:
        rows.append(wl.accuracy_row(item).as_dict())
    for item in ready_items:
        rows.append(wl.ready_row(item).as_dict())

    # Idle drafts COLLAPSE per property — four drafts on one parcel are
    # one line with one action, not four lines competing with work that
    # is actually blocked.
    by_property: Dict[str, List[Dict[str, Any]]] = {}
    chased = {r["deed_id"] for r in rows if r.get("deed_id")}
    for item in idle:
        # A draft that already has a row of its own is not also sitting.
        if item.get("id") in chased:
            continue
        by_property.setdefault((item.get("property") or "").strip().upper(),
                               []).append(item)
    for items in by_property.values():
        rows.append(wl.stale_group_row(items).as_dict())

    groups = wl.group_rows(rows, recorded=recorded_counts, counties=counties)

    return q.queue(upcoming=upcoming, awaiting=awaiting, idle_drafts=idle,
                   instruments=instruments,
                   accuracy={"fields": total_fields,
                             "documents": len(accuracy_items),
                             "open_documents": open_documents,
                             "items": accuracy_items},
                   worklist={"groups": groups, "count": wl.hero_count(groups)},
                   news=nw.build(news_items))
