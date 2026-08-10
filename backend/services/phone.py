"""PARTNER2 — phone normalization, server side.

═══ WHY THIS EXISTS WHEN THE BROWSER ALREADY DOES IT ═══

`frontend/src/lib/phone.ts` masks as she types and normalizes before it
posts, which covers every surface a person uses. It does not cover the
API, and "every current caller happens to be well-behaved" is a property
of this afternoon rather than of the system. Column shape is a storage
concern; it belongs where storage is.

So the rule exists in two languages, which is a real risk — the one this
codebase has been bitten by repeatedly (A2's third city list, the five
partner-category copies this same ticket is deleting). The mitigation is
the one Doctrine A established: a SHARED CORPUS, `phone_cases.json`, read
by both suites, so the two implementations are checked against the same
referee rather than against each other's reputation.

═══ E.164 IN, REGIONAL OUT ═══

Stored as `+1XXXXXXXXXX` because that is the representation that is a
FACT: one number, one spelling, comparable and dial-able. Displayed
regionally because that is how a person reads a phone number. Conflating
the two is how `partners.phone` came to hold eleven punctuation styles
that no search could match.

═══ WHAT IT REFUSES TO DO ═══

It does not validate that a number is reachable or assigned, and it does
NOT discard what it cannot parse. An extension, a UK number, or "ask for
Dana" is information the officer chose to record; dropping it to keep a
column tidy would be the product deciding it knows better than the person
using it. Unparseable input is returned trimmed and verbatim.
"""
from __future__ import annotations

import re
from typing import Optional

_NON_DIGIT = re.compile(r"\D")


def _digits(value: str) -> str:
    return _NON_DIGIT.sub("", value or "")


def _ten_digits(value: str) -> str:
    """The ten significant digits, or '' when this is not US-shaped."""
    d = _digits(value)
    if len(d) == 10:
        return d
    if len(d) == 11 and d.startswith("1"):
        return d[1:]
    return ""


def normalize_phone(value: Optional[str]) -> str:
    """Storage form. `+1XXXXXXXXXX`, or the input verbatim if it is not a
    US-shaped number. Idempotent — normalizing twice is normalizing once,
    which matters because an update round-trips a stored value."""
    raw = (value or "").strip()
    if not raw:
        return ""
    ten = _ten_digits(raw)
    if not ten:
        return raw
    return f"+1{ten}"


def format_phone(value: Optional[str]) -> str:
    """Display form, from whatever is stored — including the historical
    mess written before this ticket."""
    raw = (value or "").strip()
    if not raw:
        return ""
    ten = _ten_digits(raw)
    if not ten:
        return raw
    return f"({ten[:3]}) {ten[3:6]}-{ten[6:]}"


def phone_search_key(value: Optional[str]) -> str:
    """The comparable form: the TEN significant digits for a US-shaped
    number, all digits otherwise.

    The first draft returned every digit, which was wrong in a way the
    test caught: a stored `+16265550134` keyed to `16265550134` while an
    officer typing `6265550134` keyed to `6265550134`. Substring matching
    happened to still work, so the screen would have looked fine — and
    any comparison by equality, which is what a future "is this the same
    number" check would use, would have said no. Dropping the country
    code makes both sides reduce to the same key.
    """
    raw = value or ""
    return _ten_digits(raw) or _digits(raw)
