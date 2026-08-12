"""Did the county return the parcel the officer actually chose?

═══ THE DEFECT ═══

The officer picks `1358 5th Street, Coronado, CA` from the autocomplete —
a specific address, chosen deliberately from a list. The county search
comes back with 76 candidates, the chosen address is not first, and the
screen's advice is "refine search for fewer results". There is nothing
left to refine: the search WAS the address.

Then the officer picks a row, and every downstream field — APN, legal
description, vested owner — comes from that parcel. A wrong row does not
produce an error. It produces a complete, plausible, confidently wrong
deed, sourced from a real county record, with the officer's confirmation
on every field.

That is the one failure the confirmation model cannot catch. Confirming a
value proves the officer read it; it does not prove the value belongs to
the property they meant.

═══ WHAT THIS MODULE DOES, AND WHAT IT REFUSES TO DO ═══

It compares the address the officer chose against each candidate's
address, and it answers ONE question: **is there exactly one candidate
that is unambiguously the same address?** If yes, that parcel is the
selection and the rest become alternatives. If no, every candidate goes
in front of the officer, ordered by how close it is, and nothing is
chosen on their behalf.

It does NOT do fuzzy matching, spelling correction, or nearest-neighbour
guessing. `1358` and `1356` are different properties, and a module that
treats them as nearly-the-same is a module that eventually picks one.
Every comparison here is an equality test on a normalised string; the
normalisation is about SPELLING (`5th Street` vs `5TH ST`), never about
identity.

═══ WHY "EXACTLY ONE" IS THE WHOLE RULE ═══

Two candidates that normalise to the same address are not a tie to be
broken — they are a genuine ambiguity that only the officer can resolve,
usually a multi-unit building where the unit is the deciding fact. The
moment this module breaks such a tie by any rule at all (first returned,
highest assessed value, closest ZIP) it has invented an answer, and it
will be right often enough that nobody checks it.

So: one exact match selects, zero or several do not. There is no third
branch, and there is no confidence score — a number between 0 and 1
invites a threshold, and a threshold is where invented answers come from.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Sequence, Tuple

# ── Spelling, not identity ───────────────────────────────────────────
#
# Google returns "5th Street"; the county returns "5TH ST". Same place,
# two spellings. Everything in these tables is a way of WRITING a word —
# nothing here changes which parcel a string refers to.

SUFFIXES: Dict[str, str] = {
    "STREET": "ST", "ST": "ST",
    "AVENUE": "AVE", "AVE": "AVE", "AV": "AVE",
    "BOULEVARD": "BLVD", "BLVD": "BLVD",
    "ROAD": "RD", "RD": "RD",
    "DRIVE": "DR", "DR": "DR",
    "LANE": "LN", "LN": "LN",
    "COURT": "CT", "CT": "CT",
    "PLACE": "PL", "PL": "PL",
    "TERRACE": "TER", "TER": "TER",
    "CIRCLE": "CIR", "CIR": "CIR",
    "TRAIL": "TRL", "TRL": "TRL",
    "PARKWAY": "PKWY", "PKWY": "PKWY",
    "HIGHWAY": "HWY", "HWY": "HWY",
    "WAY": "WAY",
    "SQUARE": "SQ", "SQ": "SQ",
    "LOOP": "LOOP",
    "ALLEY": "ALY", "ALY": "ALY",
    "PLAZA": "PLZ", "PLZ": "PLZ",
}

DIRECTIONALS: Dict[str, str] = {
    "NORTH": "N", "N": "N",
    "SOUTH": "S", "S": "S",
    "EAST": "E", "E": "E",
    "WEST": "W", "W": "W",
    "NORTHEAST": "NE", "NE": "NE",
    "NORTHWEST": "NW", "NW": "NW",
    "SOUTHEAST": "SE", "SE": "SE",
    "SOUTHWEST": "SW", "SW": "SW",
}

#: Words that introduce a unit. The DESIGNATOR is normalised away and the
#: unit VALUE is kept, because "APT 3" and "UNIT 3" are the same unit
#: written twice, while "UNIT 3" and "UNIT 4" are two different homes.
UNIT_WORDS = {
    "UNIT", "APT", "APARTMENT", "STE", "SUITE", "#", "NO", "RM", "ROOM",
    "SPC", "SPACE", "TRLR", "LOT", "BLDG", "FL", "FLOOR", "PH",
}

_PUNCTUATION = re.compile(r"[.,;:]+")
_WHITESPACE = re.compile(r"\s+")


def _tokens(text: Optional[str]) -> List[str]:
    if not text:
        return []
    cleaned = _PUNCTUATION.sub(" ", str(text).upper())
    cleaned = cleaned.replace("#", " # ")
    return [t for t in _WHITESPACE.split(cleaned) if t]


def split_unit(text: Optional[str]) -> Tuple[List[str], str]:
    """Separate the street part from the unit part.

    `1358 5TH ST UNIT 3B` → (`[1358, 5TH, ST]`, `3B`).

    A trailing bare `#3` counts; a bare trailing number does NOT. `1358
    5TH ST 3` is more likely a mangled address than a unit, and inventing
    a unit is exactly the kind of guess this module refuses to make.
    """
    tokens = _tokens(text)
    for index, token in enumerate(tokens):
        if token in UNIT_WORDS:
            unit = "".join(tokens[index + 1:])
            return tokens[:index], unit
    return tokens, ""


def normalize_street(text: Optional[str]) -> str:
    """The street part, spelled one way.

    Only ONE token is treated as the street type, and it is found by
    position: `WAY` is the type in `Ocean Way` and part of the name in
    `Broadway Ave`. The type is the last token, or the second-to-last
    when a trailing directional follows it (`5th Street West`).
    """
    tokens, _ = split_unit(text)
    if not tokens:
        return ""

    last = len(tokens) - 1
    suffix_at = last
    if last > 0 and tokens[last] in DIRECTIONALS:
        suffix_at = last - 1

    out: List[str] = []
    for index, token in enumerate(tokens):
        if index == suffix_at and index > 0 and token in SUFFIXES:
            out.append(SUFFIXES[token])
        elif index != suffix_at and token in DIRECTIONALS:
            # Anywhere but the street-type slot: `742 North Beacon Blvd`,
            # `55 5th St West`. Two directionals never collapse into each
            # other — N and S map to different tokens — so this can make
            # one address readable two ways, never two addresses one.
            out.append(DIRECTIONALS[token])
        else:
            out.append(token)
    return " ".join(out)


def unit_value(text: Optional[str]) -> str:
    """A unit given on its own — `3B`, `UNIT 3B`, `#3B` all mean 3B.

    The designator is dropped and the value kept: `APT 3` and `UNIT 3`
    are one home written twice, while `UNIT 3` and `UNIT 4` are two.
    """
    tokens = _tokens(text)
    while tokens and tokens[0] in UNIT_WORDS:
        tokens = tokens[1:]
    return "".join(tokens)


def normalize_unit(text: Optional[str]) -> str:
    """A unit written inside a street line — `1358 5TH ST UNIT 3B` → `3B`."""
    _, unit = split_unit(text)
    return unit


def normalize_city(text: Optional[str]) -> str:
    return " ".join(_tokens(text))


def normalize_zip(text: Optional[str]) -> str:
    """Five digits, or nothing.

    A ZIP+4 and its five-digit form are the same place; a blank and a ZIP
    are not a mismatch, they are one side not knowing — which is why
    comparisons below only run when BOTH sides have one.
    """
    digits = re.sub(r"\D", "", str(text or ""))
    return digits[:5] if len(digits) >= 5 else ""


class Address:
    """One address, normalised, with the parts kept separate.

    Kept separate on purpose: `1358 5TH ST` in Coronado and `1358 5TH ST`
    in San Diego are different properties, and a single flattened string
    makes that difference disappear at exactly the moment it matters.
    """

    __slots__ = ("street", "unit", "city", "zip_code")

    def __init__(self, street=None, unit=None, city=None, zip_code=None):
        self.street = normalize_street(street)
        # The county puts the unit in either place — its own `UnitNumber`
        # field, or welded into the address line. A separately-supplied
        # unit wins, because it is the one somebody stated on purpose.
        self.unit = unit_value(unit) or normalize_unit(street)
        self.city = normalize_city(city)
        self.zip_code = normalize_zip(zip_code)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (f"Address(street={self.street!r}, unit={self.unit!r}, "
                f"city={self.city!r}, zip={self.zip_code!r})")


def same_address(wanted: Address, candidate: Address) -> bool:
    """Unambiguously the same address — every part that BOTH sides know.

    The asymmetry matters. A missing ZIP on one side is silence, not
    disagreement, so it cannot make a match; a DIFFERENT ZIP is
    disagreement and disqualifies. Treating silence as agreement is how a
    module like this matches the right street in the wrong town.
    """
    if not wanted.street or wanted.street != candidate.street:
        return False
    if wanted.unit != candidate.unit:
        return False
    if wanted.city and candidate.city and wanted.city != candidate.city:
        return False
    if wanted.zip_code and candidate.zip_code and wanted.zip_code != candidate.zip_code:
        return False
    return True


def _closeness(wanted: Address, candidate: Address) -> Tuple[int, int, int, int]:
    """How near a candidate is — for ORDERING only, never for choosing.

    Higher sorts first. This decides what the officer reads first; it
    never decides what the officer gets.
    """
    return (
        1 if wanted.street and wanted.street == candidate.street else 0,
        1 if wanted.unit == candidate.unit else 0,
        1 if wanted.city and wanted.city == candidate.city else 0,
        1 if wanted.zip_code and wanted.zip_code == candidate.zip_code else 0,
    )


def _candidate_address(match: Dict[str, Any]) -> Address:
    return Address(
        street=match.get("address"),
        unit=match.get("unit_number"),
        city=match.get("city"),
        zip_code=match.get("zip_code") or match.get("zip"),
    )


def rank(wanted: Address, matches: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """The candidates, nearest first, all of them.

    ALL of them. The screen used to render the first 25 of 76 and advise
    "refine search" — so a parcel ranked 40th by the county's own ordering
    was not on the page at all, and the advice could not reach it because
    the search was already the exact address.
    """
    decorated = [(_closeness(wanted, _candidate_address(m)), i, m)
                 for i, m in enumerate(matches)]
    decorated.sort(key=lambda row: (tuple(-v for v in row[0]), row[1]))
    return [row[2] for row in decorated]


def select(wanted: Address,
           matches: Sequence[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]],
                                                       List[Dict[str, Any]]]:
    """(the one exact match, everything ranked) — or (None, everything ranked).

    Returns the ranked list in BOTH cases so the caller can offer
    "not this one?" without a second pass. The selection is never removed
    from the caller's view of the alternatives by this function; deciding
    what to show is the caller's job, and this one only answers the
    question it was asked.
    """
    exact = [m for m in matches if same_address(wanted, _candidate_address(m))]
    ranked = rank(wanted, matches)
    if len(exact) == 1:
        return exact[0], ranked
    return None, ranked


# ── Why a field is blank ─────────────────────────────────────────────

OWNER_PRESENT = "present"
OWNER_ABSENT_FROM_RECORD = "absent_from_record"

#: Invariant #4 in a data field. "Owner unavailable" is three different
#: situations wearing one label, and only one of them is the officer's to
#: act on:
#:
#:   - the county returned this parcel but no owner name for it — a gap in
#:     the record, nothing to do, and NOT a reason to distrust the parcel;
#:   - the parcel was never matched — there is no record to be missing
#:     from, which is a different screen entirely;
#:   - the county service is down or unconfigured — a system problem, and
#:     the officer's next action is to wait or enter details by hand.
#:
#: The third never reaches this list: a failed search returns an error
#: status and no candidates. So the only distinction this module can draw
#: honestly is the first, and it draws it by name rather than leaving a
#: blank for the reader to interpret.
OWNER_REASONS = {
    OWNER_ABSENT_FROM_RECORD:
        "No owner name in the county record for this parcel",
}


def owner_status(match: Dict[str, Any]) -> str:
    name = (match.get("owner") or match.get("owner_name") or "").strip()
    return OWNER_PRESENT if name else OWNER_ABSENT_FROM_RECORD
