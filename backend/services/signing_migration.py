"""NOTARY2 — carrying NOTARY1's signing requests into the new model.

═══ WHY THIS EXISTS FOR AN EXPECTED ZERO ROWS ═══

NOTARY1 shipped hours before NOTARY2 started and there is no design
partner yet, so production almost certainly holds no `deed_shares` row
with `share_kind = 'signing_request'`. "There is probably no data" is how
data gets lost, so the transform is written and tested rather than
assumed — and if the count really is zero, this run is a no-op that says
so out loud.

═══ WHAT CARRIES, AND WHAT CANNOT ═══

NOTARY1's model was officer→notary: the OFFICER proposed windows and the
notary tapped one. NOTARY2 inverted it. So the transform is not a
field-for-field copy, and two things deserve naming:

  THE NOTARY'S TOKEN IS REUSED, not reissued. A live link in somebody's
  inbox must keep working; a migration that silently invalidates a link
  the officer already sent is a migration that creates a support ticket
  per row.

  THE OFFICER'S PROPOSED WINDOWS BECOME `origin = 'officer'`, which is a
  value the new model already has. They are not relabelled 'notary' —
  that would be the record claiming she offered times she never saw.

An old `scheduled_at` set by the notary becomes her `available` response
on the matching window, which is what it meant. Set by the OFFICER, it
becomes `booked_by = 'officer'` — the same dual-assertion distinction
NOTARY1 recorded, carried rather than flattened.

═══ IDEMPOTENT ═══

Guarded on `signing_requests.migrated_from_share_id`, so a second run
finds nothing. The column exists for exactly this and is otherwise
unread.
"""
from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List

from services import signing
from services import signing_loop as loop

SOURCE_SQL = """
    SELECT ds.*, d.property_address, u.full_name AS owner_name
      FROM deed_shares ds
      JOIN deeds d ON d.id = ds.deed_id
      LEFT JOIN users u ON u.id = ds.owner_user_id
     WHERE ds.share_kind = 'signing_request'
       AND NOT EXISTS (
           SELECT 1 FROM signing_requests sr
            WHERE sr.migrated_from_share_id = ds.id)
"""


# The `proposed_windows` parser lives in `services/signing.py` — this
# file used to carry a second copy of it. Standing rule: when a new
# surface needs an existing judgement the answer is never a second copy,
# and with NOTARY1's read side retired this is now the ONLY caller, which
# makes keeping two parsers for one column indefensible rather than
# merely untidy.
_windows_of = signing.windows_of


def migrate(conn, *, dry_run: bool = False) -> Dict[str, Any]:
    """Carry every un-migrated NOTARY1 signing share across.

    Returns a report rather than a count: "migrated 0" and "migrated 0
    because the query found nothing" read the same in a log, and only one
    of them is reassuring.
    """
    from datetime import datetime

    moved, skipped = [], []
    with conn.cursor() as cur:
        cur.execute(SOURCE_SQL)
        sources = [dict(r) for r in (cur.fetchall() or [])]

        for share in sources:
            windows = _windows_of(share)
            parsed = []
            for w in windows:
                try:
                    start = datetime.fromisoformat(str(w.get("start")))
                    end = datetime.fromisoformat(str(w.get("end")))
                except (TypeError, ValueError):
                    continue
                # NOTARY1 stored offsets as text and ASSUMED UTC when one
                # was missing — the bug #149 closed. Carrying a naive
                # time forward would import the defect into the new
                # model, so it is skipped and REPORTED rather than
                # guessed at a second time.
                if start.tzinfo is None or end.tzinfo is None:
                    continue
                parsed.append((start, end))

            if not parsed:
                skipped.append({"share_id": share["id"],
                                "why": "no window carried a UTC offset"})
                continue

            if dry_run:
                moved.append({"share_id": share["id"], "windows": len(parsed),
                              "dry_run": True})
                continue

            cur.execute(
                """INSERT INTO signing_requests
                       (deed_id, officer_user_id, location, tz_name, expires_at,
                        migrated_from_share_id)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (share["deed_id"], share["owner_user_id"],
                 share.get("property_address"), "America/Los_Angeles",
                 share["expires_at"], share["id"]))
            request_id = cur.fetchone()["id"]

            # The notary keeps her token. A live link in an inbox must
            # keep working.
            cur.execute(
                """INSERT INTO signing_participants
                       (signing_request_id, party_role, display_name, email,
                        token, expires_at)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (request_id, loop.ROLE_NOTARY, share.get("recipient_email"),
                 share.get("recipient_email"), share["token"], share["expires_at"]))
            notary_id = cur.fetchone()["id"]

            window_ids = []
            for start, end in parsed:
                cur.execute(
                    """INSERT INTO signing_windows
                           (signing_request_id, starts_at, ends_at, origin, proposed_by)
                       VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                    (request_id, start, end, loop.ORIGIN_OFFICER, notary_id))
                window_ids.append((cur.fetchone()["id"], start))

            # What the old `scheduled_at` MEANT, carried rather than
            # flattened: the notary's tap was her availability; the
            # officer's entry was her own assertion.
            when = share.get("scheduled_at")
            if when is not None:
                if share.get("scheduled_by") == "notary":
                    match = next((wid for wid, s in window_ids if s == when), None)
                    if match:
                        cur.execute(
                            """INSERT INTO signing_responses
                                   (window_id, participant_id, answer)
                               VALUES (%s, %s, %s)
                               ON CONFLICT (window_id, participant_id) DO NOTHING""",
                            (match, notary_id, loop.ANSWER_AVAILABLE))
                cur.execute(
                    """UPDATE signing_requests
                          SET booked_at = %s, booked_by = %s,
                              booked_asserted_at = %s
                        WHERE id = %s""",
                    (when,
                     loop.BOOKED_BY_OFFICER if share.get("scheduled_by") == "officer"
                     else loop.BOOKED_BY_CONVERGENCE,
                     share.get("scheduled_asserted_at") or when, request_id))

            moved.append({"share_id": share["id"], "signing_request_id": request_id,
                          "windows": len(parsed), "booked": when is not None})

    return {
        "found": len(sources),
        "migrated": len(moved),
        "skipped": skipped,
        "detail": moved,
        # The sentence that distinguishes "nothing to do" from "the query
        # is broken", which a bare count cannot.
        "note": ("no NOTARY1 signing requests remain to migrate"
                 if not sources else f"{len(moved)} of {len(sources)} carried across"),
    }
