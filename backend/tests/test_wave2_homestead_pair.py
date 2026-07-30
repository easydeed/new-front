"""FORMS wave 2 — homestead pair (#4 Spouses, #5 Abandonment), pinned.

Built against Pacific Coast Title blank forms #34 (Homestead_Dec-Spouses)
and #32 (Homestead-Abandon). Drift review: ACKNOWLEDGMENT VERIFIED FROM
BOTH REFERENCES (§1189 body printed on each blank) — matching the
corrected family facts, never the memo. Precedent diff: "We are husband
and wife" → Flag-3 instrument-defining recital (CP-spouse class); the
operative "hereby abandon(s)" → the TOD-revocation operative-statement
class; the prior declaration's identification → the recorded-instrument
class; two declared owners → a parties-JSONB shape (the migration's
design), not a new class. No uncovered element.
"""
import io

import pdfplumber
import pytest

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

FORMS = {
    "homestead-declaration-spouses": {
        "template": "homestead_declaration_spouses_ca/index.jinja2",
        "parties": {"declarant": "ROBERT OWNER", "second_declarant": "MARIA OWNER"},
        "meta": {
            "return_to": {"name": "ROBERT OWNER", "address1": "1358 5TH ST",
                          "city": "Santa Monica", "state": "CA", "zip": "90401"},
        },
        "furniture": (
            "Declaration of Homestead",
            "(Spouses as Declared Owners)",
            "hereby certify and declare as follows:",
            "We are husband and wife.",
            "We hereby claim as a declared homestead the premises described as follows:",
            "We are the owners of the above described homestead.",
            "our principal dwelling and we currently reside thereon",
            "known to be true as of our personal knowledge",
        ),
        "facts": ("ROBERT OWNER", "MARIA OWNER", "LOT 7, BLOCK B, TRACT 12345"),
    },
    "homestead-abandonment": {
        "template": "homestead_abandonment_ca/index.jinja2",
        "parties": {"declarant": "ROBERT OWNER"},
        "meta": {
            "title_order_no": "TO-9921",
            "escrow_no": "ESC-4410",
            "return_to": {"name": "ROBERT OWNER", "address1": "1358 5TH ST",
                          "city": "Santa Monica", "state": "CA", "zip": "90401"},
            "affidavit": {
                "prior_declarant": "ROBERT OWNER",
                "declaration_date": "June 1, 2015",
                "recording_date": "June 15, 2015",
                "instrument_no": "2015-0654321",
            },
        },
        "furniture": (
            "Declaration of Abandonment of Declared Homestead",
            "hereby abandon(s) the homestead",
            "previously declared in the Homestead Declaration executed by",
            "in the Official Records of the County Recorder of",
            "pertaining to the following real property:",
            "and commonly known as (Street address)",
        ),
        "facts": ("ROBERT OWNER", "June 1, 2015", "June 15, 2015",
                  "2015-0654321", "LOT 7, BLOCK B, TRACT 12345",
                  "1358 5TH ST, Santa Monica, CA 90401", "TO-9921", "ESC-4410"),
    },
}


def row(deed_type, **overrides):
    r = {
        "id": 1,
        "deed_type": deed_type,
        "grantor_name": "",
        "grantee_name": "",
        "parties": FORMS[deed_type]["parties"],
        "legal_description": "LOT 7, BLOCK B, TRACT 12345",
        "county": "Los Angeles",
        "apn": "4290-012-034",
        "property_address": "1358 5TH ST, Santa Monica, CA 90401",
        "requested_by": "Pacific Coast Escrow",
        "metadata": FORMS[deed_type]["meta"],
    }
    r.update(overrides)
    return r


@pytest.fixture(params=sorted(FORMS))
def deed_type(request):
    return request.param


def test_declaration_furniture_present(deed_type):
    html = _normalized(render_deed_html(row(deed_type)))
    for needle in FORMS[deed_type]["furniture"]:
        assert needle in html, needle


def test_officer_facts_render(deed_type):
    html = _normalized(render_deed_html(row(deed_type)))
    for fact in FORMS[deed_type]["facts"]:
        assert fact in html, fact


def test_missing_facts_render_blank_never_invented(deed_type):
    html = render_deed_html(row(deed_type, parties=None, metadata={}))
    assert "fact-line" in html
    assert "ROBERT OWNER" not in html
    assert "MARIA OWNER" not in html


def test_acknowledgment_not_jurat(deed_type):
    """Certificate verified from the REFERENCE (drift check 1): both
    blanks print the §1189 acknowledgment — never a jurat."""
    html = _normalized(render_deed_html(row(deed_type)))
    assert "personally appeared" in html
    assert "acknowledged to me" in html
    assert "Subscribed and sworn to (or affirmed) before me" not in html
    assert html.count("verifies only the identity") == 1


def test_acknowledgment_contents_are_blank(deed_type):
    html = _normalized(render_deed_html(row(deed_type)))
    ack = html[html.index("personally appeared"):]
    assert "ROBERT OWNER" not in ack
    assert "MARIA OWNER" not in ack


def test_no_dtt_no_mail_tax_no_vesting(deed_type):
    html = _normalized(render_deed_html(row(deed_type, vesting="SENTINEL VESTING TEXT")))
    assert "DOCUMENTARY TRANSFER TAX" not in html.upper()
    assert "Mail Tax Statements" not in html
    assert "And When Recorded Mail To" in html
    assert "SENTINEL VESTING TEXT" not in html


def test_one_page_with_inline_acknowledgment(deed_type):
    """Both references are ONE page with the certificate in the lower
    half (the ack_inline partial mode from wave 1 #5)."""
    pdf = render_deed_pdf(row(deed_type))
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        assert len(doc.pages) == 1
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
        title_top = top_of("DECLARATION")
        ack_top = top_of("personally")
        assert caption_top > 100
        assert x_of("RECORDER’S") > 300
        assert title_top > caption_top
        assert ack_top > page.height / 2

    html = render_deed_html(row(deed_type))
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_registered_in_the_type_and_family_maps(deed_type):
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    from services.form_families import family_of, is_single_party, requires_legal_description
    assert TEMPLATE_BY_DEED_TYPE[deed_type] == FORMS[deed_type]["template"]
    assert family_of(deed_type) == "declaration"
    assert is_single_party(deed_type)          # parties-JSONB family
    assert requires_legal_description(deed_type)  # both parcel-tied
