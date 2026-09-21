"""The public API's validation envelope, declared once.

═══ WHY THIS IS A MODULE AND NOT A METHOD ON THE ROUTE CLASS ═══

Two callers need to produce byte-identical 422 bodies:

  · `routers/api_v1/router.PublicAPIRoute` — every real partner request.
  · `routers/try_demo.py` — `/try`'s server-side route, which validates
    the same model in-process and must return what the partner API
    would have returned. A demo that renders a DIFFERENT error envelope
    from the one an integrator will meet is teaching the wrong contract,
    on a page whose entire claim is that the requests are real.

Two copies of this mapping would agree on the day they were written and
drift on the day somebody fixes one of them. §14.3: one DECLARATION,
not one per screen.

═══ WHAT THE MAPPING DOES, AND WHY IT READS THE EXCEPTION ═══

Pydantic renders a validator's ValueError as `"Value error, <sentence>"`
and locates it at the field the validator hangs off. Both are wrong for
a published contract:

  · the message an integrator shows a user would open with
    `body.recording: Value error,` before the sentence explaining the
    refusal, and
  · `body.recording` is, for every instrument rule, a field the caller
    got RIGHT — the validator lives there for ordering reasons.

Pydantic v2 keeps the raised exception at `ctx["error"]`, so both are
read structurally: `str(raised)` IS the sentence with no prefix to
strip, and `raised.field` is the field at fault when the raiser knew it
(`services.api_catalog.InstrumentRuleError`). Nothing here parses prose
— matching on "Value error, " would be a spelling match against a
framework's formatting choice, which is §14.1 exactly.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Tuple


def validation_envelope(errors: Iterable[Dict[str, Any]]) -> Tuple[str, List[Dict[str, Any]]]:
    """Return `(message, details)` for a sequence of Pydantic errors.

    `message` is the doctrine sentence (or sentences, joined) and carries
    NO field path and NO framework prefix. The field belongs in
    `details[].field`, which is what a client branches on.
    """
    details: List[Dict[str, Any]] = []
    for error in errors:
        loc = ".".join(str(part) for part in error.get("loc", ()))
        raised = (error.get("ctx") or {}).get("error")
        details.append({
            "field": getattr(raised, "field", None) or loc or None,
            "message": (str(raised) if raised is not None
                        else error.get("msg", "Invalid value")),
        })
    message = "; ".join(item["message"] for item in details) or "Request validation failed"
    return message, details


def body_prefixed(errors: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Pydantic errors with `body` prepended to each `loc`.

    FastAPI adds that prefix when it validates a request body; a model
    validated directly (as the demo route does) does not have it. The
    demo's field paths must match the partner API's or it documents a
    contract nobody serves.
    """
    out = []
    for error in errors:
        item = dict(error)
        item["loc"] = ("body",) + tuple(error.get("loc", ()))
        out.append(item)
    return out
