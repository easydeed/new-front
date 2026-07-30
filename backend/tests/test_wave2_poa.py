"""FORMS wave 2 #7 — Uniform Statutory Form Power of Attorney, pinned.

The STATUTORY form (Prob C §4401; PCT reference #55 mirrors it). The
wave's flagged high-risk object, resolved WITHOUT force:

- TYPED OFFICER FACTS — exactly two: the principal's name/address and
  the appointee(s). Nothing else is an input.
- THE PRINCIPAL'S EXECUTION ACTS — blank/verbatim, always: 14 power
  initial lines (cert-of-trust ruling, directly on point); the
  special-instruction lines and the SEPARATELY/JOINTLY word-blank
  (signer-completed text blanks, the "Other:"-line class — the
  word-blank carries a jointly-by-default legal effect, so pre-writing
  it would fabricate an election); the incapacity sentence prints
  verbatim and is NEVER pre-struck.

Certificate verified from the reference: §1189 acknowledgment, inline on
page two. Property-less, single-party (principal), no DTT.
"""
import io
import re

import pdfplumber

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

POA_META = {
    "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
    "return_to": {"name": "ROBERT OWNER", "address1": "1358 5TH ST",
                  "city": "Santa Monica", "state": "CA", "zip": "90401"},
    "title_order_no": "TO-9921",
    "escrow_no": "ESC-4410",
    "affidavit": {
        "principal_name": "ROBERT OWNER, 1358 5TH ST, SANTA MONICA, CA 90401",
        "agent_names": "JANE B. DOE, 456 ESCROW WAY, LOS ANGELES, CA 90012",
    },
}


def poa_row(**overrides):
    row = {
        "id": 1,
        "deed_type": "poa-statutory",
        "grantor_name": "",
        "grantee_name": "",
        "parties": {"principal": "ROBERT OWNER"},
        "legal_description": "",
        "county": "",
        "apn": "",
        "property_address": "",
        "requested_by": "Pacific Coast Escrow",
        "metadata": POA_META,
    }
    row.update(overrides)
    return row


def test_statutory_furniture_verbatim():
    html = _normalized(render_deed_html(poa_row()))
    assert "Uniform Statutory Form Power of Attorney" in html
    assert "(California Probate Code Section 4401)" in html
    assert "THE POWERS GRANTED BY THIS DOCUMENT ARE BROAD AND SWEEPING" in html
    assert "PROBATE CODE SECTIONS 4400-4465" in html
    assert "DOES NOT AUTHORIZE ANYONE TO MAKE MEDICAL AND OTHER HEALTH-CARE" in html
    assert "as my agent (attorney-in-fact) to act for me in any lawful way" in html
    assert "TO WITHHOLD A POWER, DO NOT INITIAL THE LINE IN FRONT OF IT" in html
    assert "(A) Real property transactions." in html
    assert "(N) ALL OF THE POWERS LISTED ABOVE." in html
    assert "YOU NEED NOT INITIAL ANY OTHER LINES IF YOU INITIAL LINE (N)." in html
    assert "SPECIAL INSTRUCTIONS: ON THE FOLLOWING LINES" in html
    assert "EFFECTIVE IMMEDIATELY AND WILL CONTINUE UNTIL IT IS REVOKED" in html
    assert "I agree to indemnify the third party" in html
    assert "THE AGENT ASSUMES THE FIDUCIARY" in html


def test_the_two_typed_facts_render():
    html = _normalized(render_deed_html(poa_row()))
    assert "ROBERT OWNER, 1358 5TH ST, SANTA MONICA, CA 90401" in html
    assert "JANE B. DOE, 456 ESCROW WAY, LOS ANGELES, CA 90012" in html


def test_missing_facts_render_blank_never_invented():
    html = render_deed_html(poa_row(parties=None, metadata={}))
    assert "fact-line" in html
    assert "ROBERT OWNER" not in html


def test_power_initials_blank_always_occurrence_pinned():
    """THE ruling pin: exactly 14 power initial lines, every one empty."""
    html = render_deed_html(poa_row())
    assert html.count('class="initial-line"') == 14
    for m in re.finditer(r'class="initial-line"[^>]*>([^<]*)<', html):
        assert m.group(1).strip() in ("", "&nbsp;"), m.group(0)


def test_principal_elections_never_pre_completed():
    """Special-instruction lines empty; the SEPARATELY/JOINTLY word-blank
    empty (jointly-by-default is the statute's rule, not ours to write);
    the incapacity sentence verbatim and never struck."""
    html = render_deed_html(poa_row())
    assert html.count('class="special-line"') == 3
    for m in re.finditer(r'class="special-line"[^>]*>([^<]*)<', html):
        assert m.group(1).strip() == "", m.group(0)
    body = _normalized(html)
    assert "the agents are to act" in body
    assert "SEPARATELY" in body   # only inside the statute's instruction text
    assert "will continue to be effective even though I become incapacitated" in body
    assert "STRIKE THE PRECEDING SENTENCE" in body
    for strike_markup in ("<s>", "<strike>", "line-through"):
        assert strike_markup not in html, strike_markup


def test_acknowledgment_not_jurat_and_contents_blank():
    html = _normalized(render_deed_html(poa_row()))
    assert "personally appeared" in html
    assert "acknowledged to me" in html
    assert "Subscribed and sworn to (or affirmed) before me" not in html
    assert html.count("verifies only the identity") == 1
    ack = html[html.index("personally appeared"):]
    assert "ROBERT OWNER" not in ack
    assert "JANE B. DOE" not in ack


def test_property_less_no_dtt_no_mail_tax():
    html = _normalized(render_deed_html(poa_row()))
    assert "APN:" not in html
    assert "legal-content" not in html
    assert "DOCUMENTARY TRANSFER TAX" not in html.upper()
    assert "Mail Tax Statements" not in html
    assert "And When Recorded Mail To" in html


def test_two_page_statutory_layout_and_no_chrome():
    """Page 1: notice + appointment + powers. Page 2: instructions +
    execution + the inline §1189 certificate (as the reference prints)."""
    pdf = render_deed_pdf(poa_row())
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        assert len(doc.pages) == 2
        p1 = doc.pages[0].extract_text()
        p2 = doc.pages[1].extract_text()
        assert "BROAD AND SWEEPING" in p1
        assert "(N) ALL OF THE POWERS" in p1
        assert "SPECIAL INSTRUCTIONS" in p2
        assert "personally" in p2 and "personally" not in p1

        words = doc.pages[0].extract_words()

        def top_of(needle):
            hits = [w for w in words if needle.upper() in w["text"].upper()]
            assert hits, needle
            return hits[0]["top"]

        def x_of(needle):
            hits = [w for w in words if needle.upper() in w["text"].upper()]
            return hits[0]["x0"]

        caption_top = top_of("RECORDER’S")
        title_top = top_of("STATUTORY")
        assert caption_top > 100
        assert x_of("RECORDER’S") > 300
        assert title_top > caption_top

    html = render_deed_html(poa_row())
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_registered_in_the_type_and_family_maps():
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    from services.form_families import family_of, is_single_party, requires_legal_description
    assert TEMPLATE_BY_DEED_TYPE["poa-statutory"] == "poa_statutory_ca/index.jinja2"
    assert family_of("poa-statutory") == "declaration"
    assert is_single_party("poa-statutory")
    assert not requires_legal_description("poa-statutory")  # property-less
