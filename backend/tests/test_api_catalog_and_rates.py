"""A2 — the derived catalog and the single rates source (CI-safe).

Two forks died here:

1. The API's deed types were a hardcoded five-value enum while the
   chassis rendered nine deed-family instruments. Four were invisible to
   partners and nothing would have reported it. The set is now derived
   from the FORMS registry mirror.
2. The transfer-tax endpoint carried its own city-rate table that
   disagreed with the officer-facing calculator — same city, two rates,
   and whichever surface a caller hit decided what their deed declared.
"""
import re
from pathlib import Path

import pytest

from tests.source_text import code_only

from schemas.api_v1.deeds import (
    CreateDeedRequest, DeedType, EntityModel, GranteeModel, GrantorModel,
    PropertyModel, RecordingModel, ReturnToModel, TaxBasis, TransferTaxModel,
)
from services.api_catalog import (
    API_DEED_TYPES, TYPE_REQUIREMENTS, chassis_type, rules_for,
)
from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
from services.dtt_rates import (
    CITIES_WITH_OWN_DTT, CITY_RATES_PER_1000, COUNTY_RATE_PER_1000,
    city_rate_per_1000, compute_dtt,
)
from services.form_families import FAMILY_BY_DEED_TYPE

BACKEND = Path(__file__).resolve().parents[1]
DTT_CALC_TS = BACKEND.parent / "frontend/src/lib/dttCalc.ts"


# ── The catalog is derived, not hand-kept ────────────────────────────

def test_exposed_types_match_the_registry_deed_family():
    # Spelled out rather than imported: these are the registry's legacy
    # slug aliases (deed_pdf accepts both spellings), and listing them
    # here means adding another alias cannot quietly change the API's
    # public type set.
    legacy_aliases = {"quitclaim"}
    from_registry = {
        slug.replace("-", "_") for slug, fam in FAMILY_BY_DEED_TYPE.items()
        if fam == "deed" and "_" not in slug and slug not in legacy_aliases
    }
    assert set(API_DEED_TYPES) == from_registry
    assert set(t.value for t in DeedType) == from_registry


def test_the_four_previously_invisible_instruments_are_exposed():
    """These render on the chassis and the wizard offers them; the API's
    hardcoded list simply omitted them."""
    for slug in ["grant_deed_jt", "grant_deed_cp_ros",
                 "grant_deed_corp", "grant_deed_partnership"]:
        assert slug in API_DEED_TYPES


def test_every_exposed_type_has_an_explicit_requirements_entry():
    """Deriving the SET is automatic; deciding an instrument's FACTS is
    not. A new deed type must not reach partners until someone answers
    what it needs and what it refuses — the entity deeds would have
    shipped silently printing a blank line inside a granting clause."""
    missing = [t for t in API_DEED_TYPES if t not in TYPE_REQUIREMENTS]
    assert missing == [], f"exposed without a requirements decision: {missing}"
    stale = [t for t in TYPE_REQUIREMENTS if t not in API_DEED_TYPES]
    assert stale == [], f"requirements for types no longer exposed: {stale}"


def test_every_exposed_type_has_a_chassis_template():
    for api_slug in API_DEED_TYPES:
        assert chassis_type(api_slug) in TEMPLATE_BY_DEED_TYPE, api_slug


# ── Per-instrument facts and refusals ────────────────────────────────

def _payload(deed_type, vesting="a single man", entity=None):
    return dict(
        deed_type=deed_type,
        property=PropertyModel(
            address="1 Test St", city="Los Angeles", state="CA", zip="90001",
            county="Los Angeles", apn="1-2-3",
            legal_description="LOT 1, TRACT 1"),
        grantor=GrantorModel(name="GRANTOR", entity=entity),
        grantee=GranteeModel(name="GRANTEE", vesting=vesting),
        transfer_tax=TransferTaxModel(exempt=False, value=1000.0,
                                      basis=TaxBasis.FULL_VALUE),
        recording=RecordingModel(
            requested_by="Escrow",
            return_to=ReturnToModel(name="GRANTEE", address="1 Test St",
                                    city="Los Angeles", state="CA", zip="90001")),
    )


@pytest.mark.parametrize("deed_type", ["grant_deed_jt", "grant_deed_cp_ros"])
def test_fixed_vesting_instruments_refuse_a_supplied_vesting(deed_type):
    """Their templates never read a stored vesting value, so accepting one
    and dropping it would silently discard a caller's legal input."""
    with pytest.raises(Exception) as exc:
        CreateDeedRequest(**_payload(deed_type, vesting="as tenants in common"))
    assert "fixes its own vesting" in str(exc.value)

    # And they build fine without one.
    CreateDeedRequest(**_payload(deed_type, vesting=None))


