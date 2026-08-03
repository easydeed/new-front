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
    DEFAULT_CITY_RATE_PER_1000, city_rate_per_1000, compute_dtt,
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

def _ts_rates():
    """Parse the officer-facing calculator's rates out of dttCalc.ts."""
    src = DTT_CALC_TS.read_text(encoding="utf-8")
    cities = re.search(r"CITIES_WITH_OWN_DTT\s*=\s*\[(.*?)\]", src, re.S).group(1)
    city_list = re.findall(r"'([^']+)'", cities)
    county = float(re.search(r"\(amount / 1000\) \* ([\d.]+)", src).group(1))
    specials = {}
    for city, rate in re.findall(
            r"cityLower\.includes\('([^']+)'\)\)\s*\{\s*cityTax = \(amount / 1000\) \* ([\d.]+)", src):
        specials[city] = float(rate)
    default = float(re.findall(r"else \{\s*cityTax = \(amount / 1000\) \* ([\d.]+)", src)[0])
    return city_list, county, specials, default


def test_backend_rates_mirror_the_officer_facing_calculator():
    """Same arrangement form_families.py has with formRegistry.ts: a rate
    that differs between the wizard and the API is a number headed for a
    legal declaration under two different values."""
    city_list, county, specials, default = _ts_rates()
    assert CITIES_WITH_OWN_DTT == city_list
    assert COUNTY_RATE_PER_1000 == county
    assert CITY_RATES_PER_1000 == specials
    assert DEFAULT_CITY_RATE_PER_1000 == default


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


def test_cities_without_their_own_dtt_are_charged_nothing():
    """The pre-X2.3 disease: applying a generic city rate to any city at
    all invented tax for cities that levy none."""
    assert city_rate_per_1000("Fresno") is None
    assert compute_dtt(500_000, "Fresno")["city_tax"] == 0.0
    assert compute_dtt(500_000, "Fresno")["city_levies_own_dtt"] is False


def test_known_city_rates():
    assert city_rate_per_1000("Los Angeles") == 4.50
    assert city_rate_per_1000("San Francisco") == 7.50
    assert city_rate_per_1000("Oakland") == 15.00
    assert city_rate_per_1000("Pasadena") == DEFAULT_CITY_RATE_PER_1000
    # County portion alone on a $500k transfer.
    assert compute_dtt(500_000, None)["total_tax"] == 550.0
