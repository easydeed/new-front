"""PARTNER1 — the partner's address reaches the recorded document.

═══ THE BUG THIS PINS ═══

D2 wired the partner address end to end: `partners/selectlist` assembles
a one-line mailing address, `RecordingSection` fills `requestedByAddress`
when a partner is chosen, and all five chassis print it in the Recording
Requested By block.

Every link worked. The address was empty anyway, because the Partners
SCREEN never captured it — the columns existed, the API accepted them,
the service wrote them, and the form rendered six inputs, none of which
was an address.

So the interesting property is not "does a column exist". It is:

    a partner the officer actually created, carried through the actual
    assembly the dropdown uses, ends up as ink on the actual PDF.

Every step below is the shipped code path. The one thing this file does
NOT exercise is the browser form, which is pinned in
`frontend/src/__tests__/partnersScreen.test.ts` — the two halves meet at
the API payload, and the payload is asserted on both sides.
"""
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

import pytest

from routers.partners import partner_address_line  # noqa: E402
from services.partners import normalize_partner_fields  # noqa: E402
from tests.source_text import code_only  # noqa: E402

REPO = BACKEND.parent

needs_db = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="needs a database for the executable pins")


# ── 1. Normalization: whitespace yes, case never ─────────────────────

def test_whitespace_is_collapsed_because_it_prints():
    """'  Pacific  Coast   Title ' becomes a line on a recorded deed."""
    out = normalize_partner_fields({
        "company_name": "  Pacific  Coast   Title ",
        "address_line1": " 1234   Wilshire Blvd  ",
        "city": "  Los  Angeles ",
    })
    assert out["company_name"] == "Pacific Coast Title"
    assert out["address_line1"] == "1234 Wilshire Blvd"
    assert out["city"] == "Los Angeles"


def test_case_is_never_touched():
    """THE ruling in this helper. 'COast TItle' is owner data to correct
    by hand; auto-casing would also rewrite PCT, McDonald, LLC and
    O'Brien. Surfacing a typo costs a glance — corrupting a company name
    costs a re-recording."""
    for name in ("COast TItle", "PCT", "McDonald Escrow", "O'Brien & Sons LLC"):
        assert normalize_partner_fields({"company_name": name})["company_name"] == name


def test_blank_collapses_to_none_so_a_cleared_field_actually_clears():
    assert normalize_partner_fields({"address_line1": "   "})["address_line1"] is None


def test_only_present_keys_are_touched():
    """`update_partner` builds its SET clause from which keys EXIST, so
    inventing keys here would overwrite columns the caller never named —
    an edit of the phone number silently blanking the address."""
    out = normalize_partner_fields({"phone": " 555 "})
    assert set(out) == {"phone"}


def test_state_is_upper_cased_and_that_is_not_a_spelling_judgement():
    """A two-letter jurisdiction code is not somebody's name."""
    assert normalize_partner_fields({"state": " ca "})["state"] == "CA"


# ── 2. The assembly the dropdown actually uses ───────────────────────

def test_the_selectlist_assembles_a_mailing_address():
    line = partner_address_line({
        "address_line1": "1234 Wilshire Blvd", "address_line2": "Suite 500",
        "city": "Los Angeles", "state": "CA", "postal_code": "90017",
    })
    assert line == "1234 Wilshire Blvd Suite 500, Los Angeles, CA 90017"


def test_a_partner_with_no_address_assembles_to_empty_not_to_punctuation():
    """The failure mode that would reach a deed as ', ,' — a blank that
    looks like data. Empty must be empty."""
    assert partner_address_line(
        {"address_line1": None, "city": None, "state": None, "postal_code": None}) == ""


def test_the_frontend_mirrors_the_same_assembly():
    """The table shows the officer an address; the deed prints one. If
    those are built by two rules they will differ, and the one she
    checked is not the one that recorded."""
    src = code_only((REPO / "frontend" / "src" / "app" / "partners" /
                     "page.tsx").read_text(encoding="utf-8"))
    assert "partnerAddressLine" in src
    for part in ("address_line1", "address_line2", "city", "state", "postal_code"):
        assert part in src


# ── 3. The form captures what the backend has always accepted ────────

ADDRESS_FIELDS = ("address_line1", "address_line2", "city", "state", "postal_code")


