"""FORMS-SPIKE — Affidavit of Death (Joint Tenancy), pinned.

The first non-deed instrument on the G2/G3 chassis, built against Pacific
Coast Title's blank form #4 as the reference implementation. The doctrine
canary: affidavits are SWORN statements — the notarial certificate is a
JURAT (Gov C §8202, "subscribed and sworn"), never an acknowledgment
(CC §1189, "personally appeared ... acknowledged"). Wrong-certificate is
a real defect class; these pins make it structural.
"""
import io

import pdfplumber

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

AFF_META = {
    "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
    "return_to": {"name": "JANE B. DOE", "address1": "1358 5TH ST",
                  "city": "Santa Monica", "state": "CA", "zip": "90401"},
    "affidavit": {
        "affiant_name": "JANE B. DOE",
        "decedent_name": "JOHN A. DOE",
        "jt_deed_date": "June 1, 2015",
        "jt_deed_grantor": "ROBERT SELLER",
        "jt_deed_grantees": "JOHN A. DOE AND JANE B. DOE",
        "recording_date": "June 15, 2015",
        "instrument_no": "2015-0654321",
    },
}


def aff_row(**overrides):
    row = {
        "id": 1,
        "deed_type": "affidavit-death-jt",
        "grantor_name": "JOHN A. DOE",   # display alias: decedent
        "grantee_name": "JANE B. DOE",   # display alias: affiant
        "legal_description": "LOT 7, BLOCK B, TRACT 12345",
        "county": "Los Angeles",
        "apn": "4290-012-034",
        "property_address": "1358 5TH ST, Santa Monica, CA 90401",
        "requested_by": "Pacific Coast Escrow",
        "metadata": AFF_META,
    }
    row.update(overrides)
    return row


def test_sworn_recital_furniture_present():
    """The instrument-defining recitals (Flag-3 precedent: choosing the
    instrument IS the officer's decision; its recitals are furniture)."""
    html = _normalized(render_deed_html(aff_row()))
    assert "AFFIDAVIT &mdash; DEATH OF JOINT TENANT" in html or "Affidavit &mdash; Death of Joint Tenant" in html
    assert "of legal age, being first duly sworn, deposes and says" in html
    assert "is the decedent mentioned in the attached certified copy of Certificate of Death" in html
    assert "as joint tenants, recorded on" in html
    assert "Official Records of" in html
    assert "Attach Certified Copy of Death Certificate" in html


def test_officer_facts_render():
    html = _normalized(render_deed_html(aff_row()))
    for fact in ("JANE B. DOE", "JOHN A. DOE", "June 1, 2015", "ROBERT SELLER",
                 "June 15, 2015", "2015-0654321", "Los Angeles",
                 "LOT 7, BLOCK B, TRACT 12345"):
        assert fact in html, fact


def test_missing_facts_render_as_blank_lines_never_invented():
    html = render_deed_html(aff_row(metadata={}))
    assert "fact-line" in html          # the reference's blank lines
    assert "JOHN A. DOE" not in html.split("deed-title")[1] if "deed-title" in html else True
    assert "2015-0654321" not in html


def test_jurat_not_acknowledgment():
    """THE doctrine canary. Exactly one notarial certificate, and it is a
    jurat: 'subscribed and sworn', never 'personally appeared ...
    acknowledged' (the §1189 acknowledgment body)."""
    html = _normalized(render_deed_html(aff_row()))
    assert html.count("Subscribed and sworn to (or affirmed) before me") == 1
    assert "personally appeared" not in html
    assert "acknowledged to me" not in html
    assert "All-Purpose Acknowledgment" not in html
    # §8202(b) disclaimer box present, once.
    assert html.count("verifies only the identity") == 1


def test_jurat_contents_are_blank_ticket_n_pattern():
    """Blank-contents doctrine: no affiant or notary entry pre-fills — the
    date, affiant name, and notary signature are the notary's. Only the
    venue county renders."""
    html = _normalized(render_deed_html(aff_row()))
    jurat = html[html.index("Subscribed and sworn"):]
    assert "JANE B. DOE" not in jurat        # affiant not pre-filled in the cert
    assert "JOHN A. DOE" not in jurat
    # Venue county pre-fills (data the officer supplied):
    venue = html[html.index("COUNTY OF"):html.index("Subscribed and sworn")]
    assert "Los Angeles" in venue


def test_no_dtt_and_no_mail_tax_on_affidavit():
    """Reference-faithful: an affidavit of death is not a conveyance — no
    transfer-tax declaration, no mail-tax directive."""
    html = _normalized(render_deed_html(aff_row()))
    assert "DOCUMENTARY TRANSFER TAX" not in html.upper()
    assert "UNDERSIGNED GRANTOR" not in html.upper()
    assert "Mail Tax Statements" not in html
    assert "And When Recorded Mail To" in html


def test_chassis_geometry_and_no_chrome():
    """G2/G3 discipline: recorder space open, caption at the boundary,
    title below it, jurat in the lower half, one page, no chrome."""
    pdf = render_deed_pdf(aff_row())
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        assert len(doc.pages) == 1  # the reference is a one-page instrument
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
        assert jurat_top > page.height / 2  # jurat in the lower half (reference ~596pt)

    html = render_deed_html(aff_row())
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_registered_in_the_type_map():
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    assert TEMPLATE_BY_DEED_TYPE["affidavit-death-jt"] == "affidavit_death_jt_ca/index.jinja2"
