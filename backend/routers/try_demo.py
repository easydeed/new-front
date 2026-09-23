"""TRY — the server-side route behind `/try`, holding the demo key.

═══ THE RULING THIS IMPLEMENTS (owner, 2026-09-21) ═══

The handoff (TRY-1) asked for a new API-key class scoped to the sample
deed. That was ruled differently: **no new key class.** A server-side
route holds the demo key and accepts only `{trap_id, approver_name}`.
It builds the payload from the fixed sample, applies the trap mutation
server-side, and returns the exact request it sent alongside the
response.

**THE BROWSER NEVER HOLDS A KEY AND CANNOT SUBMIT ARBITRARY FACTS.**

═══ WHERE THE SECURITY BOUNDARY ACTUALLY IS ═══

Stated plainly because the wrong answer is the tempting one: **the
boundary is the PAYLOAD CONSTRAINT, not the throttle.** A caller of this
route chooses one of a fixed set of trap ids and a display name. They
cannot reach `property`, `grantor`, `grantee`, `transfer_tax` or
`recording` — those are built here, from constants. That is what makes a
public route holding a real key acceptable.

The throttle is a cost-raiser on top of it, and an honest description of
it is:

  · it is IN-MEMORY and PER-PROCESS, so it resets on deploy and does not
    span instances;
  · it keys on `X-Forwarded-For`, which `utils/throttle.py` documents as
    trivially spoofable.

So it raises the cost of casual abuse and stops nothing determined. The
durable backstop is the demo key's own per-key hourly and daily ceilings
in `api_rate_limits`, which are enforced in the database by the same
auth dependency every partner request goes through.

**ACCEPTED RISK, named rather than mitigated (TRY-9):** a determined
abuser can exhaust the demo key's ceiling and the next visitor meets a
429 as their first impression. The page is built to say so honestly
rather than to pretend the limit is theirs.

═══ WHAT THIS ROUTE EXERCISES, AND THE ONE THING IT DOES NOT ═══

It calls the REAL auth dependency (`get_api_key`) with the real demo
key, and the REAL `create_deed` handler. Same validation, same catalog
rules, same render, same watermark, same database write, same per-key
rate limiting.

**Not exercised: the HTTP hop itself.** A self-directed HTTP request
would have covered it and risks starving a single-worker deployment by
waiting on itself, so it is deliberately not done. The difference is one
transport layer, and `/try` must not claim otherwise — the page may say
the request is real, because the code path is; it may not imply the
bytes crossed a network.
"""
from __future__ import annotations

import os
from copy import deepcopy
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ValidationError

from database import get_db_connection
from schemas.api_v1.deeds import CreateDeedRequest
from services.api_catalog import TYPE_REQUIREMENTS
from services.dtt_rates import compute_dtt
from services.api_error_envelope import body_prefixed, validation_envelope
from services.api_confirm_lifecycle import DEMO_KIND_TRY
from utils.throttle import ThrottleExceeded, client_key, throttle

router = APIRouter()

# The key is an environment variable on Render and appears nowhere in
# this repository. A demo key committed to git is a live credential in
# a public artifact, whatever its prefix says.
DEMO_KEY_ENV = "TRY_DEMO_API_KEY"


# ── The fixed sample ─────────────────────────────────────────────────
#
# Fictional throughout, and deliberately un-addressable: "Nonesuch
# Avenue" and an APN in a block no assessor issues. No property lookup
# runs on this path — the sample is a constant, not a search result.
SAMPLE_PAYLOAD: Dict[str, Any] = {
    "deed_type": "grant_deed",
    "property": {
        "address": "1300 Nonesuch Avenue",
        "city": "Glendora",
        "state": "CA",
        "zip": "91750",
        "county": "Los Angeles",
        "apn": "8888-000-001",
        "legal_description": (
            "LOT 7, BLOCK 2, TRACT NO. 99999, IN THE CITY OF GLENDORA, "
            "COUNTY OF LOS ANGELES, STATE OF CALIFORNIA, AS PER MAP "
            "RECORDED IN BOOK 999, PAGES 1 THROUGH 3, INCLUSIVE, OF MAPS, "
            "IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY."
        ),
    },
    "grantor": {"name": "JOHN Q. SAMPLE AND MARY R. SAMPLE, HUSBAND AND WIFE"},
    "grantee": {"name": "AVERY K. SPECIMEN", "vesting": "an unmarried person"},
    "transfer_tax": {
        "exempt": False, "value": 750000,
        "computed_amount": "825.00", "basis": "full_value",
    },
    "recording": {
        "requested_by": "Pacific Coast Escrow",
        "return_to": {
            "name": "Avery K. Specimen",
            "address": "1300 Nonesuch Avenue",
            "city": "Glendora", "state": "CA", "zip": "91750",
        },
    },
    "approver": {"name": "", "role": "escrow officer"},
}


