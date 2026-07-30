"""FORMS wave 1 — affidavit siblings, pinned.

Forms #1 and #2 of the owner-ranked wave, built against Pacific Coast
Title blank forms #3 (Aff_Death-CP_Rt_Surv) and #7 (Aff_Death-Trustee) as
the reference implementations. Same doctrine as the spike: affidavits are
SWORN statements — the notarial certificate is a JURAT (Gov C §8202),
never an acknowledgment (CC §1189); no DTT (not conveyances); missing
facts render as the reference's blank lines, never invented.
"""
import io

import pdfplumber
import pytest

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

CP_SPOUSE_META = {
    "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
    "return_to": {"name": "JANE B. DOE", "address1": "1358 5TH ST",
                  "city": "Santa Monica", "state": "CA", "zip": "90401"},
    "affidavit": {
        "affiant_name": "JANE B. DOE",
        "decedent_name": "JOHN A. DOE",
        "death_date": "March 3, 2026",
        "death_place": "Los Angeles, California",
        "deed_date": "June 1, 2015",
        "deed_grantor": "ROBERT SELLER",
        "recording_date": "June 15, 2015",
        "instrument_no": "2015-0654321",
    },
}

TRUSTEE_META = {
    "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
    "return_to": {"name": "JANE B. DOE", "address1": "1358 5TH ST",
                  "city": "Santa Monica", "state": "CA", "zip": "90401"},
    "affidavit": {
        "affiant_name": "JANE B. DOE",
        "decedent_name": "JOHN A. DOE",
        "trust_date": "January 10, 2010",
        "trustors": "JOHN A. DOE AND JANE B. DOE",
        "recording_date": "June 15, 2015",
        "instrument_no": "2015-0654321",
    },
}

FORMS = {
    "affidavit-death-cp-spouse": {
        "meta": CP_SPOUSE_META,
        "template": "affidavit_death_cp_spouse_ca/index.jinja2",
        # Instrument-defining recitals (Flag-3 precedent: furniture).
        "furniture": (
            "Affidavit of Death",
            "Community Property with Right of Survivorship",
            "of legal age, being first duly sworn, deposes and says",
            "is the decedent mentioned in the attached certified copy of Certificate of Death",
            "I am the surviving spouse of Decedent and was married to Decedent on the date of death",
            "in favor of the grantees as community property with right of survivorship",
            "Official Records of",
            "Attach Certified Copy of Death Certificate",
        ),
        "facts": ("JANE B. DOE", "JOHN A. DOE", "March 3, 2026",
                  "Los Angeles, California", "June 1, 2015", "ROBERT SELLER",
                  "June 15, 2015", "2015-0654321", "LOT 7, BLOCK B, TRACT 12345"),
    },
    "affidavit-death-trustee": {
        "meta": TRUSTEE_META,
        "template": "affidavit_death_trustee_ca/index.jinja2",
        "furniture": (
            "Affidavit &mdash; Death of Trustee",
            "of legal age, being first duly sworn, deposes and says",
            "is the decedent mentioned in the attached certified copy of Certificate of Death",
            "named as Trustee in that certain Declaration of Trust",
            "as trustor(s)",
            "decedent was the owner, as Trustee",
            "I am the surviving or successor Trustee of the same trust",
            "designated and empowered pursuant to the terms of said trust",
            "Official Records of",
            "Attach Certified Copy of Death Certificate",
        ),
        "facts": ("JANE B. DOE", "JOHN A. DOE", "January 10, 2010",
                  "JOHN A. DOE AND JANE B. DOE", "June 15, 2015",
                  "2015-0654321", "LOT 7, BLOCK B, TRACT 12345"),
    },
}


def aff_row(deed_type, **overrides):
    row = {
        "id": 1,
        "deed_type": deed_type,
        "grantor_name": "JOHN A. DOE",   # display alias: decedent
        "grantee_name": "JANE B. DOE",   # display alias: affiant
        "legal_description": "LOT 7, BLOCK B, TRACT 12345",
        "county": "Los Angeles",
        "apn": "4290-012-034",
        "property_address": "1358 5TH ST, Santa Monica, CA 90401",
        "requested_by": "Pacific Coast Escrow",
        "metadata": FORMS[deed_type]["meta"],
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
    assert "fact-line" in html          # the reference's blank lines
    assert "2015-0654321" not in html
    assert "March 3, 2026" not in html
    assert "January 10, 2010" not in html


def test_jurat_not_acknowledgment(deed_type):
    """THE doctrine canary, per sibling: exactly one notarial certificate,
    and it is a jurat — never the §1189 acknowledgment body."""
    html = _normalized(render_deed_html(aff_row(deed_type)))
    assert html.count("Subscribed and sworn to (or affirmed) before me") == 1
    assert "personally appeared" not in html
    assert "acknowledged to me" not in html
    assert "All-Purpose Acknowledgment" not in html
    # §8202(b) disclaimer box present, once.
    assert html.count("verifies only the identity") == 1


def test_jurat_contents_are_blank_ticket_n_pattern(deed_type):
    """Blank-contents doctrine: no affiant or notary entry pre-fills — the
    date, affiant name, and notary signature are the notary's. Only the
    venue county renders."""
    html = _normalized(render_deed_html(aff_row(deed_type)))
    jurat = html[html.index("Subscribed and sworn"):]
    assert "JANE B. DOE" not in jurat        # affiant not pre-filled in the cert
    assert "JOHN A. DOE" not in jurat
    # Venue county pre-fills (data the officer supplied):
    venue = html[html.index("COUNTY OF"):html.index("Subscribed and sworn")]
    assert "Los Angeles" in venue


def test_no_dtt_and_no_mail_tax(deed_type):
    """Reference-faithful: neither instrument is a conveyance — no
    transfer-tax declaration, no mail-tax directive."""
    html = _normalized(render_deed_html(aff_row(deed_type)))
    assert "DOCUMENTARY TRANSFER TAX" not in html.upper()
    assert "UNDERSIGNED GRANTOR" not in html.upper()
    assert "Mail Tax Statements" not in html
    assert "And When Recorded Mail To" in html


def test_chassis_geometry_and_no_chrome(deed_type):
    """G2/G3 discipline: recorder space open, caption at the boundary,
    title below it, jurat in the lower half, one page, no chrome. The
    references measure: caption ~192pt, jurat ~600/620pt, one page."""
    pdf = render_deed_pdf(aff_row(deed_type))
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        assert len(doc.pages) == 1  # both references are one-page instruments
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
        assert caption_top > 100          # a real open recorder space above it
        assert x_of("RECORDER’S") > 300   # caption sits right of center
        assert title_top > caption_top    # title below the boundary
        assert jurat_top > page.height / 2  # jurat in the lower half

    html = render_deed_html(aff_row(deed_type))
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_registered_in_the_type_map(deed_type):
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    assert TEMPLATE_BY_DEED_TYPE[deed_type] == FORMS[deed_type]["template"]
