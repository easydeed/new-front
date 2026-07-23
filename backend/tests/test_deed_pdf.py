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


def test_exempt_dtt_maps_to_zero_amount():
    dtt = _map_dtt({"is_exempt": True, "exemption_reason": "R&T 11911", "area_type": "unincorporated"})
    assert dtt["amount"] == "0.00"
    assert dtt["is_exempt"] is True


def test_unknown_deed_type_falls_back_to_grant_deed_template():
    assert TEMPLATE_BY_DEED_TYPE.get("nonsense", DEFAULT_TEMPLATE) == DEFAULT_TEMPLATE


def test_render_produces_pdf_bytes_for_every_mapped_deed_type():
    # WeasyPrint renders locally (no PDFShift key in the test env).
    for deed_type in ("grant-deed", "quitclaim-deed", "interspousal-transfer",
                      "warranty-deed", "tax-deed"):
        pdf = render_deed_pdf(minimal_row(deed_type=deed_type))
        assert pdf[:5] == b"%PDF-", f"{deed_type} did not render a PDF"
        assert len(pdf) > 1000
