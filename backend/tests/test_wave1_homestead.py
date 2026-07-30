"""FORMS wave 1 #5 — Declaration of Homestead (Individual), pinned.

First declaration-family instrument, built against Pacific Coast Title
blank form #33 (Homestead_Dec-Indiv). Family facts, per the FORMS_TRIAGE
correction note (owner-acknowledged): ACKNOWLEDGED per CCP §704.930 —
the §1189 certificate, never a jurat (the memo's "jurat reuse" prediction
was wrong; the reference outranks it). Single-party: the declarant rides
in the deeds.parties JSONB column (owner-ledgered migration). Not a
conveyance: no DTT, no mail-tax directive.
"""
import io

import pdfplumber

from services.deed_pdf import render_deed_html, render_deed_pdf
from tests.test_deed_pdf import _normalized

HOMESTEAD_META = {
    "requested_by_address": "456 Escrow Way, Los Angeles, CA 90012",
    "return_to": {"name": "ROBERT OWNER", "address1": "1358 5TH ST",
                  "city": "Santa Monica", "state": "CA", "zip": "90401"},
}


def homestead_row(**overrides):
    row = {
        "id": 1,
        "deed_type": "homestead-declaration",
        # Single-party: grantor/grantee legitimately EMPTY (parties column
        # is authoritative — the migration's whole point).
        "grantor_name": "",
        "grantee_name": "",
        "parties": {"declarant": "ROBERT OWNER"},
        "legal_description": "LOT 7, BLOCK B, TRACT 12345",
        "county": "Los Angeles",
        "apn": "4290-012-034",
        "property_address": "1358 5TH ST, Santa Monica, CA 90401",
        "requested_by": "Pacific Coast Escrow",
        "metadata": HOMESTEAD_META,
    }
    row.update(overrides)
    return row


def test_declaration_furniture_present():
    """Clauses 2–4 are instrument-defining recitals (Flag-3: furniture)."""
    html = _normalized(render_deed_html(homestead_row()))
    assert "Declaration of Homestead" in html
    assert "(Individual)" in html
    assert "hereby certify and declare as follows:" in html
    assert "I hereby claim as a declared homestead the premises described as follows:" in html
    assert "I am the owner of the above described homestead." in html
    assert "principal dwelling" in html
    assert "known to be true as of my personal knowledge" in html


def test_declarant_renders_from_the_parties_column():
    html = _normalized(render_deed_html(homestead_row()))
    assert "ROBERT OWNER" in html
    assert "LOT 7, BLOCK B, TRACT 12345" in html
    # The printed name identifies the signer (deed-chassis precedent).
    assert "Print Name:" in html


def test_missing_declarant_renders_blank_never_invented():
    # metadata cleared too: the mail-to block legitimately repeats the
    # declarant's name — the pin targets the recital and Print Name only.
    html = render_deed_html(homestead_row(parties=None, metadata={}))
    assert "fact-line" in html
    assert "ROBERT OWNER" not in html


def test_acknowledgment_not_jurat():
    """THE family canary, corrected direction: CCP §704.930 requires an
    ACKNOWLEDGED declaration — §1189 body present, jurat absent."""
    html = _normalized(render_deed_html(homestead_row()))
    assert "personally appeared" in html
    assert "acknowledged to me" in html
    assert "Subscribed and sworn to (or affirmed) before me" not in html
    assert html.count("verifies only the identity") == 1


def test_acknowledgment_contents_are_blank():
    """Blank-contents: the notary's entries never pre-fill; the declarant's
    name appears in the body and Print Name, never inside the cert."""
    html = _normalized(render_deed_html(homestead_row()))
    ack = html[html.index("personally appeared"):]
    assert "ROBERT OWNER" not in ack


def test_no_dtt_no_mail_tax_no_vesting():
    """Not a conveyance: no transfer-tax block, no mail-tax directive; and
    no vesting can leak (single-party instrument)."""
    html = _normalized(render_deed_html(homestead_row(vesting="SENTINEL VESTING TEXT")))
    assert "DOCUMENTARY TRANSFER TAX" not in html.upper()
    assert "UNDERSIGNED GRANTOR" not in html.upper()
    assert "Mail Tax Statements" not in html
    assert "And When Recorded Mail To" in html
    assert "SENTINEL VESTING TEXT" not in html


def test_one_page_with_inline_acknowledgment():
    """The reference is ONE page with the §1189 certificate in the lower
    half — the partial's inline mode keeps it there (deed templates keep
    their own-page behavior, pinned by the existing deed suites)."""
    pdf = render_deed_pdf(homestead_row())
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
        assert ack_top > page.height / 2   # certificate in the lower half

    html = render_deed_html(homestead_row())
    for leaked in ("7C4DFF", "Generated by", "deedpro.com/verify", "recorder-box", "bg-brand"):
        assert leaked not in html, leaked


def test_registered_in_the_type_and_family_maps():
    from services.deed_pdf import TEMPLATE_BY_DEED_TYPE
    from services.form_families import family_of, is_single_party
    assert TEMPLATE_BY_DEED_TYPE["homestead-declaration"] == "homestead_declaration_ca/index.jinja2"
    assert family_of("homestead-declaration") == "declaration"
    assert is_single_party("homestead-declaration")
