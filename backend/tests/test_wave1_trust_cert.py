"""FORMS wave 1 #6 — Certification of Trust (Prob C §18100.5), pinned.

Built against Pacific Coast Title blank form #72 (Trust-Certification).
Family facts (FORMS_TRIAGE correction note): an ACKNOWLEDGED
penalty-of-perjury declaration — never a jurat. PROPERTY-LESS: certifies
a trust, not a parcel — no APN, no legal description.

THE owner-ruled pin (wave-1 hold #3): the item-4 power initial lines and
the item-5 Revocable/Irrevocable checkboxes are EXECUTION acts — they
render BLANK, always, occurrence-counted. A pre-marked power would be a
fabricated assertion; even a filled 'revocability' transcription must not
mark the form.
"""
import io

import pdfplumber

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

TRUST_META = {
    "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
    "return_to": {"name": "JOHN A. DOE", "address1": "1358 5TH ST",
                  "city": "Santa Monica", "state": "CA", "zip": "90401"},
    "title_order_no": "TO-9921",
    "escrow_no": "ESC-4410",
    "affidavit": {
        "trust_name": "THE DOE FAMILY TRUST",
        "trust_date": "January 10, 2010",
        "settlors": "JOHN A. DOE AND JANE B. DOE",
        "trustees": "JOHN A. DOE AND JANE B. DOE",
        "revocability": "Revocable",
        "revoker_name": "JOHN A. DOE",
        "signer_count": "1",
        "signer_names": "JOHN A. DOE",
        "title_vesting": "JOHN A. DOE AND JANE B. DOE, TRUSTEES OF THE DOE FAMILY TRUST",
    },
}


def trust_row(**overrides):
    row = {
        "id": 1,
        "deed_type": "trust-certification",
        "grantor_name": "",
        "grantee_name": "",
        "parties": {"trustee": "JOHN A. DOE AND JANE B. DOE"},
        # Property-less: no parcel facts at all.
        "legal_description": "",
        "county": "",
        "apn": "",
        "property_address": "",
        "requested_by": "Pacific Coast Escrow",
        "metadata": TRUST_META,
    }
    row.update(overrides)
    return row


def test_certification_furniture_present():
    html = _normalized(render_deed_html(trust_row()))
    assert "Certification of Trust" in html
    assert "California Probate Code Section 18100.5" in html
    assert "declare(s) under penalty of perjury under the laws of the State" in html
    assert "is a valid and existing trust" in html
    assert "initial applicable line(s)" in html
    assert "The Trust has not been revoked, modified or amended" in html
    assert "I (we) am (are) all of the currently acting trustees." in html
    assert "copies of excerpts" in html
    assert "(Acknowledgement must be attached)" in html


def test_typed_transcriptions_render():
    html = _normalized(render_deed_html(trust_row()))
    for fact in ("THE DOE FAMILY TRUST", "January 10, 2010",
                 "JOHN A. DOE AND JANE B. DOE",
                 "TRUSTEES OF THE DOE FAMILY TRUST", "TO-9921", "ESC-4410"):
        assert fact in html, fact


def test_missing_facts_render_as_blank_lines_never_invented():
    html = render_deed_html(trust_row(metadata={}))
    assert "fact-line" in html
    assert "THE DOE FAMILY TRUST" not in html


def test_execution_marks_render_blank_always():
    """THE owner-ruled pin, occurrence-style: 4 power initial lines and 2
    checkbox lines render BLANK even with a filled 'revocability'
    transcription — initialing/checking is the trustee's hand."""
    html = render_deed_html(trust_row())
    assert html.count('class="initial-line"') == 4
    assert html.count('class="check-line"') == 2
    # Nothing marks them: no X (or anything else) inside the mark spans.
    import re
    for m in re.finditer(r'class="(?:initial|check)-line"[^>]*>([^<]*)<', html):
        assert m.group(1).strip() in ("", "&nbsp;"), m.group(0)
    # The transcription itself must not leak a mark: 'Revocable' appears
    # exactly once — as item 5's printed furniture, never a second marked
    # copy. ('Irrevocable' contains it, so count both.)
    body = _normalized(html)
    assert body.count("Revocable") == 2  # "___Revocable ___Irrevocable" furniture only
    assert ">X<" not in html.replace(" ", "")


