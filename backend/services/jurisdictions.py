"""T-2 — the jurisdictions registry, backend mirror.

Mirror of frontend/src/lib/jurisdictions.ts. Read that file for the full
account of why this exists; the short version is that "place" used to be
a STRING the code pattern-matched rather than an IDENTITY it looked up,
and substring matching charged South San Francisco the City of San
Francisco's $7.50 per $1,000 while charging unincorporated East Los
Angeles the City of LA's $4.50.

A jest pin (dttRatesMirror.test.ts) reads this file and holds the two in
sync — the same arrangement form_families.py has with formRegistry.ts —
because a rate that differs between the wizard and the partner API is a
number headed for a legal declaration under two different values. That is
not hypothetical: A2 found exactly that fork and killed it in two files
while a third copy survived in propertyPrefill.ts until T-2.

RATE SEMANTICS — the distinction the whole ticket turns on:

    rate > 0     levies its own DTT at this rate
    rate == 0    AFFIRMATIVE: we know it levies none
    rate is None we do not know. Callers must ASK, never assume.

A zero we invented is the same class of error as a $7,500 we invented; it
just costs the other party. Absence of knowledge must not render as fact.

RATE PROVENANCE: every non-None rate is carried forward unchanged from
the pre-T-2 table and remains the owner's escrow review to confirm
against current published schedules. The `None` rows are the honest gaps
that review should fill — not omissions to be closed by guessing.
"""
from typing import Dict, List, NamedTuple, Optional


class Place(NamedTuple):
    city: str
    county: str
    incorporated: bool
    dtt_rate_per_1000: Optional[float]


class PcorRouting(NamedTuple):
    office: str
    notes: str


# County-level knowledge. LA's PCOR routing is the registry's first datum:
# the form is filed with the Registrar-Recorder/County Clerk alongside the
# deed, not sent separately to the Assessor — which is why the county
# publishes it at lavote.gov and why officers new to LA look in the wrong
# place for it.
PCOR_ROUTING: Dict[str, PcorRouting] = {
    "los angeles": PcorRouting(
        office="Los Angeles County Registrar-Recorder/County Clerk",
        notes="Filed concurrently with the deed at the recorder, not sent separately to the Assessor.",
    ),
}

# Order mirrors PLACES in jurisdictions.ts exactly — the pin compares them
# element by element, so a reordering here is a failure, not a style
# choice.
PLACES: List[Place] = [
    Place("Los Angeles", "Los Angeles", True, 4.50),
    Place("Culver City", "Los Angeles", True, 2.20),
    Place("Santa Monica", "Los Angeles", True, 2.20),
    Place("Redondo Beach", "Los Angeles", True, 2.20),
    Place("Inglewood", "Los Angeles", True, 2.20),
    Place("Long Beach", "Los Angeles", True, 2.20),
    Place("Pasadena", "Los Angeles", True, 2.20),
    Place("Pomona", "Los Angeles", True, 2.20),
    Place("East Los Angeles", "Los Angeles", False, 0),
    Place("Lake Los Angeles", "Los Angeles", False, 0),
    Place("South Pasadena", "Los Angeles", True, None),
    Place("South San Francisco", "San Mateo", True, None),
    Place("West Sacramento", "Yolo", True, None),
    Place("San Francisco", "San Francisco", True, 7.50),
    Place("Oakland", "Alameda", True, 15.00),
    Place("Berkeley", "Alameda", True, 2.20),
    Place("San Jose", "Santa Clara", True, 2.20),
    Place("Sacramento", "Sacramento", True, 2.20),
    Place("Riverside", "Riverside", True, 2.20),
    Place("Hercules", "Contra Costa", True, None),
    Place("Hayward", "Alameda", True, None),
    Place("Richmond", "Contra Costa", True, None),
    Place("Alameda", "Alameda", True, None),
    Place("Albany", "Alameda", True, None),
    Place("Emeryville", "Alameda", True, None),
    Place("Piedmont", "Alameda", True, None),
    Place("San Leandro", "Alameda", True, None),
    Place("San Pablo", "Contra Costa", True, None),
    Place("Mountain View", "Santa Clara", True, None),
    Place("Palo Alto", "Santa Clara", True, None),
    Place("Petaluma", "Sonoma", True, None),
    Place("Santa Rosa", "Sonoma", True, None),
    Place("Sebastopol", "Sonoma", True, None),
    Place("Cotati", "Sonoma", True, None),
    Place("Cloverdale", "Sonoma", True, None),
]

_BY_NAME = {}


def normalize_place(name: Optional[str]) -> str:
    """Comparison only, never display. Case and whitespace collapse and
    nothing else — direction words ("South", "West") are NOT stripped,
    because they are the entire difference between two different cities in
    two different counties."""
    return " ".join((name or "").strip().lower().split())


for _p in PLACES:
    _BY_NAME[normalize_place(_p.city)] = _p


def lookup_place(city: Optional[str]) -> Optional[Place]:
    """EXACT lookup. None means we do not hold this place — which the
    caller must surface as a question, never resolve as a zero."""
    key = normalize_place(city)
    return _BY_NAME.get(key) if key else None


class CityRate(NamedTuple):
    """Tri-state, deliberately. `state` is one of:
    'rated' (levies its own, at rate), 'none' (affirmatively levies none),
    'unknown' (we do not know — ask the officer)."""
    state: str
    rate_per_1000: Optional[float] = None
    place: Optional[str] = None


def city_dtt_rate(city: Optional[str]) -> CityRate:
    place = lookup_place(city)
    if place is None:
        return CityRate("unknown", None, (city or "").strip())
    if place.dtt_rate_per_1000 is None:
        return CityRate("unknown", None, place.city)
    if place.dtt_rate_per_1000 == 0:
        return CityRate("none")
    return CityRate("rated", place.dtt_rate_per_1000)


def is_incorporated(city: Optional[str]) -> Optional[bool]:
    """Its OWN fact — not "does it tax". The pre-T-2 code conflated the
    two and labelled Glendale unincorporated because that produced the
    right tax by accident."""
    place = lookup_place(city)
    return place.incorporated if place else None
