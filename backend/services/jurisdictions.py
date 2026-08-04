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


class Tier(NamedTuple):
    """A high-value bracket. FLAGGED, never computed — see the TS mirror:
    tier schedules move (Measure ULA adjusts annually) and a compiled-in
    rate goes stale while still producing confident numbers."""
    amount: int
    measure: str
    boundaries: Optional[List[int]] = None


class Place(NamedTuple):
    city: str
    county: str
    incorporated: bool
    dtt_rate_per_1000: Optional[float]
    tiered_above: Optional[Tier] = None
    source: Optional[str] = None


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
    Place("Los Angeles", "Los Angeles", True, 4.5, Tier(5000000, "Measure ULA", None), "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Santa Monica", "Los Angeles", True, 3.0, Tier(5000000, "Measure SM ($6.00 tier); Measure GS beyond", None), "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Culver City", "Los Angeles", True, 4.5, Tier(1500000, "Measure RE", [1500000, 3000000, 10000000]), "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Pomona", "Los Angeles", True, 2.2, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Redondo Beach", "Los Angeles", True, 2.2, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Long Beach", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Inglewood", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Pasadena", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Torrance", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Glendale", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Burbank", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Downey", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Norwalk", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Compton", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Carson", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Lakewood", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("El Monte", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("West Covina", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Whittier", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Lynwood", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("Paramount", "Los Angeles", True, 0.0, None, "PCT chart pct.com/resources/transfer-tax (Aug 2026) + owner verification 2026-08-04"),
    Place("South Pasadena", "Los Angeles", True, 0.0, None, "Derived from the closed-set ruling (owner, 2026-08-04)"),
    Place("East Los Angeles", "Los Angeles", False, 0.0, None, "Unincorporated territory levies no municipal transfer tax (structural); closed-set ruling (owner, 2026-08-04)"),
    Place("Lake Los Angeles", "Los Angeles", False, 0.0, None, "Unincorporated territory levies no municipal transfer tax (structural); closed-set ruling (owner, 2026-08-04)"),
    Place("South San Francisco", "San Mateo", True, None, None, None),
    Place("West Sacramento", "Yolo", True, None, None, None),
    Place("San Francisco", "San Francisco", True, 7.5, None, None),
    Place("Oakland", "Alameda", True, 15.0, None, None),
    Place("Berkeley", "Alameda", True, 2.2, None, None),
    Place("San Jose", "Santa Clara", True, 2.2, None, None),
    Place("Sacramento", "Sacramento", True, 2.2, None, None),
    Place("Riverside", "Riverside", True, 2.2, None, None),
    Place("Hercules", "Contra Costa", True, None, None, None),
    Place("Hayward", "Alameda", True, None, None, None),
    Place("Richmond", "Contra Costa", True, None, None, None),
    Place("Alameda", "Alameda", True, None, None, None),
    Place("Albany", "Alameda", True, None, None, None),
    Place("Emeryville", "Alameda", True, None, None, None),
    Place("Piedmont", "Alameda", True, None, None, None),
    Place("San Leandro", "Alameda", True, None, None, None),
    Place("San Pablo", "Contra Costa", True, None, None, None),
    Place("Mountain View", "Santa Clara", True, None, None, None),
    Place("Palo Alto", "Santa Clara", True, None, None, None),
    Place("Petaluma", "Sonoma", True, None, None, None),
    Place("Santa Rosa", "Sonoma", True, None, None, None),
    Place("Sebastopol", "Sonoma", True, None, None, None),
    Place("Cotati", "Sonoma", True, None, None, None),
    Place("Cloverdale", "Sonoma", True, None, None, None),
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
    """Four states, deliberately. `state` is one of:
    'rated'   levies its own, at rate
    'none'    affirmatively levies none
    'tiered'  a high-value bracket applies — the measure is NAMED and no
              rate is stated; the caller must not compute from the base
    'unknown' we do not know — ask the officer"""
    state: str
    rate_per_1000: Optional[float] = None
    place: Optional[str] = None
    measure: Optional[str] = None
    threshold: Optional[int] = None


def city_dtt_rate(city: Optional[str],
                  consideration: Optional[float] = None) -> CityRate:
    place = lookup_place(city)
    if place is None:
        return CityRate("unknown", None, (city or "").strip())
    if place.dtt_rate_per_1000 is None:
        return CityRate("unknown", None, place.city)
    if (place.tiered_above is not None and consideration is not None
            and consideration >= place.tiered_above.amount):
        return CityRate("tiered", None, place.city,
                        place.tiered_above.measure, place.tiered_above.amount)
    if place.dtt_rate_per_1000 == 0:
        return CityRate("none")
    return CityRate("rated", place.dtt_rate_per_1000)


def is_incorporated(city: Optional[str]) -> Optional[bool]:
    """Its OWN fact — not "does it tax". The pre-T-2 code conflated the
    two and labelled Glendale unincorporated because that produced the
    right tax by accident."""
    place = lookup_place(city)
    return place.incorporated if place else None
