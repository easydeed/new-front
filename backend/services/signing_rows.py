"""Signing summary rows, assembled once, for every surface that needs them.

═══ WHY THIS MOVED OUT OF THE ROUTER ═══

`GET /signing-requests/v2` assembled these inline: fetch the windows, the
responses and the participants, ask `signing_loop` for the state, ask
`officer_queue` how long she has waited, hand the lot to
`signing_summary_row`.

That was fine while one endpoint needed them. The deed page needs the
same rows for one deed, and the obvious way to get them — write the same
six queries and the same five judgements in a second router — is exactly
the defect `services/signing_summary` was created to end, one level up.
Its docstring is about two SCREENS disagreeing about a row's keys; this
would have been two SERVERS disagreeing about a row's state.

The judgements are still `signing_loop`'s and `officer_queue`'s. Nothing
here decides anything. It fetches what those functions need and calls
them in the order they have always been called.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence

from services import officer_queue, signing_summary
from services import signing_loop as loop


def _rows(cur) -> List[Dict[str, Any]]:
    return [dict(r) for r in (cur.fetchall() or [])]


def summarise(cur, requests: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Turn signing_request rows into the summary every officer surface reads.

    `requests` must already carry `property_address`, `deed_type` and
    `notary_name` — they come from the join, and which join differs by
    caller (all of an officer's, or one deed's).
    """
    out: List[Dict[str, Any]] = []
    for row in requests:
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

        state = loop.request_state(row, windows, responses)
        days_waiting = officer_queue.days_since(row.get("created_at"))
        out.append(signing_summary.signing_summary_row(
            row,
            state=state,
            live=loop.is_live(state),
            summary=loop.state_label(row, windows, responses, participants),
            days_waiting=days_waiting,
            stale=(state in (loop.STATE_REQUESTED, loop.STATE_WINDOWS_POSTED)
                   and officer_queue.is_stale(days_waiting)),
            signers=len([p for p in participants
                         if p["party_role"] == loop.ROLE_SIGNER]),
        ))
    return out


def for_officer(cur, user_id: int) -> List[Dict[str, Any]]:
    """Every signing this officer asked for, soonest first."""
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
    return summarise(cur, _rows(cur))


def for_deed(cur, deed_id: int) -> List[Dict[str, Any]]:
    """Every signing on one deed, newest request first.

    Ordered by `created_at` rather than by the appointment: on a single
    deed the question is "what is the current attempt", and a cancelled
    request whose appointment was later than the live one's would
    otherwise sort above it.
    """
    cur.execute("""
        SELECT sr.*, d.property_address, d.deed_type,
               (SELECT display_name FROM signing_participants
                 WHERE signing_request_id = sr.id AND party_role = 'notary'
                 ORDER BY id LIMIT 1) AS notary_name
          FROM signing_requests sr
          JOIN deeds d ON d.id = sr.deed_id
         WHERE sr.deed_id = %s
         ORDER BY sr.created_at DESC
    """, (deed_id,))
    return summarise(cur, _rows(cur))


def signers_for_deed(cur, deed_id: int) -> List[Dict[str, Any]]:
    """Who is signing, and what they have said.

    §13.1 — NAME AND ANSWER ONLY. `signing_participants` also holds email
    and phone, and this is the query a future author would widen with a
    `SELECT *` while adding one field. The column list is the boundary,
    so widening it is a visible act.

    The column is `display_name`; there is no `name`. Aliasing keeps the
    key the consumers already read — and getting this wrong is what made
    `/deeds/{id}/activity` 500 on every call.
    """
    cur.execute("""
        SELECT p.display_name AS name, p.party_role,
               (SELECT r.answer FROM signing_responses r
                 WHERE r.participant_id = p.id
                 ORDER BY r.asserted_at DESC LIMIT 1) AS answer
          FROM signing_participants p
          JOIN signing_requests s ON s.id = p.signing_request_id
         WHERE s.deed_id = %s AND p.party_role = %s
         ORDER BY p.id
    """, (deed_id, loop.ROLE_SIGNER))
    return _rows(cur)
