"""ENGINE2 — the homepage's 422 is pinned to the behaviour it advertises.

═══ WHY THIS FILE EXISTS, AND WHY IT IS IN THE BACKEND SUITE ═══

The rebuilt homepage puts a sample request on the platform door: a
fixed-vesting instrument plus `grantee.vesting`, answered with
`422 VALIDATION_ERROR`. It is the strongest thing on the page because it
DEMONSTRATES the instrument doctrine rather than asserting it.

That makes it a claim about API BEHAVIOUR printed on a marketing page,
and the frontend cannot see the behaviour. `engine2Homepage.test.ts`
pins that the sample derives its instrument from the catalog — so the
page cannot name the wrong instrument — but if the validator were
deleted, the catalog would still say `fixed_vesting=True`, the page
would still render a 422 sample, and every frontend pin would stay
green while the API accepted the request.

**A marketing claim about a refusal has to be pinned at the refusal.**
Same arrangement `apiDocsMirror.test.ts` has with the catalog and the
DTT rate mirror has with `dttCalc.ts`: the surface and the source are
checked against one corpus, from the side that can actually observe it.
"""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from schemas.api_v1.deeds import CreateDeedRequest
from services.api_catalog import TYPE_REQUIREMENTS


def _body(deed_type: str, vesting: str | None = None, entity: dict | None = None) -> dict:
    """A COMPLETE request, and that is the point of the helper.

    The first draft of this probe omitted `transfer_tax` and `recording`.
    Every case then failed with "Field required" — including the ones
    that should have PASSED — and the output read like confirmation that
    the rule works. A fixture too incomplete to be accepted cannot
    distinguish a refusal from a rule, and it fails in the direction
    that looks like success (§14.2: a control is checked before its
    result is believed).
    """
    body = {
        "deed_type": deed_type,
        "property": {
            "address": "123 Main St", "city": "Los Angeles", "state": "CA",
            "zip": "90012", "county": "Los Angeles", "apn": "5432-001-042",
            "legal_description": "LOT 42, TRACT NO. 12345",
        },
        "grantor": {"name": "JOHN A. SMITH"},
        "grantee": {"name": "MICHAEL C. JOHNSON"},
        "transfer_tax": {"exempt": True},
        "recording": {
            "requested_by": "Pacific Coast Escrow",
            "return_to": {"name": "Dana Reyes", "address": "1 Elm St",
                          "city": "Glendora", "state": "CA", "zip": "91750"},
        },
        "approver": {"name": "Dana Reyes", "role": "Escrow Officer"},
    }
    if vesting is not None:
        body["grantee"]["vesting"] = vesting
    if entity is not None:
        body["grantor"]["entity"] = entity
    return body


FIXED_VESTING_SLUGS = sorted(
    slug for slug, rules in TYPE_REQUIREMENTS.items() if rules.fixed_vesting
)


def test_the_homepage_sample_has_an_instrument_to_point_at():
    """The page derives its sample from the catalog. If no instrument
    fixed its vesting, the derivation would fall back to the first entry
    and the sample would advertise a refusal that never happens."""
    assert FIXED_VESTING_SLUGS, (
        "no fixed-vesting instrument in the catalog — the homepage's 422 "
        "sample has nothing true to render")


@pytest.mark.parametrize("slug", FIXED_VESTING_SLUGS)
def test_supplying_vesting_to_a_fixed_vesting_instrument_is_refused(slug):
    """THE CLAIM ON THE PAGE. Parametrised over the catalog rather than
    written against `grant_deed_jt`, so a new fixed-vesting instrument is
    covered the day it is added — the homepage's sample could pick it."""
    with pytest.raises(ValidationError) as exc:
        CreateDeedRequest(**_body(slug, vesting="a single man"))
    assert "fixes its own vesting" in str(exc.value)


@pytest.mark.parametrize("slug", FIXED_VESTING_SLUGS)
def test_the_same_request_without_vesting_is_ACCEPTED(slug):
    """THE DISCRIMINATING HALF, and without it the test above is worth
    nothing.

    A rejection only demonstrates the rule if the otherwise-identical
    request passes. Otherwise the 422 could be coming from anything —
    which is exactly what happened while this file was being written,
    when an incomplete fixture rejected all five probe cases for a
    missing field and the result read as proof.
    """
    CreateDeedRequest(**_body(slug))


def test_the_refusal_is_specific_rather_than_a_blanket_rule():
    """An instrument that REQUIRES vesting must still accept it, or the
    page's story ("a wrong deed fails in your tests") would be a
    description of an API that refuses everything."""
    CreateDeedRequest(**_body("grant_deed", vesting="a single man"))

    with pytest.raises(ValidationError) as exc:
        CreateDeedRequest(**_body("grant_deed"))
    assert "vesting is required" in str(exc.value)


def test_the_catalog_the_page_reads_still_matches_what_the_validator_enforces():
    """The homepage renders its instrument table from `API_DEED_TYPES`
    (the TS mirror). `apiDocsMirror.test.ts` pins the mirror against this
    catalog; this pins the catalog against the VALIDATOR, so the chain
    from the printed table to the enforced rule has no unpinned link.
    """
    for slug, rules in TYPE_REQUIREMENTS.items():
        if rules.fixed_vesting:
            with pytest.raises(ValidationError):
                CreateDeedRequest(**_body(slug, vesting="a single man"))
        elif rules.requires_vesting and not rules.required_entity_facts:
            with pytest.raises(ValidationError):
                CreateDeedRequest(**_body(slug))