def _fixed_vesting_slug() -> str:
    """Derived from the catalog, never typed.

    The same move `frontend/src/app/page.tsx` makes for its 422 sample:
    if an instrument stops fixing its own vesting, this trap stops
    claiming it does instead of demonstrating a refusal that no longer
    happens.
    """
    for slug, rules in TYPE_REQUIREMENTS.items():
        if rules.fixed_vesting:
            return slug
    raise RuntimeError(
        "no fixed-vesting instrument in the catalog — trap 1 has nothing "
        "true to demonstrate")


def _entity_slug() -> str:
    for slug, rules in TYPE_REQUIREMENTS.items():
        if rules.required_entity_facts:
            return slug
    raise RuntimeError("no entity instrument in the catalog — trap 3 is empty")


# ── The traps ────────────────────────────────────────────────────────
#
# Each is a mutation of the sample. The EXPECTED MESSAGES ARE NOT HERE:
# the page renders whatever the API returns, so a reworded refusal
# updates the demo instead of contradicting it.
def _trap_vesting_on_fixed(p):      p["deed_type"] = _fixed_vesting_slug()
def _trap_no_vesting(p):            p["grantee"].pop("vesting", None)
def _trap_entity_missing(p):        p["deed_type"] = _entity_slug(); p["grantor"]["entity"] = {}
def _trap_no_transfer_tax(p):       p.pop("transfer_tax", None)
def _trap_out_of_state(p):          p["property"]["state"] = "NV"

TRAPS = {
    "vesting_on_fixed_instrument": _trap_vesting_on_fixed,
    "no_vesting": _trap_no_vesting,
    "entity_state_missing": _trap_entity_missing,
    "no_transfer_tax": _trap_no_transfer_tax,
    "out_of_state": _trap_out_of_state,
}


# ── The second draft, and why it cannot be the same request ──────────
#
# Act 3 confirms draft B while claiming draft A's hash, and the guard is
# supposed to refuse. **It could not.** Draft B was built from the
# identical payload, WeasyPrint renders identical HTML to identical
# bytes, so the two drafts hashed the same and `DRAFT_MISMATCH` was
# unreachable. The guard was never presented with a tamper; the page
# printed a refusal that had not happened.
#
# So draft B differs, in exactly one figure, and the figure PRINTS ON
# THE FACE OF THE DEED — the documentary transfer tax. A reader can see
# the two documents are different without being told they are.
#
# It is not a trap. It is a valid request that produces a valid second
# deed, which is the only kind of second draft a tamper story can use.
#
# The amount is DERIVED from the same rate table the API computes
# against, never typed beside the value. `compute_dtt` on the sample's
# own figure reproduces the sample's own "825.00", so this is the same
# arithmetic the deed already relies on rather than a number that
# happens to agree today.
SECOND_DRAFT_VALUE = 775_000


def _second_draft(p) -> None:
    breakdown = compute_dtt(SECOND_DRAFT_VALUE, p["property"].get("city"))
    p["transfer_tax"]["value"] = SECOND_DRAFT_VALUE
    p["transfer_tax"]["computed_amount"] = f"{breakdown['total_tax']:.2f}"


VARIANTS = {"second_draft": _second_draft}


class TryRequest(BaseModel):
    """The ENTIRE public surface of this route.

    Three fields, and each one selects from a server-side table rather
    than carrying content. Anything else a caller sends is refused
    rather than merged — `model_config` forbids extras so a request
    trying to reach the payload fails loudly instead of being silently
    dropped. This page still cannot submit facts of its own.
    """
    model_config = {"extra": "forbid"}

    trap_id: Optional[str] = Field(
        default=None, description="One of TRAPS, or null for the valid request")
    approver_name: str = Field(default="", max_length=120)
    variant: Optional[str] = Field(
        default=None, description="One of VARIANTS, or null for the sample")


def _build(trap_id: Optional[str], approver_name: str,
           variant: Optional[str] = None) -> Dict[str, Any]:
    payload = deepcopy(SAMPLE_PAYLOAD)
    payload["approver"]["name"] = (approver_name or "").strip() or "Demo Visitor"
    if trap_id:
        TRAPS[trap_id](payload)
    if variant:
        VARIANTS[variant](payload)
    return payload


