"""D1 — deed display pins: mail-to block on the stored PDF, bold legal
description, and no preview styling leaking into recorded pages.

The builder preview got purple data-highlighting (PreviewPanel only);
recorded pages stay chrome-free (Gov C §27361.7, the G2/G3 invariant).
These tests pin the PDF side of D1: the full mail-to address block
actually prints, the legal description carries the same weight as the
parties, and no Tailwind/preview class ever reaches a template.
"""
import io

import pdfplumber

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import ALL_DEED_TYPES, minimal_row, _normalized

MAILTO_META = {
    "return_to": {
        "name": "JANE ROE",
        "address1": "1358 5TH ST",
        "city": "Santa Monica",
        "state": "CA",
        "zip": "90401",
    },
}


def test_mailto_address_lines_render_on_the_stored_pdf():
    """D1.1: the WHEN RECORDED MAIL TO block prints name + street +
    city/state/zip as stacked lines in the page-one header."""
    pdf = render_deed_pdf(minimal_row(metadata=MAILTO_META))
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        lines = doc.pages[0].extract_text().splitlines()
    mail_label = next(i for i, l in enumerate(lines) if "WHEN RECORDED MAIL TO" in l.upper())
    header_block = lines[mail_label + 1 : mail_label + 4]
    assert header_block[0].strip() == "JANE ROE"
    assert header_block[1].strip() == "1358 5TH ST"
    assert header_block[2].strip() == "Santa Monica, CA 90401"


def test_mailto_block_renders_on_every_deed_type():
    for deed_type in ALL_DEED_TYPES:
        html = _normalized(render_deed_html(minimal_row(deed_type=deed_type, metadata=MAILTO_META)))
        assert "1358 5TH ST" in html, deed_type
        assert "Santa Monica, CA 90401" in html, deed_type


def test_legal_description_prints_bold_like_the_parties():
    """D1.2: the description carries the same weight as grantor/grantee —
    the three data blocks an examiner scans first."""
    pdf = render_deed_pdf(minimal_row())
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        words = doc.pages[0].extract_words(extra_attrs=["fontname"])
    legal_words = [w for w in words if w["text"] in ("LOT", "TRACT", "3456")]
    assert legal_words, "legal description words not found on page one"
    for w in legal_words:
        assert "Bold" in w["fontname"], f"{w['text']} rendered {w['fontname']}"
    # The parties keep their bold treatment (granting clause).
    grantor = [w for w in words if w["text"] == "JOHN"]
    assert any("Bold" in w["fontname"] for w in grantor)


def test_legal_content_bold_in_every_chassis():
    for deed_type in ALL_DEED_TYPES:
        html = render_deed_html(minimal_row(deed_type=deed_type))
        assert ".legal-content" in html, deed_type
        legal_css = html[html.index(".legal-content"):]
        legal_css = legal_css[: legal_css.index("}")]
        assert "font-weight: bold" in legal_css, deed_type


def test_preview_highlight_classes_never_reach_recorded_pages():
    """D1.3 leak pin: the preview's purple data-highlight treatment is
    Tailwind classes in PreviewPanel — none of its vocabulary (or any
    Tailwind class syntax) may appear in rendered deed HTML."""
    for deed_type in ALL_DEED_TYPES:
        html = render_deed_html(minimal_row(deed_type=deed_type, metadata=MAILTO_META))
        for leaked in ("bg-brand", "text-brand", "dataHighlight", "ring-", "7C4DFF"):
            assert leaked not in html, f"{leaked} leaked into {deed_type}"