@pytest.mark.parametrize("deed_type", ["grant_deed", "interspousal_transfer",
                                       "warranty_deed", "tax_deed"])
def test_ordinary_deeds_still_require_vesting(deed_type):
    with pytest.raises(Exception) as exc:
        CreateDeedRequest(**_payload(deed_type, vesting=None))
    assert "vesting is required" in str(exc.value)


def test_quitclaim_vesting_is_optional():
    CreateDeedRequest(**_payload("quitclaim_deed", vesting=None))


def test_entity_deeds_require_their_recited_facts():
    with pytest.raises(Exception) as exc:
        CreateDeedRequest(**_payload("grant_deed_corp"))
    assert "grantor.entity.entity_state" in str(exc.value)

    with pytest.raises(Exception) as exc:
        CreateDeedRequest(**_payload(
            "grant_deed_partnership", entity=EntityModel(entity_state="California")))
    assert "grantor.entity.partnership_type" in str(exc.value)

    CreateDeedRequest(**_payload(
        "grant_deed_corp", entity=EntityModel(entity_state="Delaware")))


def test_entity_facts_reach_the_template_slot():
    """Entity recitals must land where the templates read them
    (metadata.affidavit), or the deed prints blanks mid-clause."""
    from routers.api_v1.router import build_render_row
    req = CreateDeedRequest(**_payload(
        "grant_deed_partnership",
        entity=EntityModel(entity_state="Nevada", partnership_type="limited partnership")))
    meta = build_render_row(req)["metadata"]
    assert meta["affidavit"] == {"entity_state": "Nevada",
                                 "partnership_type": "limited partnership"}


def test_entity_slot_is_absent_for_ordinary_deeds():
    from routers.api_v1.router import build_render_row
    req = CreateDeedRequest(**_payload("grant_deed"))
    assert build_render_row(req)["metadata"]["affidavit"] is None


# ── One rates source ─────────────────────────────────────────────────

def _registry_places():
    """Parse the TS registry.

    T-2a: entries became multi-line and gained `tieredAbove` and `source`,
    so the flat one-line regex this used no longer matches. Walk each
    object's braces instead of pattern-matching a formatting choice — the
    pin is about the FACTS in the registry, not how prettier wrapped them.
    """
    src = (BACKEND.parent / "frontend/src/lib/jurisdictions.ts").read_text(encoding="utf-8")
    block = src[src.index("export const PLACES"):src.index("/**\n * Normalize for comparison")]
    out = []
    for m in re.finditer(r"city: '([^']+)'", block):
        obj_start = block.rfind("{", 0, m.start())
        depth, i = 0, obj_start
        while i < len(block):
            if block[i] == "{":
                depth += 1
            elif block[i] == "}":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        txt = block[obj_start:i + 1]

        def fld(name, pat):
            mm = re.search(name + r":\s*" + pat, txt)
            return mm.group(1) if mm else None

        rate = fld("dttRatePer1000", r"([\d._]+|null)")
        out.append((
            m.group(1),
            fld("county", r"'([^']+)'"),
            fld("incorporated", r"(true|false)") == "true",
            None if rate in (None, "null") else float(rate.replace("_", "")),
        ))
    return out


def test_backend_rates_mirror_the_officer_facing_calculator():
    """Same arrangement form_families.py has with formRegistry.ts: a rate
    that differs between the wizard and the API is a number headed for a
    legal declaration under two different values.

    T-2 rewrote this pin (it used to assert the SHAPE of the substring
    matcher that ticket removed). T-2a widened its parser when the rows
    gained tier and source fields.
    """
    from services.jurisdictions import PLACES

    ts = _registry_places()
    py = [(p.city, p.county, p.incorporated, p.dtt_rate_per_1000) for p in PLACES]
    assert py == ts, "the registries disagree — one surface would declare a different tax"
    assert COUNTY_RATE_PER_1000 == 1.10


def test_the_la_county_set_is_closed_at_five():
    """T-2a owner sign-off. Every LA County row is an affirmative fact —
    a rate or a verified zero — never an unknown, because 'not among the
    five' is knowledge about this county rather than a gap in it."""
    from services.jurisdictions import PLACES, city_dtt_rate

    la = [p for p in PLACES if p.county == "Los Angeles"]
    rated = sorted(p.city for p in la
                   if p.dtt_rate_per_1000 is not None and p.dtt_rate_per_1000 > 0)
    assert rated == sorted([
        "Culver City", "Los Angeles", "Pomona", "Redondo Beach", "Santa Monica"])
    assert all(p.dtt_rate_per_1000 is not None for p in la), \
        "an LA County row went back to unknown — the set is closed"
    # And the three that were wrongly rated $2.20 levy nothing.
    for city in ("Long Beach", "Inglewood", "Pasadena"):
        assert city_dtt_rate(city).state == "none"


