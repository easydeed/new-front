"""FLOW1 item 0 — one place builds a Shared Deeds row, with a named key set.

═══ WHAT WENT WRONG ═══

An external audit reported the Shared Deeds page as showing FABRICATED
rows: "Invalid Date" in Shared Date, "NaN days left" under Expires, blank
Deed Type, blank Shared With, and a Status of "Viewed" sitting beside a
Response of "Not viewed". The row count happened to equal the number of
completed deeds, which read as synthesis from the deeds list.

It was not synthesis. The page fetches `GET /shared-deeds` on mount and
renders exactly the rows the server sent. What it did NOT do was read
them by the names the server used. Eight of fifteen fields were wrong:

    server sent          screen looked for      what you saw
    ─────────────────────────────────────────────────────────────
    type                 deed_type              (blank)
    shared_with_email    recipient_email        (blank)
    — (never sent)       shared_with            (blank)
    date                 shared_date            Invalid Date
    — (baked into a      expires_at             Invalid Date /
       "message" string)                        NaN days left
    — (never sent)       viewed_at              "Not viewed", always
    — (never sent)       response_date          "Pending", always
    — (never sent)       feedback               (blank)

Every symptom in the report is one of those rows. "Viewed" contradicting
"Not viewed" is the clearest: the badge reads `status`, which arrived;
the line under it reads `viewed_at`, which never did.

═══ WHY IT SURVIVED ═══

Nothing compared the two declarations. The response shape lived in a
dict literal inside a route handler; the screen's shape lived in a
TypeScript interface; neither had ever read the other, and TypeScript
cannot type-check a `fetch` it did not author. A missing key in JS is not
an error — it is `undefined`, and `undefined` formats as a blank cell or
an Invalid Date. **The failure mode of this defect class is a page that
looks like it is lying.**

So the fix is not eight renames. It is:

  1. ONE function builds the row — this one — instead of a dict literal
     buried mid-handler where the next field gets appended by whoever is
     passing.
  2. The key set is NAMED (`SHARED_DEED_KEYS`) and asserted by EQUALITY
     at runtime, the same allowlist-by-key-set-equality the NOTARY2 token
     surfaces use. A field cannot enter or leave the payload silently.
  3. The names live in a SHARED CORPUS (`shared_deed_row_keys.json`) that
     the frontend suite reads too, so the screen's interface and the
     server's payload are pinned to the same list from both sides. This
     is the phone_cases.json pattern; it exists because a contract
     declared twice in two languages is a contract that drifts.

═══ THREE FIELDS DID NOT EXIST AND NOW DO ═══

`shared_with`, `response_date` and a real `expires_at` were not renames —
the data was absent.

* `recipient_name` was ACCEPTED by `POST /shared-deeds`, used for the
  email greeting, and then dropped on the floor: there was no column. So
  the officer picks "Nora Vasquez" out of her rolodex and the tracking
  screen has a Shared With column with nowhere to get her name from. It
  is a column now.

* `responded_at` records when the recipient approved or rejected.
  `updated_at` was NOT usable for this — a revoke bumps it too, and a
  screen that says "responded 4 Aug" because somebody revoked access on
  4 Aug is a worse defect than a blank cell. Rows that responded before
  this ticket have no such stamp and report `null`; the screen renders
  that as unknown rather than inventing "Pending" over a decided share.

* `expires_at` was a real column all along, SELECTed and then spent on
  the string `"Shared via link - expires 2026-08-18"` in a `message`
  field nothing renders. The countdown had nothing to count.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Mapping, Optional

from services import signing

# The contract, read from the corpus rather than retyped here — a second
# copy of a list is the thing this whole module exists to prevent.
_CORPUS = json.loads(
    (Path(__file__).parent / "shared_deed_row_keys.json").read_text(encoding="utf-8")
)
SHARED_DEED_KEYS = frozenset(_CORPUS["keys"])


def _iso(value: Any) -> Optional[str]:
    """Timestamps cross the wire as ISO-8601 or as nothing.

    NOT as `""`. The empty string was the old handler's answer for a
    missing date and it is the direct cause of "Invalid Date" on the
    screen: `new Date("")` is a Date object, it is just not a valid one,
    so every JS guard shaped `if (d)` waves it through. `null` fails that
    guard honestly.
    """
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def shared_deed_row(row: Mapping[str, Any]) -> Dict[str, Any]:
    """One row of the officer's Shared Deeds list.

    `row` is a `deed_shares` record joined to its deed. The returned key
    set is asserted equal to `SHARED_DEED_KEYS` before it leaves — an
    assertion rather than a filter on purpose: silently dropping an
    unexpected key would let the screen and the server disagree again,
    quietly, which is exactly what happened last time.
    """
    out: Dict[str, Any] = {
        "id": row.get("id"),
        "deed_id": row.get("deed_id"),
        "property": row.get("property_address") or "",
        "deed_type": row.get("deed_type") or "",
        # The name the officer chose them by, when we have one. Falling
        # back to the address is honest — it is who she sent it to — and
        # beats an empty cell in the column headed "Shared With".
        "shared_with": (row.get("recipient_name") or "").strip()
                       or (row.get("recipient_email") or ""),
        "recipient_email": row.get("recipient_email") or "",
        "status": row.get("status"),
        "shared_date": _iso(row.get("created_at")),
        "expires_at": _iso(row.get("expires_at")),
        "viewed_at": _iso(row.get("viewed_at")),
        "response_date": _iso(row.get("responded_at")),
        # NOTARY1: the real kind, not the constant "review" this used to
        # be — which was true until signings existed and would have
        # stayed "true" for every signing request afterwards.
        "share_type": row.get("share_kind") or signing.SHARE_KIND_REVIEW,
        # The status LINE, written by scheduling_label() and rendered
        # verbatim. This screen does not compose its own sentence for an
        # arrangement, so "scheduled" cannot drift into "will happen".
        "signing_summary": signing.scheduling_label(dict(row)),
        "scheduled_at": _iso(row.get("scheduled_at")),
        "scheduled_by": row.get("scheduled_by"),
    }
    assert set(out) == SHARED_DEED_KEYS, (
        "the Shared Deeds row no longer matches its contract: "
        f"extra={sorted(set(out) - SHARED_DEED_KEYS)} "
        f"missing={sorted(SHARED_DEED_KEYS - set(out))}"
    )
    return out
