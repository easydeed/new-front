"""API-CONFIRM — Model 2 on the partner path.

═══ WHY THIS MODULE EXISTS ═══

W0 §3 ruled that a partner POST does not produce a recordable instrument.
It produces a draft. A named human opens a confirmation URL, sees the
deed as it will print, and approves or rejects it. A stored PDF exists
only after that approval. DeedPro does not confirm facts and never will;
this is the mechanism by which the integrator's human does.

The method transfers from the signer and PCOR token surfaces. The
content inverts: those surfaces must not show the instrument. This one
must. A denylist saying "don't send the APN" is meaningless once the
iframe is the APN, so the pin is exact key-set equality on the chrome
AROUND the document. Nothing around the document adds a fact the
document does not already print.

═══ WHAT THIS IS NOT ═══

Not `/approve/{token}`. That is officer-share review of an already
completed `deeds` row. Two lifecycles on one URL and neither pin holds.

Not an editable builder. Correction is reject-with-reason. The
integrator holds the source data; the human says "this is not the deed."

Not identity proof. The integrator names the approver for the provenance
subject. The token authenticates. We record who they said it was.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Mapping, Optional, Sequence

CONFIRM_EXPIRY_DAYS = 7

STATUS_PENDING = "pending_confirmation"
STATUS_COMPLETED = "completed"
STATUS_REJECTED = "rejected"
STATUS_EXPIRED = "expired"

CONFIRM_KEYS = frozenset({
    "deed_type",
    "expires_at",
    "state",
    "preview_url",
    "approver",
    "can_approve",
    "can_reject",
    "reject_reasons",
})

# Nested objects are allowed to carry only these keys. A new nested
# field cannot reach the page without failing the suite.
APPROVER_KEYS = frozenset({"name", "role"})
REJECT_REASON_KEYS = frozenset({"id", "label"})

# One catalog, sent by the server. The page renders what it is told.
# Adding a reason is a product decision, not a frontend edit.
REJECT_REASONS: tuple[Dict[str, str], ...] = (
    {"id": "grantor_name", "label": "Grantor name incorrect"},
    {"id": "grantee_name", "label": "Grantee name incorrect"},
    {"id": "legal_description", "label": "Legal description issue"},
    {"id": "vesting", "label": "Vesting incorrect"},
    {"id": "property_address", "label": "Property address incorrect"},
    {"id": "apn", "label": "APN incorrect"},
    {"id": "dtt", "label": "Transfer tax issue"},
    {"id": "other", "label": "Other issue"},
)

REJECT_REASON_IDS = frozenset(r["id"] for r in REJECT_REASONS)


def mint_token() -> str:
    return secrets.token_urlsafe(32)


def expires_at(now: Optional[datetime] = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    return now + timedelta(days=CONFIRM_EXPIRY_DAYS)


def pin_execution_date(when: Optional[datetime] = None) -> str:
    """Freeze the Dated: line at create. Templates print
    `execution_date or now()`, and two clocks produce two documents."""
    when = when or datetime.now(timezone.utc)
    return when.strftime("%B %d, %Y")


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def resolve_state(row: Mapping[str, Any], *, now: Optional[datetime] = None) -> str:
    """The status the surface reports. Expiry is a property of the clock,
    not of whoever last wrote the row — a pending draft past expires_at
    is expired even if the sweep has not run yet."""
    status = (row.get("status") or "").strip()
    if status == STATUS_PENDING:
        exp = _aware(row.get("confirmation_expires_at"))
        now = _aware(now) or datetime.now(timezone.utc)
        if exp is not None and now >= exp:
            return STATUS_EXPIRED
    return status or STATUS_PENDING


def confirmation_package(row: Mapping[str, Any], *,
                         now: Optional[datetime] = None) -> Dict[str, Any]:
    """MINIMUM SURFACE. Exact key-set equality.

    The document itself is fetched at preview_url. Everything else is
    chrome, and chrome must not add a fact the document does not print.
    """
    state = resolve_state(row, now=now)
    pending = state == STATUS_PENDING
    token = row.get("confirmation_token") or ""
    return {
        "deed_type": row.get("deed_type"),
        "expires_at": (
            _aware(row.get("confirmation_expires_at")).isoformat()
            if row.get("confirmation_expires_at") else None
        ),
        "state": state,
        "preview_url": f"/confirm/{token}/preview" if token and state in (
            STATUS_PENDING, STATUS_COMPLETED) else None,
        "approver": {
            "name": (row.get("approver_name") or "").strip() or None,
            "role": (row.get("approver_role") or "").strip() or None,
        },
        "can_approve": pending,
        "can_reject": pending,
        "reject_reasons": [dict(r) for r in REJECT_REASONS],
    }


def assert_package_keys(package: Mapping[str, Any]) -> None:
    if set(package) != CONFIRM_KEYS:
        raise AssertionError(
            f"confirmation package keys {sorted(package)} != {sorted(CONFIRM_KEYS)}")
    if set(package.get("approver") or {}) != APPROVER_KEYS:
        raise AssertionError("approver nested keys drifted")
    for reason in package.get("reject_reasons") or ():
        if set(reason) != REJECT_REASON_KEYS:
            raise AssertionError("reject_reasons nested keys drifted")


def normalize_rejection(*, issues: Optional[Sequence[str]] = None,
                        comment: Optional[str] = None) -> str:
    """A reject without a reason is not a correction. Structured ids
    must be from the catalog; free text is allowed alongside them."""
    chosen = []
    for raw in issues or ():
        issue_id = (raw or "").strip()
        if not issue_id:
            continue
        if issue_id not in REJECT_REASON_IDS:
            raise ValueError(f"unknown reject reason: {issue_id}")
        label = next(r["label"] for r in REJECT_REASONS if r["id"] == issue_id)
        chosen.append(label)
    note = (comment or "").strip()
    if not chosen and not note:
        raise ValueError("a rejection needs at least one reason or a comment")
    parts = chosen
    if note:
        parts = parts + [note]
    return "; ".join(parts)
