"""FORMS wave 1 #7 — Revocation of Revocable TOD Deed, pinned.

The STATUTORY form (Prob C §§5600/5644; the PCT blank mirrors it): three
pages — header + categorical exemption recitals + the statute's notice +
APN + property description; the revocation statement + signature/date +
the TWO-WITNESS block; the §1189 acknowledgment.

Doctrine: the DTT/PCOR exemption recitals are categorical statutory
furniture (interspousal-recital precedent — no decision gate, no DTT
block). The grantor is named ONLY at signature ("Sign and print your
name" — an execution act): nothing pre-prints, pinned with a sentinel.
"""
import io

import pdfplumber

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

TOD_META = {
    "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
    "return_to": {"name": "ROBERT OWNER", "address1": "1358 5TH ST",
                  "city": "Santa Monica", "state": "CA", "zip": "90401"},
    "title_order_no": "TO-9921",
    "escrow_no": "ESC-4410",
    "affidavit": {
        # Record identification only — must NOT render on the instrument.
        "revoking_grantor": "SENTINEL GRANTOR NAME",
    },
}


def tod_row(**overrides):
    row = {
        "id": 1,
        "deed_type": "tod-revocation",
        "grantor_name": "",
        "grantee_name": "",
        "parties": {"grantor": "SENTINEL GRANTOR NAME"},
        "legal_description": "LOT 7, BLOCK B, TRACT 12345",
        "county": "Los Angeles",
        "apn": "4290-012-034",
        "property_address": "1358 5TH ST, Santa Monica, CA 90401",
        "requested_by": "Pacific Coast Escrow",
        "metadata": TOD_META,
    }
    row.update(overrides)
    return row


def test_statutory_furniture_present():
    html = _normalized(render_deed_html(tod_row()))
    assert "Revocation of" in html
    assert "Revocable Transfer on Death (TOD) Deed" in html
    assert "California Probate Code &sect; 5600" in html or "California Probate Code § 5600" in html
    assert "THE UNDERSIGNED GRANTOR(s) DECLARE(s):" in html
    assert "exempt from Documentary Transfer Tax under Revenue and Taxation Code &sect;11930" in html \
        or "exempt from Documentary Transfer Tax under Revenue and Taxation Code §11930" in html
    assert "Preliminary Change of Ownership Report" in html
    assert "IMPORTANT NOTICE: THIS FORM MUST BE RECORDED TO BE EFFECTIVE" in html
    assert "60 days after the date it is notarized" in html
    assert "I revoke any TOD deed to transfer the described property that I executed before executing this form." in html
    assert "signed by two persons, both present at the same time" in html
    assert "Witness #1" in html
    assert "Witness #2" in html


def test_property_facts_render():
    html = _normalized(render_deed_html(tod_row()))
    assert "4290-012-034" in html
    assert "LOT 7, BLOCK B, TRACT 12345" in html
    assert "TO-9921" in html
    assert "ESC-4410" in html


def test_grantor_name_never_preprints():
    """The statutory form is signed AND printed by the grantor at
    notarization — the typed name identifies the record only."""
    html = render_deed_html(tod_row())
    assert "SENTINEL GRANTOR NAME" not in html
    assert "(Sign Name)" in html
    assert "(Print Name)" in html


def test_no_dtt_block_categorical_recitals_only():
    """Exemption recitals are furniture — the DTT declaration/decision
    machinery must not render (no amount, no checklines)."""
    html = _normalized(render_deed_html(tod_row()))
    assert "DOCUMENTARY TRANSFER TAX IS" not in html
    assert "Computed on full value" not in html
    assert "Unincorporated area" not in html


def test_acknowledgment_not_jurat():
    html = _normalized(render_deed_html(tod_row()))
    assert "personally appeared" in html
    assert "acknowledged to me" in html
    assert "Subscribed and sworn to (or affirmed) before me" not in html
    # The §1189 disclaimer appears once (the attached certificate page).
    assert html.count("verifies only the identity") == 1


def test_missing_property_facts_render_blank():
    html = render_deed_html(tod_row(apn="", legal_description="", metadata={}))
    assert "fact-line" in html
    assert "4290-012-034" not in html


def test_three_page_statutory_layout_and_no_chrome():
    """Page 1: recitals/notice/property. Page 2: revocation + signatures +
    witnesses. Page 3: acknowledgment. Chassis geometry on page one."""
    pdf = render_deed_pdf(tod_row())
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        assert len(doc.pages) == 3
        p1, p2, p3 = (p.extract_text() for p in doc.pages)
        assert "IMPORTANT NOTICE" in p1
        assert "PARCEL NUMBER" in p1.upper()
        assert "REVOCATION" in p2.upper()
        assert "WITNESSES" in p2.upper()
        assert "personally" in p3
        assert "personally" not in p1 and "personally" not in p2

        words = doc.pages[0].extract_words()

        def top_of(needle):
            hits = [w for w in words if needle.upper() in w["text"].upper()]
            assert hits, needle
            return hits[0]["top"]

        def x_of(needle):
            hits = [w for w in words if needle.upper() in w["text"].upper()]
            return hits[0]["x0"]

        caption_top = top_of("RECORDER’S")
        title_top = top_of("REVOCATION")
        assert caption_top > 100
        assert x_of("RECORDER’S") > 300
        assert title_top > caption_top

    html = render_deed_html(tod_row())
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_registered_in_the_type_and_family_maps():
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    from services.form_families import family_of, is_single_party, requires_legal_description
    assert TEMPLATE_BY_DEED_TYPE["tod-revocation"] == "tod_revocation_ca/index.jinja2"
    assert family_of("tod-revocation") == "declaration"
    assert is_single_party("tod-revocation")
    assert requires_legal_description("tod-revocation")  # parcel-tied
