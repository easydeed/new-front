"""Doctrine sweep: the partner API's deeds render on the shared chassis.

The old POST /api/v1/deeds built its PDF from an inline f-string template —
no recorder's space, no DTT declaration, no acknowledgment, and the
Document ID / verify URL printed on the instrument itself. These tests pin
the fix: the API's request maps onto the same row shape the stored-PDF
pipeline renders, so every chassis invariant (geometry, statutory
furniture, no chrome) applies to partner-generated deeds automatically.
"""
import re

from routers.api_v1.router import build_render_row
from schemas.api_v1.deeds import (
    CreateDeedRequest, DeedType, EntityModel, PropertyModel, GrantorModel,
    GranteeModel, TransferTaxModel, RecordingModel, ReturnToModel, TaxBasis,
)
from services.deed_pdf import TEMPLATE_BY_DEED_TYPE, render_deed_html


def _request(deed_type=DeedType.GRANT_DEED, **tt_overrides):
    """A2: the sample is now type-aware. A fixed-vesting instrument
    REFUSES a supplied vesting (its title is the vesting decision) and an
    entity deed REQUIRES its organizing-state recital, so one fixed
    payload can no longer stand in for every type — which is the point of
    the per-type rules."""
    from services.api_catalog import rules_for

    tt = dict(exempt=False, exempt_code=None, value=500000.0,
              computed_amount="550.00", basis=TaxBasis.FULL_VALUE,
              city_tax=True, city_name="Los Angeles")
    tt.update(tt_overrides)

    rules = rules_for(deed_type.value)
    grantee = GranteeModel(
        name="ROBERT C. ROE",
        vesting=None if rules.fixed_vesting else "a single man",
    )
    entity = None
    if rules.required_entity_facts:
        entity = EntityModel(
            entity_state="California" if "entity_state" in rules.required_entity_facts else None,
            partnership_type="general partnership" if "partnership_type" in rules.required_entity_facts else None,
        )

    return CreateDeedRequest(
        deed_type=deed_type,
        property=PropertyModel(
            address="1234 Maple Ave", city="Los Angeles", state="CA",
            zip="90001", county="Los Angeles", apn="1234-567-890",
            legal_description="LOT 15, BLOCK 3, TRACT 12345",
        ),
        grantor=GrantorModel(name="JOHN A. DOE", entity=entity),
        grantee=grantee,
        transfer_tax=TransferTaxModel(**tt),
        recording=RecordingModel(
            requested_by="Pacific Coast Escrow",
            return_to=ReturnToModel(name="ROBERT C. ROE", address="1 Main St",
                                    city="Los Angeles", state="CA", zip="90001"),
            title_order_no="TO-1", escrow_no="ESC-2",
        ),
    )


def _normalized(html):
    return re.sub(r"\s+", " ", html)


def test_every_api_deed_type_maps_to_a_chassis_template():
    for dt in DeedType:
        row = build_render_row(_request(deed_type=dt))
        assert row["deed_type"] in TEMPLATE_BY_DEED_TYPE, dt


def test_api_render_carries_chassis_furniture_and_no_chrome():
    html = _normalized(render_deed_html(build_render_row(_request())))
    assert "Space Above This Line Is For Recorder" in html
    assert "THE UNDERSIGNED GRANTOR(S) DECLARE(S):" in html
    assert "Mail Tax Statements As Directed Above" in html
    assert "personally appeared" in html  # acknowledgment page present
    # No chrome / no verification artifacts on the instrument:
    assert "Document ID" not in html
    assert "deedpro.com/verify" not in html
    assert "recording-box" not in html
    assert "7C4DFF" not in html


def test_api_render_maps_values_onto_the_deed():
    html = _normalized(render_deed_html(build_render_row(_request())))
    assert "JOHN A. DOE" in html
    assert "ROBERT C. ROE" in html
    assert "$550.00" in html
    assert "Los Angeles" in html
    assert "a single man" in html


def test_api_exempt_transfer_renders_exemption():
    req = _request(exempt=True, exempt_code="R&T 11927", computed_amount=None,
                   city_tax=False, city_name=None, basis=None)
    html = _normalized(render_deed_html(build_render_row(req)))
    assert "R&amp;T 11927" in html or "R&T 11927" in html
