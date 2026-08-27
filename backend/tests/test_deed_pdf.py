"""Tests for the stored-PDF pipeline (services/deed_pdf.py)."""
import json

from services.deed_pdf import (
    TEMPLATE_BY_DEED_TYPE,
    DEFAULT_TEMPLATE,
    build_context_from_row,
    render_deed_pdf,
    _map_dtt,
)


def minimal_row(**overrides):
    row = {
        "id": 1,
        "deed_type": "grant-deed",
        "property_address": "123 Main St, Los Angeles, CA 90001",
        "grantor_name": "JOHN DOE",
        "grantee_name": "JANE ROE",
        "legal_description": "LOT 1, BLOCK 2, TRACT 3456",
        "county": "Los Angeles",
        "apn": "1234-567-890",
        "vesting": "a single woman",
        "requested_by": "Acme Escrow",
        "metadata": {},
    }
    row.update(overrides)
    return row


def test_context_maps_live_column_names():
    ctx = build_context_from_row(minimal_row())
    assert ctx["grantors_text"] == "JOHN DOE"
    assert ctx["grantees_text"] == "JANE ROE"
    assert ctx["county"] == "Los Angeles"
    assert ctx["apn"] == "1234-567-890"
    assert ctx["dtt"] is None  # no DTT in metadata -> template renders blanks


def test_context_reads_metadata_extras_including_json_string():
    meta = {
        "title_order_no": "TO-1",
        "escrow_no": "ESC-2",
        "return_to": "JANE ROE",
        "dtt": {
            "calculated_amount": "550.00",
            "basis": "less_liens",
            "area_type": "city",
            "city_name": "Los Angeles",
            "is_exempt": False,
        },
    }
    for stored_as in (meta, json.dumps(meta)):  # jsonb arrives as dict; be tolerant of strings
        ctx = build_context_from_row(minimal_row(metadata=stored_as))
        assert ctx["title_order_no"] == "TO-1"
        assert ctx["escrow_no"] == "ESC-2"
        assert ctx["return_to"] == {"name": "JANE ROE"}  # bare string wrapped for the template
        assert ctx["dtt"]["amount"] == "550.00"
        assert ctx["dtt"]["basis"] == "less_liens"
        assert ctx["dtt"]["city_name"] == "Los Angeles"


def test_return_to_dict_passes_through_with_address():
    """Mail-to may arrive as a full address block (builder sends the
    grantee at the property address); the context must pass it through so
    the deed prints WHERE to mail, not just a name."""
    meta = {"return_to": {"name": "JANE ROE", "address1": "1358 5TH ST",
                          "city": "Santa Monica", "state": "CA", "zip": "90401"}}
    ctx = build_context_from_row(minimal_row(metadata=meta))
    assert ctx["return_to"]["address1"] == "1358 5TH ST"
    html = _normalized(__import__("services.deed_pdf", fromlist=["render_deed_html"]).render_deed_html(minimal_row(metadata=meta)))
    assert "1358 5TH ST" in html
    assert "Santa Monica, CA 90401" in html


def test_exempt_dtt_maps_to_zero_amount():
    dtt = _map_dtt({"is_exempt": True, "exemption_reason": "R&T 11911", "area_type": "unincorporated"})
    assert dtt["amount"] == "0.00"
    assert dtt["is_exempt"] is True


def test_unknown_deed_type_falls_back_to_grant_deed_template():
    assert TEMPLATE_BY_DEED_TYPE.get("nonsense", DEFAULT_TEMPLATE) == DEFAULT_TEMPLATE


def test_render_produces_pdf_bytes_for_every_mapped_deed_type():
    # WeasyPrint — the production engine since PS2 — renders locally.
    for deed_type in ("grant-deed", "quitclaim-deed", "interspousal-transfer",
                      "warranty-deed", "tax-deed"):
        pdf = render_deed_pdf(minimal_row(deed_type=deed_type))
        assert pdf[:5] == b"%PDF-", f"{deed_type} did not render a PDF"
        assert len(pdf) > 1000


# ── Ticket N: California all-purpose acknowledgment page (CC §1189) ──

VERBATIM_1189 = (
    "A notary public or other officer completing this certificate verifies only "
    "the identity of the individual who signed the document to which this "
    "certificate is attached, and not the truthfulness, accuracy, or validity "
    "of that document."
)


def _normalized(html):
    import re as _re
    return _re.sub(r"\s+", " ", html)


def test_acknowledgment_page_on_all_five_deed_types():
    from services.deed_pdf import render_deed_html
    for deed_type in ("grant-deed", "quitclaim-deed", "interspousal-transfer",
                      "warranty-deed", "tax-deed"):
        html = render_deed_html(minimal_row(deed_type=deed_type))
        assert "California All-Purpose Acknowledgment" in html, deed_type
        # CC 1189(a)(8): the disclaimer must appear verbatim (whitespace-normalized).
        assert VERBATIM_1189 in _normalized(html), deed_type
        assert "County of" in html, deed_type


# ── G2: grant deed page-one rebuilt to the CA-standard geometry ──

def test_grant_deed_statutory_furniture_present():
    """R&T §11932 lead-in, recorder caption, and mail-tax directive — the
    three statutory strings the pre-G2 template was missing or misplacing."""
    from services.deed_pdf import render_deed_html
    html = _normalized(render_deed_html(minimal_row()))
    assert "THE UNDERSIGNED GRANTOR(S) DECLARE(S):" in html
    assert "DOCUMENTARY TRANSFER TAX IS" in html
    assert "Space Above This Line Is For Recorder" in html
    assert "Mail Tax Statements As Directed Above" in html
    assert "Mail Tax Statements and" in html  # combined mail-to heading
    assert "Computed on full value of property conveyed" in html
    assert "Computed on full value less liens and encumbrances" in html


