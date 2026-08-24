"""The notary's documents exist, and a link nobody built cannot ship again.

═══ THE DEFECT ═══

`notary_package` has advertised `pcor_url` and `pdf_url` since NOTARY2
shipped. The notary's screen has rendered both as download buttons. **The
handlers were never written** — `routers/signing.py` had no PCOR route
and no PDF route at all, so both buttons were live 404s on a surface
whose audience has no account, no history and no way to tell a broken
product from a broken link.

NOTARY1 had working equivalents behind its own token. They were removed
in #170, which is how this surfaced: retiring a feature turned up its
replacement advertising a capability it had never built.

Owner-ruled BUILD rather than remove: the PCOR is real, it is filled from
the deed's own data, and the notary handing it to the buyer at the
signing table is the workflow.

═══ WHAT THESE PINS PROTECT ═══

 1. EVERY ADVERTISED URL RESOLVES. The class fix, and the one that would
    have caught this on the day it was written. A package that hands out
    a link the app cannot serve is a promise made by a surface that
    cannot keep it.

 2. THE TOKEN MEANS THE SAME THING ON EVERY URL. Withdrawn is 403 and
    expired is 410 on the deed, the PDF and the PCOR alike — "which URL
    did you ask" is not a property a permission may have.

 3. NOTARY-ONLY, ENFORCED SERVER-SIDE. `signer_package` omits the links,
    but a package that omits a link is presentation. A signer asking
    directly gets 404 — not 403, because "it exists but is not yours"
    turns a probe into an inventory.

 4. ONE DOCUMENT, TWO SURFACES, ONE SHAPE. The officer and the notary get
    the same availability body from the same module. Two copies of it had
    already drifted before this ticket.

 5. NOT STORED, NOT HASHED, NOT FLATTENED. Doctrine §9 freezes the
    instrument because the instrument is ours. The PCOR is the buyer's,
    they must sign it, and a frozen copy of somebody else's unfinished
    form is the wrong kind of faithful.
"""
from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
SURFACES = BACKEND / "services" / "signing_surfaces.py"

dbonly = pytest.mark.skipif(not os.getenv("DATABASE_URL"),
                            reason="needs a database")


def _routes():
    import main
    return {(m, getattr(r, "path", ""))
            for r in main.app.routes
            for m in (getattr(r, "methods", set()) or set())}


def _shape(path: str) -> str:
    """`/signing/{token}/pcor` and `/signing/{tok}/pcor` are one route.

    Both sides are normalised so the pin compares SHAPES: the name a
    package happens to give its f-string variable is not the property
    being checked.
    """
    return re.sub(r"\{[^}]*\}", "{}", path)


# ══════════════════════════════════════════════════════════════════════
# 1. Every advertised URL resolves — the class fix
# ══════════════════════════════════════════════════════════════════════

# The "every advertised URL resolves" pin was born here, scoped to this
# one module. It was ruled a CLASS and moved to
# `tests/test_link_contract.py`, which now sweeps every payload in the
# backend and — the half this file never had — every frontend page the
# backend puts in an email. Not duplicated here: one sweep, one place, and
# a narrower copy would go stale the day somebody widened the other.


def test_the_notary_documents_are_registered():
    routes = _routes()
    for expected in (("GET", "/signing/{token}/pcor"),
                     ("GET", "/signing/{token}/pcor.pdf"),
                     ("GET", "/signing/{token}/pdf")):
        assert expected in routes, f"{expected} is missing"


# ══════════════════════════════════════════════════════════════════════
# 2. One document, one shape
# ══════════════════════════════════════════════════════════════════════

def test_both_surfaces_build_the_status_body_from_one_module():
    """Two copies of this body existed before this ticket — one in
    `deeds_crud`, one in the NOTARY1 route retired in #170 — and they had
    already drifted in their filename. The ticket that added a third
    surface ends with one."""
    crud = code_only(BACKEND / "routers" / "deeds_crud.py")
    token = code_only(BACKEND / "routers" / "signing.py")
    for src, name in ((crud, "deeds_crud"), (token, "signing")):
        assert "pcor_offer.status(" in src, f"{name} builds its own body"
        assert "pcor_offer.download(" in src, f"{name} builds its own download"
    # And neither one reaches past the module to the form layer directly.
    for src, name in ((crud, "deeds_crud"), (token, "signing")):
        assert "values_from_deed" not in src, (
            f"{name} assembles the availability body itself again")


