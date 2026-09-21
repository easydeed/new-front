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


class TryRequest(BaseModel):
    """The ENTIRE public surface of this route.

    Two fields. Anything else a caller sends is ignored rather than
    merged — `model_config` forbids extras so a request trying to reach
    the payload fails loudly instead of being silently dropped.
    """
    model_config = {"extra": "forbid"}

    trap_id: Optional[str] = Field(
        default=None, description="One of TRAPS, or null for the valid request")
    approver_name: str = Field(default="", max_length=120)


def _build(trap_id: Optional[str], approver_name: str) -> Dict[str, Any]:
    payload = deepcopy(SAMPLE_PAYLOAD)
    payload["approver"]["name"] = (approver_name or "").strip() or "Demo Visitor"
    if trap_id:
        TRAPS[trap_id](payload)
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

    demo_key = os.getenv(DEMO_KEY_ENV)
    if not demo_key:
        # §14.8: absent CONFIGURATION is a broken deploy, not a neutral
        # absence. Say so rather than degrading into a simulation.
        raise HTTPException(
            status_code=503,
            detail={"code": "DEMO_UNAVAILABLE",
                    "message": "The demo sandbox is not configured."},
        )

    payload = _build(body.trap_id, body.approver_name)

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
    result = await create_deed(request, deed_request, api_key, None)

    _mark_demo_row(getattr(result, "data", None))
    return {"request": payload, "status_code": 201, "response": result}


def _mark_demo_row(data) -> None:
    """Stamp `demo_kind` so the lifecycle sweep may delete this row.

    Written AFTER the insert rather than inside it, which leaves a window
    where the row is unmarked. The failure direction is deliberate: an
    unmarked row is simply never deleted, whereas a delete predicate
    loose enough to catch it without the marker could reach a real deed.
    A demo row that lingers is a housekeeping miss; a real deed deleted
    is not recoverable.
    """
    deed_id = getattr(data, "deed_id", None) if data is not None else None
    if not deed_id:
        return
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE api_deeds SET demo_kind = %s WHERE deed_id = %s",
                (DEMO_KIND_TRY, deed_id))
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()