def test_grant_deed_recorded_pages_carry_no_chrome():
    """Gov. Code §27361.7 reproducibility: no branding, color, or drawn
    recorder box on the instrument. Verification stays data-only
    (deed_pdfs.sha256 + metadata + /api/v1/verify) — never on recorded pages."""
    from services.deed_pdf import render_deed_html
    html = render_deed_html(minimal_row())
    assert "7C4DFF" not in html          # brand purple
    assert "Generated by" not in html    # branding line
    assert "deedpro.com/verify" not in html
    assert "recorder-box" not in html    # the old bordered box
    assert '("Grantor")' not in html     # contract-style defined terms
    assert '("Grantee")' not in html
    assert "background: #fafafa" not in html  # gray fills


def test_grant_deed_dtt_values_render():
    from services.deed_pdf import render_deed_html
    meta = {"dtt": {"calculated_amount": "550.00", "basis": "less_liens",
                    "area_type": "city", "city_name": "Los Angeles",
                    "is_exempt": False}}
    html = _normalized(render_deed_html(minimal_row(metadata=meta)))
    assert "$550.00" in html
    assert "City of" in html and "Los Angeles" in html


# ── G3: sibling templates rebuilt on the same chassis ──

ALL_DEED_TYPES = ("grant-deed", "quitclaim-deed", "interspousal-transfer",
                  "warranty-deed", "tax-deed")


def test_all_types_carry_recorder_furniture_and_no_chrome():
    """Every deed type: recorder caption + mail-tax directive present;
    no branding, no drawn recorder box, no gray fills (Gov C §27361.6/.7)."""
    from services.deed_pdf import render_deed_html
    for deed_type in ALL_DEED_TYPES:
        html = _normalized(render_deed_html(minimal_row(deed_type=deed_type)))
        assert "Space Above This Line Is For Recorder" in html, deed_type
        assert "Mail Tax Statements As Directed Above" in html, deed_type
        assert "7C4DFF" not in html, deed_type
        assert "Generated by" not in html, deed_type
        assert "recorder-box" not in html, deed_type
        assert "recorder-space-label" not in html, deed_type
        assert "#fafafa" not in html, deed_type


def test_all_types_have_exactly_one_acknowledgment():
    """The quitclaim/interspousal/warranty templates carried an inline
    duplicate acknowledgment with the signer's name PRE-FILLED — a
    blank-form (Ticket N) violation. One certificate per document, and
    the signer line is the notary's to complete."""
    from services.deed_pdf import render_deed_html
    for deed_type in ALL_DEED_TYPES:
        html = _normalized(render_deed_html(minimal_row(deed_type=deed_type)))
        assert html.count("personally appeared") == 1, deed_type
        body = html[html.index("personally appeared"):html.index("who proved")]
        assert "JOHN DOE" not in body, deed_type


def test_per_type_operative_wording_preserved():
    from services.deed_pdf import render_deed_html
    cases = {
        "quitclaim-deed": ["REMISE(S), RELEASE(S) AND QUITCLAIM(S)",
                           "THE UNDERSIGNED GRANTOR(S) DECLARE(S):"],
        "interspousal-transfer": ["GRANTS AND TRANSFERS", "Section 11927",
                                  "transmutation agreement",
                                  "Family Code Section 850"],
        "warranty-deed": ["GRANTS, BARGAINS, SELLS AND CONVEYS",
                          "Covenant of Seisin",
                          "THE UNDERSIGNED GRANTOR(S) DECLARE(S):"],
        "tax-deed": ["Section 11922", "Tax Collector",
                     "NOW, THEREFORE"],
    }
    for deed_type, strings in cases.items():
        html = _normalized(render_deed_html(minimal_row(deed_type=deed_type)))
        for s in strings:
            assert s in html, f"{deed_type}: missing {s!r}"


def test_dtt_blank_until_declared():
    """No auto-applied claims: with no DTT decision the amount stays blank
    and no basis/area is pre-checked (the old quitclaim/warranty defaulted
    to $0.00 with 'full value' and 'unincorporated' pre-checked)."""
    from services.deed_pdf import render_deed_html
    for deed_type in ("grant-deed", "quitclaim-deed", "warranty-deed"):
        html = _normalized(render_deed_html(minimal_row(deed_type=deed_type)))
        assert "$0.00" not in html, deed_type
        dtt = html[html.index("DECLARE(S)"):html.index("For valuable")]
        assert ">X<" not in dtt, deed_type  # no checkline pre-marked


def test_acknowledgment_body_is_blank_except_county():
    """We generate the form, never its contents: the notary's certificate
    fields (date, notary name, signer name) must be blank lines; only the
    venue county pre-fills from builder state."""
    from services.deed_pdf import render_deed_html
    html = render_deed_html(minimal_row())
    ack = html[html.index("California All-Purpose Acknowledgment"):]
    body = ack[ack.index("personally appeared"):ack.index("who proved")]
    assert "JOHN DOE" not in body  # signer name never pre-filled
    assert "____" in body          # blank line present for the notary
    venue = ack[ack.index("County of"):ack.index("County of") + 200]
    assert "Los Angeles" in venue  # county pre-fills from builder state
