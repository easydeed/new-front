"""The parcel the officer chose is the parcel they get — or nobody chooses.

═══ THE DEFECT ═══

An exact autocomplete selection — `1358 5th Street, Coronado, CA` — came
back as 76 candidates with the chosen address not first, neighbouring
parcels above it, and the screen's only advice: "refine search for fewer
results". There was nothing left to refine. The search WAS the address.

APN, legal description and vested owner all come from whichever row gets
clicked. A wrong row does not error — it produces a complete, plausible,
confidently wrong deed from a real county record, with the officer's
confirmation on every field. **Confirming a value proves the officer read
it; it does not prove the value belongs to the property they meant.**
That is the one failure the confirmation model cannot catch, which is why
it is worth this much test.

═══ WHAT THESE PINS PROTECT ═══

 1. AN EXACT MATCH IS SELECTED OUTRIGHT. One candidate that is
    unambiguously the chosen address wins, and the rest become
    alternatives behind "not this one?".

 2. AN AMBIGUOUS ONE IS NEVER BROKEN. Two candidates on the same address
    is a genuine ambiguity — usually a multi-unit building — and the
    moment any rule breaks that tie, the system has invented an answer it
    will be right about often enough that nobody checks it.

 3. NOTHING IS SILENTLY DROPPED. The list used to render the first 25 of
    76, so a parcel the county ranked 40th was not on the page at all —
    and the advice to refine could not reach it.

 4. SPELLING IS NORMALISED, IDENTITY IS NOT. `5th Street` and `5TH ST`
    are one address written twice. `1358` and `1356` are two properties,
    and nothing here is allowed to bring them closer together.

 5. A BLANK FIELD SAYS WHY. "Owner unavailable" was three situations
    wearing one label; only one of them is the officer's to act on.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from auth import get_current_user_id
from main import app
from models.property_data import PropertyData, PropertyMatch, PropertySearchResult
from services import address_match as am
from services.sitex_service import sitex_service
from tests.source_text import code_only

from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


# ══════════════════════════════════════════════════════════════════════
# 1. Spelling is normalised; identity is not
# ══════════════════════════════════════════════════════════════════════

@pytest.mark.parametrize("google,county", [
    ("1358 5th Street", "1358 5TH ST"),
    ("1358 Fifth Avenue", "1358 FIFTH AVE"),
    ("742 North Beacon Boulevard", "742 N BEACON BLVD"),
    ("12 Ocean Way", "12 OCEAN WAY"),
    ("9 Broadway Avenue", "9 BROADWAY AVE"),
    ("100 Sunset Drive.", "100 SUNSET DR"),
    ("55 5th Street West", "55 5TH ST W"),
])
def test_one_address_written_two_ways_is_one_address(google, county):
    assert am.normalize_street(google) == am.normalize_street(county)


@pytest.mark.parametrize("one,other", [
    ("1358 5th Street", "1356 5th Street"),      # a neighbour
    ("1358 5th Street", "1358 6th Street"),      # a parallel street
    ("1358 5th Street", "1358 5th Avenue"),      # a different street type
    ("742 N Beacon Blvd", "742 S Beacon Blvd"),  # the other side of town
])
def test_two_properties_are_never_normalised_into_one(one, other):
    """THE PIN THAT MATTERS MOST HERE.

    Every fuzzy-matching temptation in this module ends at this test. A
    normaliser that made any of these pairs equal would silently swap one
    property for another on a recorded legal document.
    """
    assert am.normalize_street(one) != am.normalize_street(other)


@pytest.mark.parametrize("written,unit", [
    ("1358 5TH ST UNIT 3B", "3B"),
    ("1358 5TH ST APT 3B", "3B"),
    ("1358 5TH ST #3B", "3B"),
    ("1358 5TH ST STE 200", "200"),
])
def test_the_unit_designator_is_spelling_and_the_unit_is_not(written, unit):
    assert am.normalize_unit(written) == unit
    assert am.normalize_street(written) == "1358 5TH ST"


def test_a_bare_trailing_number_is_not_assumed_to_be_a_unit():
    """`1358 5TH ST 3` is more likely a mangled address than unit 3, and
    inventing a unit is the same class of guess as inventing a parcel."""
    assert am.normalize_unit("1358 5TH ST 3") == ""


def test_a_missing_zip_is_silence_and_a_different_zip_is_disagreement():
    """Treating silence as agreement is how a matcher finds the right
    street in the wrong town."""
    wanted = am.Address(street="1358 5th Street", city="Coronado", zip_code="92118")
    no_zip = am.Address(street="1358 5TH ST", city="Coronado")
    wrong_zip = am.Address(street="1358 5TH ST", city="Coronado", zip_code="92101")

    assert am.same_address(wanted, no_zip) is True
    assert am.same_address(wanted, wrong_zip) is False


def test_the_same_street_in_two_cities_is_two_properties():
    wanted = am.Address(street="1358 5th Street", city="Coronado")
    elsewhere = am.Address(street="1358 5TH ST", city="San Diego")
    assert am.same_address(wanted, elsewhere) is False


# ══════════════════════════════════════════════════════════════════════
# 2. Exactly one selects; anything else does not
# ══════════════════════════════════════════════════════════════════════

def candidate(address, apn, *, city="Coronado", zip_code="92118",
              unit=None, owner="SMITH, JANE"):
    return {"address": address, "city": city, "state": "CA",
            "zip_code": zip_code, "zip": zip_code, "apn": apn,
            "fips": "06073", "owner": owner, "owner_name": owner,
            "unit_number": unit, "unit_type": "UNIT" if unit else None,
            "use_code_description": "Single Family"}


CORONADO = am.Address(street="1358 5th Street", city="Coronado", zip_code="92118")


def test_the_chosen_address_is_selected_out_of_a_crowd():
    matches = [
        candidate("1356 5TH ST", "537-101-01"),
        candidate("1360 5TH ST", "537-101-03"),
        candidate("1358 5TH ST", "537-101-02"),   # the one, and not first
        candidate("1358 6TH ST", "537-102-02"),
    ]
    selected, ranked = am.select(CORONADO, matches)
    assert selected is not None
    assert selected["apn"] == "537-101-02"
    # And the alternatives survive, all of them, nearest first.
    assert len(ranked) == 4
    assert ranked[0]["apn"] == "537-101-02"


def test_a_multi_unit_building_is_never_resolved_for_the_officer():
    """The 76-candidate case. Every unit in the building is the same
    street address; the unit is the deciding fact and the officer has not
    stated one. Picking here would be inventing an answer."""
    matches = [candidate("1358 5TH ST", f"537-101-{n:02d}", unit=str(n))
               for n in range(1, 20)]
    selected, ranked = am.select(CORONADO, matches)
    assert selected is None
    assert len(ranked) == 19


def test_two_parcels_on_one_address_are_a_tie_that_is_not_broken():
    matches = [
        candidate("1358 5TH ST", "537-101-02"),
        candidate("1358 5TH ST", "537-101-99"),
    ]
    selected, _ = am.select(CORONADO, matches)
    assert selected is None, (
        "two candidates on one address is a genuine ambiguity — breaking "
        "it by any rule is how a deed ends up describing the wrong parcel")


def test_no_candidate_matching_selects_nothing():
    matches = [candidate("1356 5TH ST", "537-101-01"),
               candidate("1360 5TH ST", "537-101-03")]
    selected, ranked = am.select(CORONADO, matches)
    assert selected is None
    assert len(ranked) == 2


def test_a_stated_unit_selects_its_own_parcel():
    wanted = am.Address(street="1358 5th Street", unit="3",
                        city="Coronado", zip_code="92118")
    matches = [candidate("1358 5TH ST", f"537-101-{n:02d}", unit=str(n))
               for n in range(1, 6)]
    selected, _ = am.select(wanted, matches)
    assert selected is not None and selected["apn"] == "537-101-03"


def test_ranking_never_drops_a_candidate():
    """The screen rendered 25 of 76 and advised 'refine search'. A parcel
    ranked 40th by the county's ordering was not on the page, and no
    amount of refining could reach it — the search was already exact."""
    matches = [candidate(f"{1300 + n} 5TH ST", f"537-101-{n:02d}")
               for n in range(0, 76)]
    _, ranked = am.select(CORONADO, matches)
    assert len(ranked) == 76
    assert {m["apn"] for m in ranked} == {m["apn"] for m in matches}


def test_ranking_is_stable_for_equally_distant_candidates():
    """An order that shuffles between identical searches is an order the
    officer cannot learn to trust."""
    matches = [candidate(f"{1300 + n} 5TH ST", f"a{n}") for n in range(5)]
    first = [m["apn"] for m in am.select(CORONADO, matches)[1]]
    second = [m["apn"] for m in am.select(CORONADO, matches)[1]]
    assert first == second == [m["apn"] for m in matches]


# ══════════════════════════════════════════════════════════════════════
# 3. A blank field says why
# ══════════════════════════════════════════════════════════════════════

def test_a_parcel_with_no_owner_name_says_which_kind_of_nothing_that_is():
    assert am.owner_status(candidate("1358 5TH ST", "x", owner="")) == \
        am.OWNER_ABSENT_FROM_RECORD
    assert am.owner_status(candidate("1358 5TH ST", "x")) == am.OWNER_PRESENT
    reason = am.OWNER_REASONS[am.OWNER_ABSENT_FROM_RECORD]
    assert "county record" in reason
    assert "unavailable" not in reason.lower(), (
        "'unavailable' is the word that made three situations look like "
        "one — a record gap, an unmatched parcel and a dead service")


def test_no_confidence_score_is_exposed():
    """A number between 0 and 1 invites a threshold, and a threshold is
    where invented answers come from. The answer is a parcel or nothing."""
    src = code_only(BACKEND / "services" / "address_match.py")
    assert "confidence" not in src.lower()


# ══════════════════════════════════════════════════════════════════════
# 4. Through the endpoint
# ══════════════════════════════════════════════════════════════════════

@pytest.fixture(autouse=True)
def _auth_override():
    app.dependency_overrides[get_current_user_id] = lambda: "1"
    yield
    app.dependency_overrides.pop(get_current_user_id, None)


client = TestClient(app)


def multi(matches):
    return PropertySearchResult(
        status="multi_match",
        matches=[PropertyMatch(**{k: v for k, v in m.items()
                                  if k in PropertyMatch.model_fields})
                 for m in matches],
        message="Multiple properties found", match_count=len(matches))


def resolved(apn="537-101-02", address="1358 5TH ST"):
    return PropertySearchResult(
        status="success",
        data=PropertyData(address=address, city="Coronado", state="CA",
                          zip_code="92118", apn=apn, county="SAN DIEGO",
                          legal_description="LOT 2", owner_name="SMITH, JANE"),
        message="ok", match_count=1)


def search(matches, resolve=None):
    return patch.multiple(
        sitex_service,
        is_configured=lambda: True,
        search_property=AsyncMock(return_value=multi(matches)),
        search_by_fips_apn=AsyncMock(return_value=resolve or resolved()),
    )


def ask(street="1358 5th Street", city="Coronado", zip_code="92118"):
    return client.post("/api/property/search-v2", json={
        "address": street, "city": city, "state": "CA", "zip": zip_code})


def test_the_endpoint_returns_the_exact_parcel_and_keeps_the_alternatives():
    """END TO END: the officer's exact pick, 76 county candidates, one
    property back — with the other 75 still reachable."""
    # 76 neighbours on the same street, none of them 1358 — then the one
    # the officer actually chose, arriving last as it did in the field.
    matches = [candidate(f"{1400 + n} 5TH ST", f"537-101-{n:02d}")
               for n in range(0, 76)]
    matches.append(candidate("1358 5TH ST", "537-101-02"))

    with search(matches):
        body = ask().json()

    assert body["status"] == "success"
    assert body["data"]["apn"] == "537-101-02"
    assert body["selection"]["basis"] == "exact_address_match"
    assert body["selection"]["alternative_count"] == 76
    assert len(body["alternatives"]) == 76


def test_the_endpoint_hands_an_ambiguous_building_to_the_officer():
    matches = [candidate("1358 5TH ST", f"537-101-{n:02d}", unit=str(n))
               for n in range(1, 40)]
    with search(matches):
        body = ask().json()

    assert body["status"] == "multi_match"
    assert body["match_count"] == 39
    assert len(body["matches"]) == 39, "every candidate reaches the officer"
    assert body["selection"]["basis"] == "officer_choice"


def test_a_failed_resolve_falls_back_to_the_list_rather_than_to_a_guess():
    """The exact parcel would not load. That is not a reason to pick a
    different one, and not a reason to report nothing happened."""
    matches = [candidate("1358 5TH ST", "537-101-02"),
               candidate("1360 5TH ST", "537-101-03")]
    failed = PropertySearchResult(status="error", message="SiteX down",
                                  match_count=0)
    with search(matches, resolve=failed):
        body = ask().json()

    assert body["status"] == "multi_match"
    assert body["match_count"] == 2
    assert body["data"] is None


def test_every_candidate_carries_the_reason_its_owner_is_blank():
    matches = [candidate("1356 5TH ST", "537-101-01", owner=""),
               candidate("1360 5TH ST", "537-101-03")]
    with search(matches):
        body = ask().json()

    by_apn = {m["apn"]: m for m in body["matches"]}
    assert by_apn["537-101-01"]["owner_status"] == "absent_from_record"
    assert "county record" in by_apn["537-101-01"]["owner_reason"]
    assert by_apn["537-101-03"]["owner_status"] == "present"
    assert by_apn["537-101-03"]["owner_reason"] == ""


def test_a_single_county_match_says_nobody_chose_it():
    single = PropertySearchResult(
        status="success", data=resolved().data, message="ok", match_count=1)
    with patch.multiple(sitex_service, is_configured=lambda: True,
                        search_property=AsyncMock(return_value=single)):
        body = ask().json()
    assert body["selection"]["basis"] == "only_county_match"


def test_the_officers_own_pick_is_recorded_as_hers_to_own():
    """§13.2 — who asserted the answer. A parcel the server matched and a
    parcel a human clicked must not look the same in the record."""
    with patch.multiple(sitex_service, is_configured=lambda: True,
                        search_by_fips_apn=AsyncMock(return_value=resolved())):
        body = client.post("/api/property/resolve-match",
                           json={"fips": "06073", "apn": "537-101-02"}).json()
    assert body["selection"]["basis"] == "officer_choice"
