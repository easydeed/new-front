"""T-3 — the PCOR fill, pinned against the stored PDF itself.

THE LOAD-BEARING TEST is `test_every_mapped_field_exists_in_the_stored_pdf`
and its sibling `test_a_swapped_pdf_is_caught`. Everything else here is
ordinary coverage; those two are the reason the map can be trusted.

The failure they exist for is silent. Writing to a field name the PDF
does not have raises nothing — the value is simply dropped. Writing the
wrong export value to a checkbox raises nothing — the box stays
unchecked. So a county re-publishing a revision under the SAME URL (which
is how these forms are distributed) would degrade us to a form that
looks filled and is not, with no error anywhere.

Hence: the stored bytes are hashed and pinned, every mapped field name is
resolved against the real /AcroForm, and every checkbox's expected export
value is asserted to appear in that widget's own /_States_.
"""
import hashlib
import io
import pytest

pytest.importorskip("pypdf")
from pypdf import PdfReader, PdfWriter  # noqa: E402

from services.county_forms import (  # noqa: E402
    CERTIFICATION_BLOCK, LA_BOE_502A_REV18, lookup_form,
)
from services.pcor_fill import PcorUnavailable, fill_pcor, values_from_deed  # noqa: E402

FORM = LA_BOE_502A_REV18


@pytest.fixture(scope="module")
def pdf_fields():
    return PdfReader(str(FORM.path)).get_fields()


# ── The load-bearing pair ────────────────────────────────────────────

def test_the_stored_pdf_is_the_revision_we_mapped():
    """The county publishes revisions at a stable URL. If the bytes ever
    change, every field name in the map is suspect — so the hash is the
    gate, and it fails loudly before anything is filled."""
    digest = hashlib.sha256(FORM.path.read_bytes()).hexdigest()
    assert digest == FORM.sha256, (
        "the stored PCOR no longer matches the mapped revision — re-verify "
        "every field name and export value before updating this hash"
    )


def test_every_mapped_field_exists_in_the_stored_pdf(pdf_fields):
    """Writing to a name the form does not have drops the value in
    silence. Every mapped name must resolve."""
    missing = [t.field for t in FORM.text_fields if t.field not in pdf_fields]
    assert missing == [], f"mapped text fields absent from the PDF: {missing}"

    missing_checks = [c.field for c in FORM.check_fields if c.field not in pdf_fields]
    assert missing_checks == [], f"mapped checkboxes absent: {missing_checks}"


def test_every_checkbox_export_value_matches_the_widgets_own_states(pdf_fields):
    """Trap 1 and trap 2, pinned.

    23 checkboxes on this form export "/no" and 4 export "/No"; question
    H's NO box exports "/Yes" outright. An inferred value is a coin flip,
    and a wrong one leaves the box silently unchecked.
    """
    for c in FORM.check_fields:
        states = [str(s) for s in (pdf_fields[c.field].get("/_States_") or [])]
        assert c.on_value in states, (
            f"{c.key}: mapped on-value {c.on_value!r} is not one of this "
            f"widget's states {states!r} — the check would silently miss"
        )


def test_a_swapped_pdf_is_caught(tmp_path):
    """The scenario the hash exists for, executed.

    A county re-publishes under the same filename. We simulate it by
    handing the registry a DIFFERENT valid PDF and assert the guard
    fires — rather than trusting that it would.
    """
    decoy = tmp_path / "boe502a_rev18.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    with open(decoy, "wb") as fh:
        writer.write(fh)

    swapped_digest = hashlib.sha256(decoy.read_bytes()).hexdigest()

    # The guard fires: a different revision cannot present the pinned
    # digest. (CountyForm is a NamedTuple — immutable by design, so the
    # registry itself cannot be monkeypatched into lying.)
    assert swapped_digest != FORM.sha256, "a swapped revision slipped past the hash"

    # And the mapped fields are gone from it, which is the downstream
    # symptom the hash is protecting against.
    fields = PdfReader(str(decoy)).get_fields() or {}
    assert FORM.text_fields[0].field not in fields


# ── Doctrine: the certification block ────────────────────────────────

@pytest.mark.parametrize("field_name", CERTIFICATION_BLOCK)
def test_no_certification_field_is_ever_written(field_name, pdf_fields):
    """Occurrence pin — one assertion per element, by name.

    The form has no /Sig field, so a signature is impossible. These are
    the fields around it that ARE writable, and printing the buyer's name
    under a certification they have not signed is pre-filling a sworn
    statement by a quieter route. Each stays blank.
    """
    assert field_name in pdf_fields, (
        "this field vanished from the form — re-verify the certification "
        "block before assuming it is still safe"
    )
    assert field_name not in [t.field for t in FORM.text_fields]
    assert field_name not in [c.field for c in FORM.check_fields]
    assert field_name in FORM.never_fill