def test_acknowledgment_attached_not_jurat():
    """Acknowledged declaration: §1189 body present (the ATTACHED page),
    jurat absent."""
    html = _normalized(render_deed_html(trust_row()))
    assert "personally appeared" in html
    assert "acknowledged to me" in html
    assert "Subscribed and sworn to (or affirmed) before me" not in html
    assert html.count("verifies only the identity") == 1


def test_acknowledgment_contents_are_blank():
    html = _normalized(render_deed_html(trust_row()))
    ack = html[html.index("personally appeared"):]
    assert "JOHN A. DOE" not in ack


def test_property_less_no_apn_no_legal_no_dtt():
    """The instrument certifies a TRUST: no APN line, no legal-description
    block, no transfer tax, no mail-tax directive."""
    html = _normalized(render_deed_html(trust_row()))
    assert "APN:" not in html
    assert "legal-content" not in html
    assert "DOCUMENTARY TRANSFER TAX" not in html.upper()
    assert "Mail Tax Statements" not in html
    assert "When Recorded Mail To" in html


def test_chassis_geometry_and_no_chrome():
    """Page one carries the certification; the acknowledgment rides as its
    own ATTACHED page (the reference's foot directive)."""
    pdf = render_deed_pdf(trust_row())
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        assert len(doc.pages) == 2
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
        title_top = top_of("CERTIFICATION")
        assert caption_top > 100
        assert x_of("RECORDER’S") > 300
        assert title_top > caption_top
        # The acknowledgment is NOT on page one:
        page1_text = page.extract_text()
        assert "personally" not in page1_text
        # ... and IS the attached page two (word-level: line wraps split
        # the phrase in extracted text).
        page2_text = doc.pages[1].extract_text()
        assert "personally" in page2_text
        assert "acknowledged" in page2_text

    html = render_deed_html(trust_row())
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_generate_path_accepts_property_less_certification():
    """Route-level: a certification generates with parties + no legal
    description, while the homestead (parcel-tied) still requires one."""
    from contextlib import contextmanager
    from unittest.mock import patch
    from fastapi.testclient import TestClient
    from auth import get_current_user_id
    from main import app

    @contextmanager
    def authed_client(user_id=1):
        app.dependency_overrides[get_current_user_id] = lambda: user_id
        try:
            yield TestClient(app)
        finally:
            app.dependency_overrides.pop(get_current_user_id, None)

    fake_row = {"id": 92, "status": "draft"}
    with authed_client() as client, \
            patch("routers.deeds_crud.create_deed", return_value=dict(fake_row)) as create:
        resp = client.post("/deeds", json={
            "deed_type": "trust-certification",
            "parties": {"trustee": "JOHN A. DOE"},
            "affidavit": TRUST_META["affidavit"],
        })
        assert resp.status_code == 200, resp.text
        assert create.call_args[0][1]["parties"] == {"trustee": "JOHN A. DOE"}

        resp = client.post("/deeds", json={
            "deed_type": "homestead-declaration",
            "parties": {"declarant": "ROBERT OWNER"},
            # legal_description missing → parcel-tied declaration still 422s
        })
        assert resp.status_code == 422
        assert "Legal description" in resp.json()["detail"]


def test_registered_in_the_type_and_family_maps():
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    from services.form_families import (
        family_of, is_single_party, requires_legal_description,
    )
    assert TEMPLATE_BY_DEED_TYPE["trust-certification"] == "trust_certification_ca/index.jinja2"
    assert family_of("trust-certification") == "declaration"
    assert is_single_party("trust-certification")
    assert not requires_legal_description("trust-certification")
    # The relaxation is surgical: every other type still requires it.
    assert requires_legal_description("homestead-declaration")
    assert requires_legal_description("grant-deed")
