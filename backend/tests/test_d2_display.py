"""D2 — requesting-party address on the deed face + bold APN.

Audit answer (D2.2): the address was captured all along — on the PARTNER
record (address_line1/city/state/postal_code) — but the builder took only
the partner's name, so the deed header printed "Recording Requested By"
with no address. The path now carries it: partner selectlist assembles a
one-line address → builder state → metadata.requested_by_address →
template header, same treatment as D1's mail-to block.
"""
import io

import pdfplumber

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import ALL_DEED_TYPES, minimal_row, _normalized

ADDR_META = {"requested_by_address": "456 Escrow Way, Suite 9, Los Angeles, CA 90012"}


def test_requesting_party_address_renders_on_every_deed_type():
    for deed_type in ALL_DEED_TYPES:
        html = _normalized(render_deed_html(minimal_row(deed_type=deed_type, metadata=ADDR_META)))
        assert "456 Escrow Way, Suite 9, Los Angeles, CA 90012" in html, deed_type


def test_requesting_party_address_prints_under_the_name():
    pdf = render_deed_pdf(minimal_row(metadata=ADDR_META))
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        lines = doc.pages[0].extract_text().splitlines()
    req = next(i for i, l in enumerate(lines) if "RECORDING REQUESTED BY" in l.upper())
    block = "\n".join(lines[req : req + 4])
    assert "Acme Escrow" in block
    assert "456 Escrow Way" in block


def test_no_address_line_when_none_given():
    html = render_deed_html(minimal_row())
    assert "456 Escrow Way" not in html


def test_apn_prints_bold_like_the_parties():
    """D2.3: both APN appearances — the header boundary ref and the body
    parcel line — carry bold, matching the D1 legal-description treatment."""
    pdf = render_deed_pdf(minimal_row())
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        words = doc.pages[0].extract_words(extra_attrs=["fontname"])
    apn_words = [w for w in words if "1234-567-890" in w["text"]]
    assert len(apn_words) >= 2, "expected APN in header and body"
    for w in apn_words:
        assert "Bold" in w["fontname"], f"APN rendered {w['fontname']}"


def test_apn_bold_in_every_chassis():
    for deed_type in ALL_DEED_TYPES:
        html = render_deed_html(minimal_row(deed_type=deed_type))
        for cls in (".apn-ref", ".apn-line"):
            assert cls in html, (deed_type, cls)
            block = html[html.index(cls):]
            block = block[: block.index("}")]
            assert "font-weight: bold" in block, (deed_type, cls)
