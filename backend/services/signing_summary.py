"""One row of the officer's signing list, with its key set enforced.

═══ WHY THIS MODULE EXISTS ═══

`GET /signing-requests/v2` built its rows inline in the router, and TWO
screens declared what those rows contain: the agenda at `/signings`
declared fourteen fields and the merged tracker declared eleven. Nothing
compared the three declarations, so nothing objected.

The three the tracker was missing were `live`, `days_waiting` and
`stale` — exactly the fields CANCEL1 and DASH1 added so that a screen
would stop deciding for itself which signings are over and which have
gone quiet. A screen that does not declare a field cannot render it, so
the merged tracker listed cancelled and expired signings among the live
ones and could not mark a single stuck request. The signal the agenda's
entire design leads with was absent, and no test failed.

That is FLOW1 item 0's defect one endpoint over, and milder only by
luck: there the key names were WRONG and rendered as `undefined`; here
they were ABSENT and rendered as nothing at all. Both are one contract
declared in two languages with no referee between them.

═══ THE ASSERTION IS NOT A FILTER ═══

Same reasoning as `shared_deed_row`: the key set is asserted equal to
the corpus before the row leaves, rather than being filtered down to it.
Silently dropping an unexpected key is how the screen and the server
come to disagree again, quietly — which is the failure mode this whole
pattern exists to end.

Note what this module deliberately does NOT do. It computes no state,
decides nothing about staleness, and composes no sentence: the caller
hands in what `signing_loop` and `officer_queue` already decided. A
second opinion about which states are over is the defect, not the fix.
"""

import json
from pathlib import Path
from typing import Any, Dict, Mapping, Optional

_CORPUS = json.loads(
    (Path(__file__).parent / "signing_summary_keys.json").read_text(encoding="utf-8")
)
SIGNING_SUMMARY_KEYS = frozenset(_CORPUS["keys"])


def _iso(value: Any) -> Optional[str]:
    """Timestamps cross the wire as ISO-8601 or as nothing.

    NOT as `""`. `new Date("")` is a Date object that is merely invalid,
    so every JS guard shaped `if (d)` waves it through and the screen
    renders "Invalid Date". `null` fails that guard honestly.
    """
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def signing_summary_row(
    row: Mapping[str, Any],
    *,
    state: str,
    live: bool,
    summary: str,
    days_waiting: Optional[int],
    stale: bool,
    signers: int,
) -> Dict[str, Any]:
    """One signing, as every officer surface receives it.

    The judgements arrive as arguments because they are made elsewhere
    and must keep being made elsewhere — `state`, `live` and `summary`
    are `services/signing_loop`'s, `days_waiting` and `stale` are
    `services/officer_queue`'s. This function's only job is the shape.
    """
    out: Dict[str, Any] = {
        "id": row.get("id"),
        "deed_id": row.get("deed_id"),
        "property_address": row.get("property_address"),
        "deed_type": row.get("deed_type"),
        "notary_name": row.get("notary_name"),
        "state": state,
        # CANCEL1 item 4: whether this one is still somebody's problem,
        # decided in Python. The alternative — a screen listing which
        # states are over — is that judgement copied into TypeScript,
        # where it gets missed the day a state is added.
        "live": live,
        # The server's sentence, rendered verbatim by every surface
        # (§13 rule 3). No screen composes its own account of a
        # scheduling state.
        "summary": summary,
        "booked_at": _iso(row.get("booked_at")),
        "booked_by": row.get("booked_by"),
        # FLOW1 item 4: WHEN SHE ASKED. Without it the agenda
        # reconstructed a request's age as `expires_at minus 21 days` —
        # default_expiry()'s constant, retyped as a magic number in
        # another language, so changing the default would have silently
        # re-aimed every stuck badge.
        "created_at": _iso(row.get("created_at")),
        # DASH1: how long, and whether that is too long. One threshold,
        # in services/officer_queue.py, and the screens render what they
        # are told.
        "days_waiting": days_waiting,
        "stale": stale,
        "expires_at": _iso(row.get("expires_at")),
        "signers": signers,
    }
    assert set(out) == SIGNING_SUMMARY_KEYS, (
        "the signing summary row no longer matches its contract: "
        f"extra={sorted(set(out) - SIGNING_SUMMARY_KEYS)} "
        f"missing={sorted(SIGNING_SUMMARY_KEYS - set(out))}"
    )
    return out