def test_the_pcor_is_never_stored_or_hashed():
    """Doctrine §9 freezes the stored instrument because the instrument
    is ours. The PCOR is the buyer's form — they must complete and sign
    it — and a frozen copy of somebody else's unfinished document is the
    wrong kind of faithful."""
    src = code_only(BACKEND / "services" / "pcor_offer.py")
    for forbidden in ("sha256", "INSERT INTO", "artifact", "store("):
        assert forbidden not in src, (
            f"the PCOR path grew a {forbidden!r} — it is generated on "
            "demand, handed over editable, and no copy is kept")


def test_a_county_with_no_form_says_so_rather_than_returning_a_blank():
    from services import pcor_offer

    # PCOR3 — the fixture now carries a `deed_type`, because a deed row
    # always does and this test's subject is the COUNTY answer. The
    # family gate is checked first and deliberately: "the PCOR does not
    # accompany this document" is prior to "we hold no copy for your
    # county", and answering the second on a homestead declaration would
    # imply the form applies and we merely lack it.
    body = pcor_offer.status({"county": "Nowhere", "deed_type": "grant-deed"}, "/x")
    assert body["available"] is False
    assert "Nowhere" in body["reason"]
    # Invariant #4: the reader learns WHICH of "we cannot" and "there is
    # nothing" applies.
    assert "still_needed" not in body


def test_the_status_body_offers_asks_and_not_a_percentage():
    """We fill nine text fields of sixty-five. "80% prefilled" would be a
    claim nothing supports, and every claim this product makes has to
    trace to something real."""
    src = code_only(BACKEND / "services" / "pcor_offer.py")
    assert "%" not in src.replace("%s", "")
    assert "percent" not in src.lower()


def test_the_caller_supplies_its_own_download_url():
    """An officer's link and a notary's link are scoped differently and
    must never be handed each other's URL."""
    from services import pcor_offer

    src = code_only(BACKEND / "services" / "pcor_offer.py")
    assert "/deeds/" not in src and "/signing/" not in src, (
        "the shared module hardcoded one caller's URL")


# ══════════════════════════════════════════════════════════════════════
# 3. Against a real database — the token means one thing
# ══════════════════════════════════════════════════════════════════════

@pytest.fixture
def world():
    import psycopg2
    from database import create_tables
    from db_rows import ROW_FACTORY
    create_tables()
    conn = psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)
    conn.autocommit = True
    tag = uuid.uuid4().hex[:8]
    made = {}
    with conn.cursor() as cur:
        cur.execute("INSERT INTO users (email, password_hash, full_name, role) "
                    "VALUES (%s, 'x', 'Officer', 'user') RETURNING id",
                    (f"officer-{tag}@n2doc.test",))
        made["officer"] = cur.fetchone()["id"]
        cur.execute("""INSERT INTO deeds (user_id, deed_type, property_address,
                                          apn, grantor_name, grantee_name,
                                          county, status)
                       VALUES (%s, 'grant_deed', '9 Private Way, Los Angeles, CA',
                               '1234-567-890', 'A GRANTOR', 'A GRANTEE',
                               'Los Angeles', 'completed') RETURNING id""",
                    (made["officer"],))
        made["deed"] = cur.fetchone()["id"]
        cur.execute("""INSERT INTO signing_requests (deed_id, officer_user_id,
                                                     tz_name, expires_at)
                       VALUES (%s, %s, 'America/Los_Angeles', %s) RETURNING id""",
                    (made["deed"], made["officer"],
                     datetime.now(timezone.utc) + timedelta(days=14)))
        made["request"] = cur.fetchone()["id"]
        for role, name in (("notary", "Nora"), ("signer", "Sam")):
            cur.execute(
                """INSERT INTO signing_participants (signing_request_id, party_role,
                        display_name, email, token, expires_at)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, token""",
                (made["request"], role, name, f"{name.lower()}-{tag}@n2doc.test",
                 str(uuid.uuid4()),
                 datetime.now(timezone.utc) + timedelta(days=14)))
            row = cur.fetchone()
            made[f"{role}_token"] = row["token"]
            made[f"{role}_id"] = row["id"]
    made["conn"] = conn
    yield made
    conn.close()


