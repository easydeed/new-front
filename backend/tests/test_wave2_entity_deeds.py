"""FORMS wave 2 #6 — entity-grantor grant deeds, pinned.

TWO references implement the one owner-named form ("Corporation/
Partnership as Grantor"): PCT #22 (Deed-Corporation) and #29
(Deed-Partnership). Drift review: acknowledgment verified from both
references (§1189 body printed); the entity recitals are Flag-3
instrument-defining furniture (choosing the form IS declaring the
grantor's kind); state-of-organization / partnership-type are typed
officer facts (transcription class, blanks tolerated); the capacity
signature lines ("By/And", "General Partner") are furniture VERIFIED
from the references — corp signs bare By/And, partnership adds the
General Partner captions. No entity-type selection shapes legal content
within either form. Full deed chassis preserved: R&T §11932–11933 DTT
declaration and decision gate, officer vesting, mail-tax directives.
"""
import io

import pdfplumber
import pytest

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

DEED_META = {
    "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
    "return_to": {"name": "JOHN A. DOE", "address1": "1358 5TH ST",
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
    "grant-deed-corp": {
        "template": "grant_deed_corp_ca/index.jinja2",
        "title": "Corporation Grant Deed",
        "aff": {"entity_state": "Delaware"},
        "recital": "a corporation organized under the laws of the State of",
        "capacity_caption": None,
    },
    "grant-deed-partnership": {
        "template": "grant_deed_partnership_ca/index.jinja2",
        "title": "Partnership Grant Deed",
        "aff": {"entity_state": "California", "partnership_type": "general"},
        "recital": "partnership organized under the laws of the State of",
        "capacity_caption": "General Partner",
    },
}


def deed_row(deed_type, **overrides):
    row = {
        "id": 1,
        "deed_type": deed_type,
        "grantor_name": "ACME HOLDINGS, INC." if deed_type == "grant-deed-corp" else "DOE FAMILY PARTNERS",
        "grantee_name": "JOHN A. DOE AND JANE B. DOE",
        "vesting": "as joint tenants",
        "legal_description": "LOT 7, BLOCK B, TRACT 12345",
        "county": "Los Angeles",
        "apn": "4290-012-034",
        "property_address": "1358 5TH ST, Santa Monica, CA 90401",
        "requested_by": "Pacific Coast Escrow",
        "metadata": {**DEED_META, "affidavit": FORMS[deed_type]["aff"]},
    }
    row.update(overrides)
    return row


@pytest.fixture(params=sorted(FORMS))
def deed_type(request):
    return request.param


def test_title_and_entity_recital_furniture(deed_type):
    html = _normalized(render_deed_html(deed_row(deed_type)))
    assert FORMS[deed_type]["title"] in html
    assert "For valuable consideration, receipt of which is hereby acknowledged," in html
    assert FORMS[deed_type]["recital"] in html
    assert "hereby GRANTS to" in html
    assert "State of California, more particularly" in html


def test_officer_facts_render(deed_type):
    html = _normalized(render_deed_html(deed_row(deed_type)))
    grantor = "ACME HOLDINGS, INC." if deed_type == "grant-deed-corp" else "DOE FAMILY PARTNERS"
    for fact in (grantor, "JOHN A. DOE AND JANE B. DOE", "as joint tenants",
                 "LOT 7, BLOCK B, TRACT 12345", "4290-012-034"):
        assert fact in html, fact
    # Entity facts (typed transcription):
    for v in FORMS[deed_type]["aff"].values():
        assert v in html, v


def test_missing_entity_facts_tolerated_as_blanks(deed_type):
    """Gate-strictness ruling: the reference tolerates a blank state /
    partnership-type line; nothing is invented."""
    html = render_deed_html(deed_row(deed_type, metadata=dict(DEED_META)))
    assert "Delaware" not in html
    assert "____" in html  # the reference's blank lines


def test_capacity_signature_furniture(deed_type):
    """Verified from the references: the entity is NAMED; the signature
    lines carry By/And capacity furniture — blank for the officers'/
    partners' hands. Partnership adds the General Partner captions;
    the corporation reference signs bare By/And."""
    html = _normalized(render_deed_html(deed_row(deed_type)))
    assert ">By" in html.replace(" ", "").replace("\n", "") or "By<" in html or ">By<" in html.replace(" ", "")
    assert "And" in html
    # Count in the execution region only — the template's doc comment
    # also names the caption (the stripComments lesson, template edition).
    execution = html[html.index("Dated:"):]
    caption = FORMS[deed_type]["capacity_caption"]
    if caption:
        assert execution.count(caption) == 2   # once per signature line
    else:
        assert "General Partner" not in execution


def test_full_dtt_declaration_preserved(deed_type):
    """Entity variants ARE conveyances: the complete DTT declaration and
    the officer's recorded decision render exactly as on the grant deed."""
    html = _normalized(render_deed_html(deed_row(deed_type)))
    assert "THE UNDERSIGNED GRANTOR(S) DECLARE(S):" in html
    assert "DOCUMENTARY TRANSFER TAX IS" in html
    assert "550.00" in html
    assert "Mail Tax Statements" in html


def test_acknowledgment_not_jurat(deed_type):
    html = _normalized(render_deed_html(deed_row(deed_type)))
    assert "personally appeared" in html
    assert "acknowledged to me" in html
    assert "Subscribed and sworn to (or affirmed) before me" not in html
    assert html.count("verifies only the identity") == 1
    ack = html[html.index("personally appeared"):]
    assert "ACME HOLDINGS" not in ack
    assert "DOE FAMILY PARTNERS" not in ack


def test_chassis_geometry_and_no_chrome(deed_type):
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
        assert caption_top > 100
        assert x_of("RECORDER’S") > 300
        assert title_top > caption_top

    html = render_deed_html(deed_row(deed_type))
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_registered_in_the_type_and_family_maps(deed_type):
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    from services.form_families import family_of
    assert TEMPLATE_BY_DEED_TYPE[deed_type] == FORMS[deed_type]["template"]
    assert family_of(deed_type) == "deed"
