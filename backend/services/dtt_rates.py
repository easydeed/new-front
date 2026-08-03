"""Documentary transfer tax rates — the ONE source on the backend.

Mirror of the officer-facing calculator (frontend/src/lib/dttCalc.ts). A
jest pin in dttCalc.test.ts reads this file and holds the two in sync, the
same arrangement form_families.py has with formRegistry.ts — because a
rate that differs between the wizard and the API is a number headed for a
legal declaration under two different values.

A2 killed the fork: the partner API carried its OWN city table with
different rates than the wizard (San Francisco $3.75 vs $7.50, Santa
Monica $3.00, Berkeley $15.00 — cities the wizard priced differently or
not at all). Whichever table a partner hit decided what their deed
declared. There is one table now, and it is this one.

RATE PROVENANCE — unchanged from dttCalc.ts, and still the owner's
escrow review to confirm against current schedules:
  county $1.10 per $1,000 (R&T §11911)
  city rates are APPROXIMATIONS of tiered municipal schedules:
    Los Angeles $4.50, San Francisco $7.50, Oakland $15.00,
    every other city with its own DTT $2.20 per $1,000
Cities absent from CITIES_WITH_OWN_DTT levy no municipal transfer tax and
must be charged nothing — the pre-X2.3 code applied a generic $2.20 to
any city at all, which invented tax for cities that levy none.
"""
from typing import Optional, TypedDict

COUNTY_RATE_PER_1000 = 1.10

# Cities with their own documentary transfer tax (order mirrors dttCalc.ts).
CITIES_WITH_OWN_DTT = [
    "los angeles",
    "san francisco",
    "oakland",
    "berkeley",
    "san jose",
    "sacramento",
    "riverside",
    "pomona",
    "culver city",
    "santa monica",
    "redondo beach",
    "inglewood",
    "long beach",
    "pasadena",
]

# Cities whose rate differs from the $2.20 default.
CITY_RATES_PER_1000 = {
    "los angeles": 4.50,
    "san francisco": 7.50,
    "oakland": 15.00,
}
DEFAULT_CITY_RATE_PER_1000 = 2.20


class DttBreakdown(TypedDict):
    county_tax: float
    city_tax: float
    total_tax: float
    county_rate_per_1000: float
    city_rate_per_1000: Optional[float]
    city_levies_own_dtt: bool


def city_rate_per_1000(city: Optional[str]) -> Optional[float]:
    """None when the city levies no transfer tax of its own — distinct
    from 0.0, which would read as 'levies one, and it is zero'."""
    if not city:
        return None
    lowered = city.strip().lower()
    if not any(known in lowered for known in CITIES_WITH_OWN_DTT):
        return None
    for known, rate in CITY_RATES_PER_1000.items():
        if known in lowered:
            return rate
    return DEFAULT_CITY_RATE_PER_1000


def compute_dtt(taxable_value: float, city: Optional[str] = None,
                apply_city_tax: bool = True) -> DttBreakdown:
    """County portion always; city portion only when the property sits in
    a city that levies its own DTT."""
    value = max(0.0, float(taxable_value or 0))
    county_tax = (value / 1000.0) * COUNTY_RATE_PER_1000

    rate = city_rate_per_1000(city) if apply_city_tax else None
    city_tax = (value / 1000.0) * rate if rate else 0.0

    return {
        "county_tax": round(county_tax, 2),
        "city_tax": round(city_tax, 2),
        "total_tax": round(county_tax + city_tax, 2),
        "county_rate_per_1000": COUNTY_RATE_PER_1000,
        "city_rate_per_1000": rate,
        "city_levies_own_dtt": rate is not None,
    }