def test_tiers_are_flagged_and_never_priced():
    """RULED: name the measure, state no rate. Measure ULA's thresholds
    adjust annually — a compiled-in rate goes stale while still printing a
    confident number, and understating a City of LA transfer by ULA's
    margin is the failure being avoided."""
    from services.jurisdictions import city_dtt_rate as rate_of

    low = rate_of("Los Angeles", 1_000_000)
    assert low.state == "rated" and low.rate_per_1000 == 4.50

    high = rate_of("Los Angeles", 6_000_000)
    assert high.state == "tiered"
    assert high.measure == "Measure ULA"
    assert high.rate_per_1000 is None, "the flag must never carry a rate"

    d = compute_dtt(6_000_000, "Los Angeles")
    assert d["city_tax"] == 0.0, "no city portion may be computed above the tier"
    assert d["city_tier_measure"] == "Measure ULA"
    # The county portion does not tier and is still computed.
    assert d["county_tax"] == 6600.0


def test_there_is_no_generic_fallback_city_rate():
    """DEFAULT_CITY_RATE_PER_1000 is deliberately gone.

    A single fallback rate applied to "any city we don't have" is the
    pre-X2.3 disease in a nicer coat: it invents a number for a place we
    know nothing about. Every rate is per-place now, and a place we do
    not hold resolves to UNKNOWN rather than to a default.
    """
    import services.dtt_rates as rates
    assert not hasattr(rates, "DEFAULT_CITY_RATE_PER_1000")

    # T-3: was a fourth inline copy of the docstring-and-comment strip.
    # The module docstring recounts the rate history and necessarily
    # quotes the old fallback figure — the sixth pin-trip on prose
    # explaining a removal, and the reason the helper is shared now.
    code = code_only(BACKEND / "services/dtt_rates.py")
    assert "2.20" not in code, "a fallback rate reappeared in code"


def test_the_api_no_longer_carries_its_own_rate_table():
    src = (BACKEND / "routers/api_v1/router.py").read_text(encoding="utf-8")
    assert "city_rates = {" not in src, "the forked table came back"
    assert "from services.dtt_rates import compute_dtt" in src
    # No literal rate arithmetic left in the router — rates live in one
    # module. (Comments may name the old rates; code may not compute
    # with them.)
    code = "\n".join(line for line in src.splitlines()
                     if not line.strip().startswith("#"))
    assert not re.search(r"/ 1000\)?\s*\*\s*[\d.]+", code), "rate math back in the router"


def test_an_unheld_city_is_unknown_rather_than_free():
    """T-2 sharpened X2.3. That fix stopped INVENTING a generic rate for
    every city; this one stops inventing a ZERO for cities we have never
    rated. Fresno contributed $0 and the total read as complete — but we
    hold no Fresno rate, so the $0 was invented too. It just cost the
    other party."""
    assert city_rate_per_1000("Fresno") is None
    assert compute_dtt(500_000, "Fresno")["city_tax"] == 0.0
    assert compute_dtt(500_000, "Fresno")["city_rate_known"] is False

    # An affirmative zero is distinguishable from an unknown: East Los
    # Angeles is unincorporated, so "levies none" is knowledge.
    assert compute_dtt(500_000, "East Los Angeles")["city_rate_known"] is True
    assert compute_dtt(500_000, "East Los Angeles")["city_tax"] == 0.0


def test_substring_collisions_cannot_charge_a_neighbours_rate():
    """The live defect, on the backend side of the wire."""
    assert compute_dtt(1_000_000, "San Francisco")["city_tax"] == 7500.0
    assert compute_dtt(1_000_000, "South San Francisco")["city_tax"] == 0.0
    assert compute_dtt(1_000_000, "South San Francisco")["city_rate_known"] is False
    assert compute_dtt(1_000_000, "Los Angeles")["city_tax"] == 4500.0
    assert compute_dtt(1_000_000, "East Los Angeles")["city_tax"] == 0.0


def test_known_city_rates():
    assert city_rate_per_1000("Los Angeles") == 4.50
    assert city_rate_per_1000("San Francisco") == 7.50
    assert city_rate_per_1000("Oakland") == 15.00
    # T-2a: Pasadena was $2.20 here and levies NOTHING (owner sign-off,
    # PCT chart). Pomona is the surviving $2.20 city.
    assert city_rate_per_1000("Pasadena") is None
    assert city_rate_per_1000("Pomona") == 2.20
    assert city_rate_per_1000("Santa Monica") == 3.00
    # County portion alone on a $500k transfer.
    assert compute_dtt(500_000, None)["total_tax"] == 550.0