def test_the_partners_screen_seeds_and_renders_every_address_field():
    """THE bug, stated as a property. `blank()` did not seed these keys
    and no input rendered them, so the create payload could not contain
    an address no matter what the officer typed."""
    src = code_only((REPO / "frontend" / "src" / "app" / "partners" /
                     "page.tsx").read_text(encoding="utf-8"))
    blank = src[src.index("function blank()"):src.index("function save(")]
    for field in ADDRESS_FIELDS:
        assert field in blank, f"blank() does not seed {field}"
        assert f"editing.{field}" in src, f"no input is bound to {field}"


def test_the_other_two_intake_surfaces_still_capture_address():
    """QuickAddPartnerModal and AddPartnerModal always did. They are the
    reason the bug was survivable — and the reason it was confusing: the
    same partner got an address from inside the builder and none from the
    page built for managing partners."""
    for rel in (("features", "partners", "QuickAddPartnerModal.tsx"),
                ("components", "modals", "AddPartnerModal.tsx")):
        src = (REPO / "frontend" / "src").joinpath(*rel).read_text(encoding="utf-8")
        for field in ("address_line1", "city", "postal_code"):
            assert field in src, f"{rel[-1]} lost {field}"


# ── 4. End to end: partner row → assembled line → rendered PDF ───────

@needs_db
def test_the_address_reaches_the_generated_pdf():
    """The whole point, and the only test here that proves it.

    A partner is created through the shipped service, its address is
    assembled by the shipped endpoint helper, handed to the deed context
    the way the builder hands it over, and rendered. The assertion is on
    the DOCUMENT — extracted text, not a dict key.
    """
    from database import create_tables
    from services.partners import create_partner
    from services.deed_pdf import render_deed_pdf
    import psycopg2
    from db_rows import ROW_FACTORY

    create_tables()
    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (email, password_hash, full_name) VALUES "
            "('partner1@x.test','h','P1') ON CONFLICT (email) DO UPDATE "
            "SET full_name='P1' RETURNING id")
        uid = cur.fetchone()["id"]
    conn.close()

    partner = create_partner(f"user-{uid}", uid, {
        "company_name": "  Pacific  Coast Title ",
        "category": "title_company", "role": "title_officer",
        "address_line1": " 1234 Wilshire Blvd ", "address_line2": "Suite 500",
        "city": "Los Angeles", "state": "ca", "postal_code": "90017",
    })
    assert partner, "partner was not created"
    # Normalization happened at the write, and case survived it.
    assert partner["company_name"] == "Pacific Coast Title"
    assert partner["state"] == "CA"

    address = partner_address_line(partner)
    assert address == "1234 Wilshire Blvd Suite 500, Los Angeles, CA 90017"

    pdf = render_deed_pdf({
        "deed_type": "grant-deed",
        "property_address": "1420 Ocean Ave, Santa Monica, CA 90401",
        "apn": "4291-013-027", "county": "Los Angeles",
        "legal_description": "LOT 7 OF TRACT NO. 9021",
        "grantor_name": "JOHN A. DOE", "grantee_name": "JANE B. ROE",
        # Exactly what RecordingSection sends when a partner is chosen.
        "requested_by": partner["company_name"],
        "metadata": {"requested_by_address": address},
    })
    assert pdf and pdf[:4] == b"%PDF"

    text = _pdf_text(pdf)
    assert "Pacific Coast Title" in text, "the partner name is not on the deed"
    assert "1234 Wilshire Blvd" in text, "THE BUG: the address is not on the deed"
    assert "Los Angeles, CA 90017" in text


@needs_db
def test_a_partner_without_an_address_prints_no_orphan_line():
    """The other half of the honesty rule: an absent address must not
    render as a stray comma or an empty line under the company name."""
    from services.deed_pdf import render_deed_pdf

    pdf = render_deed_pdf({
        "deed_type": "grant-deed",
        "property_address": "1420 Ocean Ave, Santa Monica, CA 90401",
        "apn": "4291-013-027", "county": "Los Angeles",
        "legal_description": "LOT 7 OF TRACT NO. 9021",
        "grantor_name": "JOHN A. DOE", "grantee_name": "JANE B. ROE",
        "requested_by": "Pacific Coast Title",
        "metadata": {"requested_by_address": ""},
    })
    text = _pdf_text(pdf)
    assert "Pacific Coast Title" in text
    assert ", ," not in text


def _pdf_text(pdf_bytes: bytes) -> str:
    """Extracted text, via the reader the rest of the suite uses."""
    import io
    import pdfplumber
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        raw = " ".join((page.extract_text() or "") for page in pdf.pages)
    return " ".join(raw.split())
