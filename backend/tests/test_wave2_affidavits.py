"""FORMS wave 2 — domestic-partner affidavit variants (#2, #3), pinned.

Built against Pacific Coast Title blank forms #5 (Aff_Death-JT-DomPart)
and #2 (Aff_Death-CP_Rt_Surv-DomPart). Drift review, per the wave-2
mandate: JURAT VERIFIED FROM BOTH REFERENCES ("Subscribed and sworn"),
not from the family label; the Fam C §297 registered-domestic-partnership
recital is instrument-defining furniture — Flag-3 precedent, same class
as the wave-1 CP-spouse clause 2; every other element maps onto wave-1
officer-fact classes (death particulars, deed reference, tolerated
blanks). No uncovered element; no new AffidavitFacts keys.
"""
import io

import pdfplumber
import pytest

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

BASE_AFF = {
    "affiant_name": "JAMES C. ROE",
    "decedent_name": "JOHN A. DOE",
    "death_date": "March 3, 2026",
    "death_place": "Los Angeles, California",
    "deed_date": "June 1, 2015",
    "deed_grantor": "ROBERT SELLER",
    "recording_date": "June 15, 2015",
    "instrument_no": "2015-0654321",
}

FORMS = {
    "affidavit-death-jt-dp": {
        "template": "affidavit_death_jt_dp_ca/index.jinja2",
        "aff": {**BASE_AFF, "jt_deed_grantees": "JOHN A. DOE AND JAMES C. ROE"},
        "furniture": (
            "Affidavit &mdash; Death of Joint Tenant",
            "By Surviving Domestic Partner",
            "of legal age, being first duly sworn, deposes and says",
            "is the decedent mentioned in the attached certified copy of Certificate of Death",
            # The §297 recital — statutory string, verbatim:
            "registered domestic partnership under California Family Code Section 297",
            "as joint tenants, recorded on",
            "Official Records of",
            "Attach Certified Copy of Death Certificate",
        ),
        "facts": ("JAMES C. ROE", "JOHN A. DOE", "March 3, 2026",
                  "Los Angeles, California", "June 1, 2015", "ROBERT SELLER",
                  "JOHN A. DOE AND JAMES C. ROE", "June 15, 2015",
                  "2015-0654321", "LOT 7, BLOCK B, TRACT 12345"),
    },
    "affidavit-death-cp-dp": {
        "template": "affidavit_death_cp_dp_ca/index.jinja2",
        "aff": dict(BASE_AFF),
        "furniture": (
            "Affidavit of Death",
            "Community Property with Right of Survivorship",
            "Domestic Partner",
            "of legal age, being first duly sworn, deposes and says",
            "registered domestic partnership under California Family Code Section 297",
            "in favor of the grantees as community property with right of survivorship",
            "Official Records of",
            "Attach Certified Copy of Death Certificate",
        ),
        "facts": ("JAMES C. ROE", "JOHN A. DOE", "March 3, 2026",
                  "Los Angeles, California", "June 1, 2015", "ROBERT SELLER",
                  "June 15, 2015", "2015-0654321", "LOT 7, BLOCK B, TRACT 12345"),
    },
}


def aff_row(deed_type, **overrides):
    row = {
        "id": 1,
        "deed_type": deed_type,
        "grantor_name": "JOHN A. DOE",   # display alias: decedent
        "grantee_name": "JAMES C. ROE",  # display alias: affiant
        "legal_description": "LOT 7, BLOCK B, TRACT 12345",
        "county": "Los Angeles",
        "apn": "4290-012-034",
        "property_address": "1358 5TH ST, Santa Monica, CA 90401",
        "requested_by": "Pacific Coast Escrow",
        "metadata": {
            "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
            "return_to": {"name": "JAMES C. ROE", "address1": "1358 5TH ST",
                          "city": "Santa Monica", "state": "CA", "zip": "90401"},
            "affidavit": FORMS[deed_type]["aff"],
        },
    }
    row.update(overrides)
    return row


@pytest.fixture(params=sorted(FORMS))
def deed_type(request):
    return request.param


def test_sworn_recital_furniture_present(deed_type):
    html = _normalized(render_deed_html(aff_row(deed_type)))
    for needle in FORMS[deed_type]["furniture"]:
        assert needle in html, needle


def test_officer_facts_render(deed_type):
    html = _normalized(render_deed_html(aff_row(deed_type)))
    for fact in FORMS[deed_type]["facts"]:
        assert fact in html, fact


def test_missing_facts_render_as_blank_lines_never_invented(deed_type):
    html = render_deed_html(aff_row(deed_type, metadata={}))
    assert "fact-line" in html
    assert "2015-0654321" not in html
    assert "March 3, 2026" not in html


def test_jurat_not_acknowledgment(deed_type):
    """Certificate verified from the REFERENCE (drift check 1): both
    blanks print the §8202 jurat body — exactly one, never the §1189
    acknowledgment."""
    html = _normalized(render_deed_html(aff_row(deed_type)))
    assert html.count("Subscribed and sworn to (or affirmed) before me") == 1
    assert "personally appeared" not in html
    assert "acknowledged to me" not in html
    assert html.count("verifies only the identity") == 1


def test_jurat_contents_are_blank_ticket_n_pattern(deed_type):
    html = _normalized(render_deed_html(aff_row(deed_type)))
    jurat = html[html.index("Subscribed and sworn"):]
    assert "JAMES C. ROE" not in jurat
    assert "JOHN A. DOE" not in jurat
    venue = html[html.index("COUNTY OF"):html.index("Subscribed and sworn")]
    assert "Los Angeles" in venue


def test_no_dtt_and_no_mail_tax(deed_type):
    html = _normalized(render_deed_html(aff_row(deed_type)))
    assert "DOCUMENTARY TRANSFER TAX" not in html.upper()
    assert "Mail Tax Statements" not in html
    assert "And When Recorded Mail To" in html


def test_chassis_geometry_and_no_chrome(deed_type):
    """References: one page, caption ~192pt, jurat lower half."""
    pdf = render_deed_pdf(aff_row(deed_type))
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
        title_top = top_of("AFFIDAVIT")
        jurat_top = top_of("Subscribed")
        assert caption_top > 100
        assert x_of("RECORDER’S") > 300
        assert title_top > caption_top
        assert jurat_top > page.height / 2

    html = render_deed_html(aff_row(deed_type))
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_registered_in_the_type_and_family_maps(deed_type):
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    from services.form_families import family_of
    assert TEMPLATE_BY_DEED_TYPE[deed_type] == FORMS[deed_type]["template"]
    assert family_of(deed_type) == "affidavit"