def _public():
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@dbonly
def test_the_notary_gets_the_form_the_officer_would_get(world):
    """END TO END, and the point of the ticket: the button works."""
    body = _public().get(f"/signing/{world['notary_token']}/pcor")
    assert body.status_code == 200, body.text
    offer = body.json()
    assert offer["available"] is True
    assert offer["county"]
    # It points at its OWN download, not the officer's authenticated one.
    assert offer["url"] == f"/signing/{world['notary_token']}/pcor.pdf"


@dbonly
def test_the_filled_form_comes_back_as_a_pdf(world):
    got = _public().get(f"/signing/{world['notary_token']}/pcor.pdf")
    assert got.status_code == 200, got.text
    assert got.headers["content-type"] == "application/pdf"
    assert got.content.startswith(b"%PDF")
    # UNFLATTENED — the buyer still has to complete and sign it. A form
    # with no AcroForm is a picture of a form.
    assert b"/AcroForm" in got.content


@dbonly
def test_a_signer_cannot_reach_the_notarys_documents(world):
    """404, not 403. "It exists but is not yours" turns a probe into an
    inventory, and the signer's own link is perfectly valid."""
    public = _public()
    for url in (f"/signing/{world['signer_token']}/pcor",
                f"/signing/{world['signer_token']}/pcor.pdf",
                f"/signing/{world['signer_token']}/pdf"):
        assert public.get(url).status_code == 404, url


@dbonly
def test_the_signer_package_does_not_advertise_them_either(world):
    """The rule is enforced above; this is the presentation agreeing with
    it. A button a signer cannot use is a button they will press."""
    pkg = _public().get(f"/signing/{world['signer_token']}").json()
    assert "pcor_url" not in pkg
    assert "pdf_url" not in pkg


@dbonly
def test_a_withdrawn_link_stops_answering_on_every_url(world):
    """Ruling 2 as a class, carried onto NOTARY2's token: revocation that
    depends on which URL you ask is not revocation. #170 fixed exactly
    this gap on the review link."""
    with world["conn"].cursor() as cur:
        cur.execute("UPDATE signing_participants SET revoked_at = now() "
                    "WHERE id = %s", (world["notary_id"],))
    public = _public()
    token = world["notary_token"]
    for url in (f"/signing/{token}", f"/signing/{token}/pcor",
                f"/signing/{token}/pcor.pdf", f"/signing/{token}/pdf"):
        assert public.get(url).status_code == 403, url


@dbonly
def test_an_expired_link_stops_answering_on_every_url(world):
    with world["conn"].cursor() as cur:
        cur.execute("UPDATE signing_participants SET expires_at = now() - "
                    "INTERVAL '1 day' WHERE id = %s", (world["notary_id"],))
    public = _public()
    token = world["notary_token"]
    for url in (f"/signing/{token}", f"/signing/{token}/pcor",
                f"/signing/{token}/pcor.pdf", f"/signing/{token}/pdf"):
        assert public.get(url).status_code == 410, url


@dbonly
def test_a_deed_with_no_stored_pdf_says_so(world):
    """§4: a missing document is a stated condition, not an empty body
    somebody would mistake for a blank form."""
    got = _public().get(f"/signing/{world['notary_token']}/pdf")
    assert got.status_code == 404
    assert "not been generated" in got.text


@dbonly
def test_the_stored_bytes_are_what_the_notary_gets(world):
    """The document she notarises must be the document that was
    generated — not a re-render that could differ from it."""
    marker = b"%PDF-1.4\n% stored-instrument-" + uuid.uuid4().hex.encode()
    with world["conn"].cursor() as cur:
        cur.execute("INSERT INTO deed_pdfs (deed_id, pdf_data, sha256) "
                    "VALUES (%s, %s, %s)",
                    (world["deed"], psycopg2_binary(marker), "x" * 64))
    got = _public().get(f"/signing/{world['notary_token']}/pdf")
    assert got.status_code == 200, got.text
    assert got.content == marker


def psycopg2_binary(data: bytes):
    import psycopg2
    return psycopg2.Binary(data)