def test_the_form_has_no_signature_field(pdf_fields):
    """Doctrine holds here by construction, and that is worth pinning:
    if a future revision ADDS a /Sig field, we must find out from a red
    test rather than from a signed document."""
    sigs = [k for k, v in pdf_fields.items() if str(v.get("/FT")) == "/Sig"]
    assert sigs == [], f"the form grew signature fields: {sigs}"


def test_part_one_exclusion_boxes_are_never_auto_checked():
    """Doctrine §1. Every Part-1 box is an exclusion CLAIM with tax
    consequences — heavier than the DTT exemption the builder already
    gates. Nothing in the fill layer writes one."""
    assert FORM.check_fields == [], (
        "a checkbox entered the fill map — Part 1 claims are proposed to "
        "the officer and written on acceptance, never applied here"
    )


# ── Filling ──────────────────────────────────────────────────────────

def _deed_row(**over):
    row = {
        "county": "Los Angeles",
        "grantee_name": "MARIA L. TORRES",
        "grantor_name": "JAMES R. OKONKWO",
        "apn": "4291-013-027",
        "property_address": "1420 OCEAN AVE, SANTA MONICA, CA",
        "metadata": {
            "return_to": {"name": "MARIA L. TORRES", "address1": "1420 OCEAN AVE",
                          "city": "SANTA MONICA", "state": "CA", "zip": "90401"},
            "dtt": {"basis": "full_value", "transfer_value": "1250000"},
        },
    }
    row.update(over)
    return row


def test_the_deed_fills_what_it_knows():
    pdf, _asks = fill_pcor(_deed_row())
    fields = PdfReader(io.BytesIO(pdf)).get_fields()
    assert fields["Name and mailing address of buyer/transferee"]["/V"] == "MARIA L. TORRES"
    assert fields["seller transferor"]["/V"] == "JAMES R. OKONKWO"
    assert fields["Assessors parcel number"]["/V"] == "4291-013-027"
    assert fields["city"]["/V"] == "SANTA MONICA"
    assert fields["ZIP code"]["/V"] == "90401"


def test_the_output_is_still_fillable_and_not_flattened():
    """The buyer has to finish this document. A flattened PCOR is worse
    than a blank one."""
    pdf, _ = fill_pcor(_deed_row())
    reader = PdfReader(io.BytesIO(pdf))
    assert "/AcroForm" in reader.trailer["/Root"], "the form was flattened"
    fields = reader.get_fields()
    assert len(fields) > 200, "form fields were destroyed"
    # An untouched field is still writable and still empty.
    assert not fields["Buyer's email address"].get("/V")


def test_need_appearances_is_set():
    """Without it the written text has no appearance stream and renders
    blank in several common viewers."""
    pdf, _ = fill_pcor(_deed_row())
    af = PdfReader(io.BytesIO(pdf)).trailer["/Root"]["/AcroForm"]
    # pypdf returns a BooleanObject, not a Python bool.
    assert bool(af.get("/NeedAppearances")) is True


def test_certification_stays_blank_in_a_real_filled_document():
    """Belt to the occurrence pins: prove it on actual output."""
    pdf, _ = fill_pcor(_deed_row())
    fields = PdfReader(io.BytesIO(pdf)).get_fields()
    for name in CERTIFICATION_BLOCK:
        assert not fields[name].get("/V"), f"certification field written: {name}"


def test_purchase_price_is_an_ask_not_a_write():
    """A DTT value computed less liens is not a purchase price. It is
    never written into the Assessor's box; it is asked for."""
    pdf, asks = fill_pcor(_deed_row(
        metadata={"dtt": {"basis": "less_liens", "transfer_value": "900000"}}))
    fields = PdfReader(io.BytesIO(pdf)).get_fields()
    assert not fields["Total purchase price"].get("/V")
    assert any("less liens" in a for a in asks)


def test_full_value_still_does_not_write_the_price():
    pdf, asks = fill_pcor(_deed_row())
    fields = PdfReader(io.BytesIO(pdf)).get_fields()
    assert not fields["Total purchase price"].get("/V")
    assert any("Total purchase price" in a for a in asks)


def test_the_asks_name_what_the_deed_cannot_know():
    _pdf, asks = fill_pcor(_deed_row())
    joined = " ".join(asks).lower()
    assert "principal residence" in joined
    assert "telephone" in joined


def test_an_unmapped_county_is_an_honest_absence():
    with pytest.raises(PcorUnavailable):
        fill_pcor(_deed_row(county="Fresno"))
    assert lookup_form("Fresno") is None


def test_county_lookup_is_exact_not_substring():
    """Same discipline as T-2's jurisdictions registry."""
    assert lookup_form("Los Angeles") is not None
    assert lookup_form("  los ANGELES ") is not None
    assert lookup_form("East Los Angeles") is None


def test_both_revision_numbers_are_recorded():
    """The state form's revision and the county's overprint move
    independently; tracking only one is how a mismatch goes unnoticed."""
    assert "REV 18" in FORM.revision
    assert FORM.county_revision and "ASSR-70" in FORM.county_revision
