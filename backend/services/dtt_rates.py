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

from services.jurisdictions import PLACES as _PLACES, city_dtt_rate

COUNTY_RATE_PER_1000 = 1.10

# T-2: the city table and its matching moved to services/jurisdictions.py.
# This module computes; the registry knows places. What lived here was a
# flat name list matched with `if known in lowered` — substring matching,
# which charged South San Francisco the City of San Francisco's rate.
#
# Kept as DERIVED back-compat exports so nothing hand-maintains a second
# list beside the registry. That is precisely how the A2 fork survived in
# a third file until T-2 found it.
CITIES_WITH_OWN_DTT = [
    p.city.lower() for p in _PLACES
    if p.dtt_rate_per_1000 is not None and p.dtt_rate_per_1000 > 0
]
CITY_RATES_PER_1000 = {
    p.city.lower(): p.dtt_rate_per_1000 for p in _PLACES
    if p.dtt_rate_per_1000 is not None and p.dtt_rate_per_1000 > 0
}

class DttBreakdown(TypedDict):
    county_tax: float
    city_tax: float
    total_tax: float
    county_rate_per_1000: float
    city_rate_per_1000: Optional[float]
    city_levies_own_dtt: bool
    # T-2: False when we do not KNOW the rate — distinct from knowing it
    # is zero. Callers must ask rather than print a number.
    city_rate_known: bool
    # Set when a tiered high-value bracket applies. Names the measure and
    # never a rate — flag over stale math.
    city_tier_measure: Optional[str]


def city_rate_per_1000(city: Optional[str]) -> Optional[float]:
    """The rate, or None when no city portion applies.

    T-2 NOTE: None is now ambiguous by necessity of the old signature — it
    covers both "levies none" and "we do not know". Callers that need to
    tell those apart must use `city_dtt_rate` from services.jurisdictions
    (or read `city_rate_known` off compute_dtt). This wrapper survives for
    the existing pins; the tri-state is the real contract.
    """
    rate = city_dtt_rate(city)
    return rate.rate_per_1000 if rate.state == "rated" else None


def compute_dtt(taxable_value: float, city: Optional[str] = None,
                apply_city_tax: bool = True) -> DttBreakdown:
    """County portion always; city portion only when the property sits in
    a city that levies its own DTT."""
    value = max(0.0, float(taxable_value or 0))
    county_tax = (value / 1000.0) * COUNTY_RATE_PER_1000

    # A caller that supplies no city is not asking about an unknown place —
    # it is stating there is no city portion. Only a NAMED place we do not
    # hold is "unknown".
    resolved = city_dtt_rate(city, value) if (apply_city_tax and city) else None
    rate = resolved.rate_per_1000 if resolved and resolved.state == "rated" else None
    city_tax = (value / 1000.0) * rate if rate else 0.0
    # Unknown is not zero. A city we have never rated must not be
    # reported as one that levies nothing.
    known = resolved is None or resolved.state in ("rated", "none", "tiered")
    # T-2a: a high-value bracket applies and we deliberately computed NO
    # city portion. The measure is named; no rate is stated.
    tier = (resolved.measure if resolved and resolved.state == "tiered" else None)

    return {
        "county_tax": round(county_tax, 2),
        "city_tax": round(city_tax, 2),
        "total_tax": round(county_tax + city_tax, 2),
        "county_rate_per_1000": COUNTY_RATE_PER_1000,
        "city_rate_per_1000": rate,
        "city_levies_own_dtt": rate is not None,
        "city_rate_known": known,
        "city_tier_measure": tier,
    }
