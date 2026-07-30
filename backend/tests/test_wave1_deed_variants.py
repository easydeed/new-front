"""FORMS wave 1 — fixed-vesting deed variants, pinned.

Forms #3 and #4 of the owner-ranked wave, built against Pacific Coast
Title blank forms #28 (Deed-JointTenancy) and #21 (Deed-CPSurvivorship).

The doctrine line these pins hold: the vesting phrase is printed on the
instrument's face as FURNITURE — choosing the form IS the officer's
vesting decision (Flag-3 precedent). The templates therefore never read
the stored vesting value (a stray value must not contradict the face of
the instrument), while EVERY other deed-chassis behavior — including the
full documentary-transfer-tax declaration — is preserved: these ARE
conveyances, unlike the affidavit family.
"""
import io

import pdfplumber
import pytest

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

DEED_META = {
    "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
    "return_to": {"name": "JOHN A. DOE AND JANE B. DOE", "address1": "1358 5TH ST",
                  "city": "Santa Monica", "state": "CA", "zip": "90401"},
    "dtt": {
        "transfer_value": "500000",
        "calculated_amount": "550.00",
        "basis": "full_value",
        "area_type": "city",
        "city_name": "Santa Monica",
        "is_exempt": False,
        "exemption_reason": "",
    },
}

FORMS = {
    "grant-deed-jt": {
        "template": "grant_deed_jt_ca/index.jinja2",
        "title": "Joint Tenancy Grant Deed",
        "vesting_furniture": "as JOINT TENANTS the real property situated in the County of",
    },
    "grant-deed-cp-ros": {
        "template": "grant_deed_cp_ros_ca/index.jinja2",
        "title": "Community Property with Right of Survivorship",
        "vesting_furniture": "as COMMUNITY PROPERTY WITH RIGHT OF SURVIVORSHIP the real property situated in the County of",
    },
}


def deed_row(deed_type, **overrides):
    row = {
        "id": 1,
        "deed_type": deed_type,
        "grantor_name": "ROBERT SELLER",
        "grantee_name": "JOHN A. DOE AND JANE B. DOE",
        "legal_description": "LOT 7, BLOCK B, TRACT 12345",
        "county": "Los Angeles",
        "apn": "4290-012-034",
        "property_address": "1358 5TH ST, Santa Monica, CA 90401",
        "requested_by": "Pacific Coast Escrow",
        # Deliberately poisoned: the fixed-vesting templates must NEVER
        # read this column (see test_stored_vesting_is_never_read).
        "vesting": "SENTINEL VESTING TEXT",
        "metadata": DEED_META,
    }
    row.update(overrides)
    return row


@pytest.fixture(params=sorted(FORMS))
def deed_type(request):
    return request.param


def test_title_and_granting_furniture(deed_type):
    html = _normalized(render_deed_html(deed_row(deed_type)))
    assert FORMS[deed_type]["title"] in html
    assert "For valuable consideration, receipt of which is hereby acknowledged," in html
    assert "hereby GRANT(S) to" in html
    assert FORMS[deed_type]["vesting_furniture"] in html
    assert "State of California, more particularly described as follows:" in html


def test_officer_facts_render(deed_type):
    html = _normalized(render_deed_html(deed_row(deed_type)))
    for fact in ("ROBERT SELLER", "JOHN A. DOE AND JANE B. DOE", "Los Angeles",
                 "4290-012-034", "LOT 7, BLOCK B, TRACT 12345",
                 "Pacific Coast Escrow"):
        assert fact in html, fact


def test_stored_vesting_is_never_read(deed_type):
    """THE structural pin for the furniture ruling: even a poisoned stored
    vesting value cannot reach the instrument — the printed phrase is the
    only vesting on the face of the deed."""
    html = render_deed_html(deed_row(deed_type))
    assert "SENTINEL VESTING TEXT" not in html


def test_full_dtt_declaration_present(deed_type):
    """These ARE conveyances: the complete R&T §11932–11933 declaration
    renders — lead-in, amount, basis checklines, area checklines — exactly
    as on the standard grant deed. (Unlike the affidavit family.)"""
    html = _normalized(render_deed_html(deed_row(deed_type)))
    assert "THE UNDERSIGNED GRANTOR(S) DECLARE(S):" in html
    assert "DOCUMENTARY TRANSFER TAX IS" in html
    assert "Computed on full value of property conveyed, or" in html
    assert "Computed on full value less liens and encumbrances remaining at time of sale." in html
    assert "Unincorporated area" in html
    assert "550.00" in html          # the officer's recorded DTT decision
    assert "Santa Monica" in html    # city checkline value
    assert "Mail Tax Statements" in html


def test_dtt_never_prefilled_without_officer_data(deed_type):
    """No DTT metadata → blank declaration: no amount, no checked lines
    (suggest→confirm→record; the blank reference tolerates blanks)."""
    html = _normalized(render_deed_html(deed_row(deed_type, metadata={})))
    assert "DOCUMENTARY TRANSFER TAX IS" in html
    assert "550.00" not in html
    assert ">X<" not in html.replace(" ", "")


def test_acknowledgment_not_jurat(deed_type):
    """The doctrine canary, deed-family direction: acknowledged instruments
    carry the §1189 certificate — never a jurat."""
    html = _normalized(render_deed_html(deed_row(deed_type)))
    assert "personally appeared" in html
    assert "acknowledged to me" in html
    assert "Subscribed and sworn to (or affirmed) before me" not in html
    assert html.count("verifies only the identity") == 1


def test_acknowledgment_contents_are_blank(deed_type):
    """Blank-contents doctrine: the notary's entries never pre-fill; only
    the venue county renders."""
    html = _normalized(render_deed_html(deed_row(deed_type)))
    ack = html[html.index("personally appeared"):]
    assert "ROBERT SELLER" not in ack


def test_chassis_geometry_and_no_chrome(deed_type):
    """G2/G3 discipline: recorder space open, caption at the boundary,
    title below it, acknowledgment present, no chrome."""
    pdf = render_deed_pdf(deed_row(deed_type))
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        assert len(doc.pages) <= 2   # page one + acknowledgment page
        page = doc.pages[0]
        words = page.extract_words()

        def top_of(needle):
            hits = [w for w in words if needle.upper() in w["text"].upper()]
            assert hits, needle
            return hits[0]["top"]

        def x_of(needle):
            hits = [w for w in words if needle.upper() in w["text"].upper()]
            return hits[0]["x0"]

        caption_top = top_of("RECORDER’S")
        title_top = top_of("GRANT")
        assert caption_top > 100          # a real open recorder space above it
        assert x_of("RECORDER’S") > 300   # caption sits right of center
        assert title_top > caption_top    # title below the boundary

    html = render_deed_html(deed_row(deed_type))
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_registered_in_the_type_map(deed_type):
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    assert TEMPLATE_BY_DEED_TYPE[deed_type] == FORMS[deed_type]["template"]