@router.post("/try/deed")
async def try_deed(body: TryRequest, request: Request):
    """Build the sample, apply the trap, send it, and show both halves."""
    try:
        throttle(f"try-ip:{client_key(request)}", limit=20, window_seconds=60)
    except ThrottleExceeded as exc:
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMITED",
                    "message": "Too many demo requests from this address. "
                               "The sandbox is shared."},
            headers={"Retry-After": str(exc.retry_after)},
        )

    if body.trap_id is not None and body.trap_id not in TRAPS:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_REQUEST",
                    "message": f"Unknown trap_id. Known: {sorted(TRAPS)}"},
        )

    if body.variant is not None and body.variant not in VARIANTS:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_REQUEST",
                    "message": f"Unknown variant. Known: {sorted(VARIANTS)}"},
        )

    demo_key = os.getenv(DEMO_KEY_ENV)
    if not demo_key:
        # §14.8: absent CONFIGURATION is a broken deploy, not a neutral
        # absence. Say so rather than degrading into a simulation.
        raise HTTPException(
            status_code=503,
            detail={"code": "DEMO_UNAVAILABLE",
                    "message": "The demo sandbox is not configured."},
        )

    payload = _build(body.trap_id, body.approver_name, body.variant)

    # Validate exactly as the partner API does, and return the SAME
    # envelope — `body`-prefixed paths included, or the demo would teach
    # field paths no partner request produces.
    try:
        deed_request = CreateDeedRequest(**payload)
    except ValidationError as exc:
        message, details = validation_envelope(body_prefixed(exc.errors()))
        return {
            "request": payload,
            "status_code": 422,
            "response": {"detail": {"code": "VALIDATION_ERROR",
                                    "message": message, "details": details}},
        }

    # The real dependency, the real key, the real handler.
    from routers.api_v1.router import create_deed, get_api_key
    api_key = await get_api_key(
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=demo_key),
        request,
    )

    # ═══ THE ROUTE DECIDES THE WATERMARK, NOT A DATABASE COLUMN ═══
    #
    # `/try`'s page states, unconditionally, that every PDF rendered
    # there is watermarked SAMPLE — NOT FOR RECORDING. The mechanism
    # behind that sentence used to be `api_keys.is_test`, a column that
    # defaults FALSE, is set only at key creation, and — until this
    # ticket — had no update path in the admin API at all.
    #
    # In production the demo key's column was falsy, so the page made a
    # true-sounding claim over unwatermarked, recordable-looking deeds.
    # The claim and the mechanism were never the same proposition and
    # nothing compared them.
    #
    # The page says "every PDF rendered HERE". Here is this route. So
    # this route is what decides, and the guarantee no longer depends on
    # anyone having remembered to tick a box. `watermark_if_test` keeps
    # governing every other `dp_test_` render — the broader ruling of
    # 2026-09-21 is untouched; the demo simply stops relying on it.
    #
    # Mutating the dict is the whole mechanism because `is_test` has
    # exactly one consumer: the watermark seam in `create_deed`. It
    # drives no rate limit, no response field and no billing.
    api_key = {**api_key, "is_test": True}

    result = await create_deed(request, deed_request, api_key, None)

    # ═══ AND AN UNMARKED DEMO ROW NOW FAILS THE REQUEST ═══
    #
    # `_mark_demo_row` used to swallow its failure, on the reasoning
    # that an unmarked row is only a housekeeping miss. **That
    # reasoning expired with the ruling above it.** An unmarked row is
    # one an approval will mint a permanent public verification record
    # for, because `approve_confirmation` reads `demo_kind` to decide.
    #
    # So the cost of failing to mark went from "a row lingers" to "a
    # fictional deed is publicly confirmed as genuine", and the failure
    # direction has to move with it. The row stays — unmarked, but
    # unreachable, because the confirmation token is in the response we
    # are discarding and nobody ever receives it.
    if not _mark_demo_row(getattr(result, "data", None)):
        raise HTTPException(
            status_code=503,
            detail={"code": "DEMO_UNAVAILABLE",
                    "message": "The sandbox could not mark this draft as a "
                               "demo, so it will not hand one out."},
        )
    return {"request": payload, "status_code": 201, "response": result}


def _mark_demo_row(data) -> bool:
    """Stamp `demo_kind`. Returns whether the row is actually marked.

    Written AFTER the insert rather than inside it, which leaves a window
    where the row is unmarked. That placement still stands: a delete
    predicate loose enough to catch an unmarked row could reach a real
    deed, so the marker must be exact and it must be written by the one
    caller that knows.

    **What changed is what an unmarked row costs.** It is no longer just
    a row the sweep will not reclaim — `approve_confirmation` reads
    `demo_kind` to decide whether to mint a public verification record,
    so an unmarked demo row approves into a permanent public claim about
    a fictional parcel. The caller now refuses to hand out a draft it
    could not mark, which is why this reports rather than swallows.

    `rowcount` is checked, not just the absence of an exception: an
    UPDATE that matched nothing succeeds loudly and marks nothing.
    """
    deed_id = getattr(data, "deed_id", None) if data is not None else None
    if not deed_id:
        return False
    conn = get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE api_deeds SET demo_kind = %s WHERE deed_id = %s",
                (DEMO_KIND_TRY, deed_id))
            marked = cur.rowcount == 1
        conn.commit()
        return marked
    except Exception:
        conn.rollback()
        return False
    finally:
        conn.close()
