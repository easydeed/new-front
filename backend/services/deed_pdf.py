"""Render and store PDFs for saved deed records (stored-PDF pipeline).

A deed's PDF is rendered once at generation time, persisted in the deed_pdfs
table (BYTEA, same pattern as api_deeds.pdf_data), and streamed by
GET /deeds/{id}/download. Legacy rows without a stored PDF are rendered and
stored on first download. Column names follow the live production schema:
grantor_name/grantee_name (the phase-11 rename never ran).
"""
import hashlib
import json
import os
from datetime import datetime, timezone

import psycopg2
from jinja2 import Environment, FileSystemLoader, select_autoescape

from pdf_engine import render_pdf

TEMPLATE_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "templates")

_env = Environment(
    loader=FileSystemLoader(TEMPLATE_ROOT),
    autoescape=select_autoescape(["html", "xml", "jinja2"]),
)
try:
    from filters import shrink_to_fit, hyphenate_soft
    _env.filters["hyphenate_soft"] = hyphenate_soft
    _env.filters["shrink_to_fit"] = shrink_to_fit
except ImportError:
    pass

TEMPLATE_BY_DEED_TYPE = {
    "grant-deed": "grant_deed_ca/index.jinja2",
    "grant_deed": "grant_deed_ca/index.jinja2",
    "quitclaim-deed": "quitclaim_deed_ca/index.jinja2",
    "quitclaim": "quitclaim_deed_ca/index.jinja2",
    "interspousal-transfer": "interspousal_transfer_ca/index.jinja2",
    "warranty-deed": "warranty_deed_ca/index.jinja2",
    "tax-deed": "tax_deed_ca/index.jinja2",
    # FORMS-SPIKE: first non-deed instrument on the chassis.
    "affidavit-death-jt": "affidavit_death_jt_ca/index.jinja2",
    # FORMS wave 1 — affidavit siblings (PCT references #3 and #7).
    "affidavit-death-cp-spouse": "affidavit_death_cp_spouse_ca/index.jinja2",
    "affidavit-death-trustee": "affidavit_death_trustee_ca/index.jinja2",
    # FORMS wave 2 — domestic-partner variants (PCT references #5 and #2).
    "affidavit-death-jt-dp": "affidavit_death_jt_dp_ca/index.jinja2",
    "affidavit-death-cp-dp": "affidavit_death_cp_dp_ca/index.jinja2",
    # FORMS wave 1 — fixed-vesting deed variants (PCT references #28, #21).
    "grant-deed-jt": "grant_deed_jt_ca/index.jinja2",
    "grant-deed-cp-ros": "grant_deed_cp_ros_ca/index.jinja2",
    # FORMS wave 1 — declaration family (PCT reference #33; CCP §704.930).
    "homestead-declaration": "homestead_declaration_ca/index.jinja2",
    # FORMS wave 1 #6 — property-less (PCT reference #72; Prob C §18100.5).
    "trust-certification": "trust_certification_ca/index.jinja2",
    # FORMS wave 1 #7 — statutory revocation form (Prob C §§5600/5644).
    "tod-revocation": "tod_revocation_ca/index.jinja2",
    # FORMS wave 2 — homestead pair (PCT references #34 and #32).
    "homestead-declaration-spouses": "homestead_declaration_spouses_ca/index.jinja2",
    "homestead-abandonment": "homestead_abandonment_ca/index.jinja2",
    # FORMS wave 2 #6 — entity grantors (PCT references #22 and #29).
    "grant-deed-corp": "grant_deed_corp_ca/index.jinja2",
    "grant-deed-partnership": "grant_deed_partnership_ca/index.jinja2",
    # FORMS wave 2 #7 — statutory POA (Prob C §4401; PCT reference #55).
    "poa-statutory": "poa_statutory_ca/index.jinja2",
    # FORMS wave 2 #8 — substitution of trustee (PCT reference #20).
    "trustee-substitution": "trustee_substitution_ca/index.jinja2",
}
DEFAULT_TEMPLATE = "grant_deed_ca/index.jinja2"


def _map_dtt(raw):
    """Map the builder's DTT shape (stored in deeds.metadata) to the template's."""
    if not isinstance(raw, dict):
        return None
    amount = raw.get("calculated_amount") or raw.get("amount") or ""
    if raw.get("is_exempt"):
        amount = "0.00"
    if not (amount or raw.get("city_name") or raw.get("is_exempt")):
        return None
    return {
        "amount": str(amount).lstrip("$"),
        "basis": "less_liens" if raw.get("basis") == "less_liens" else "full",
        "area_type": raw.get("area_type") or "unincorporated",
        "city_name": raw.get("city_name") or "",
        "is_exempt": bool(raw.get("is_exempt")),
        "exemption_reason": raw.get("exemption_reason") or "",
    }


def build_context_from_row(row):
    """Template context from a deeds row (dict) + its metadata JSONB extras."""
    meta = row.get("metadata") or {}
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except ValueError:
            meta = {}

    return_to = meta.get("return_to")
    if isinstance(return_to, str) and return_to.strip():
        # The builder stores return_to as a bare name; the template expects a dict.
        return_to = {"name": return_to.strip()}
    elif not isinstance(return_to, dict):
        return_to = None

    return {
        "grantors_text": row.get("grantor_name") or "",
        "grantees_text": row.get("grantee_name") or "",
        "legal_description": row.get("legal_description") or "",
        "county": row.get("county") or "",
        "apn": row.get("apn") or "",
        # Street address — the homestead abandonment's "commonly known as"
        # line (other chassis templates don't read it).
        "property_address": row.get("property_address") or "",
        "vesting": row.get("vesting") or "",
        "requested_by": row.get("requested_by") or "",
        "requested_by_address": meta.get("requested_by_address") or "",
        "title_order_no": meta.get("title_order_no") or "",
        "escrow_no": meta.get("escrow_no") or "",
        "return_to": return_to,
        "dtt": _map_dtt(meta.get("dtt")),
        # FORMS-SPIKE: the affidavit's officer-supplied facts (decedent,
        # JT-deed recording reference, affiant) ride in metadata.affidavit.
        "affidavit": meta.get("affidavit") if isinstance(meta.get("affidavit"), dict) else None,
        # FORMS parties migration: single-party instruments' named parties
        # (deeds.parties JSONB) — e.g. the homestead declarant.
        "parties": row.get("parties") if isinstance(row.get("parties"), dict) else None,
        "exhibit_threshold": 600,
        "execution_date": None,
        "now": datetime.now,
    }


def render_deed_html(row) -> str:
    template_name = TEMPLATE_BY_DEED_TYPE.get(
        (row.get("deed_type") or "").strip().lower(), DEFAULT_TEMPLATE
    )
    return _env.get_template(template_name).render(**build_context_from_row(row))


def render_deed_pdf(row) -> bytes:
    return render_pdf(render_deed_html(row))


def ensure_deed_pdfs_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS deed_pdfs (
                deed_id INTEGER PRIMARY KEY REFERENCES deeds(id) ON DELETE CASCADE,
                pdf_data BYTEA NOT NULL,
                sha256 VARCHAR(64) NOT NULL,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


class StoredPdfConflict(Exception):
    """A different artifact is already stored for this deed.

    Raised instead of overwriting. Carries both hashes so the operator
    sees what would have been destroyed.
    """

    def __init__(self, deed_id: int, stored_sha256: str, incoming_sha256: str):
        self.deed_id = deed_id
        self.stored_sha256 = stored_sha256
        self.incoming_sha256 = incoming_sha256
        super().__init__(
            f"Deed {deed_id} already has a stored PDF with a different hash "
            f"(stored {stored_sha256[:12]}…, incoming {incoming_sha256[:12]}…). "
            "Refusing to overwrite a recorded instrument — a correction must "
            "supersede the original, not replace it."
        )


def store_deed_pdf(conn, deed_id: int, pdf_bytes: bytes) -> str:
    """Persist the PDF bytes and stamp pdf_url + sha256 on the deed row.

    INSERT-OR-REFUSE (doctrine §9, ADMIN1). This was
    `ON CONFLICT DO UPDATE SET pdf_data = EXCLUDED.pdf_data`, which
    replaced the stored bytes AND their sha256 in place. `deed_pdfs` is
    keyed by deed_id — one row per deed — so the prior artifact was
    simply gone, with nothing recording that it had existed.

    That hash is the verification substrate: doctrine §3 removed QR
    codes from recorded pages on the reasoning that "verification
    survives as data," and the data is this column. A silent overwrite
    invalidates every prior verification of the document and leaves no
    trace that anything changed.

    So: re-storing identical bytes is a no-op (idempotent regeneration
    is legitimate — the H1 self-heal path relies on it), and re-storing
    DIFFERENT bytes raises StoredPdfConflict for the caller to surface.
    Replacing an instrument is a supersession decision, not a storage
    detail; the supersession model is a separate ledgered ticket, and
    until it exists the honest answer is to refuse.
    """
    digest = hashlib.sha256(pdf_bytes).hexdigest()
    stamp = json.dumps({
        "pdf_sha256": digest,
        "pdf_generated_at": datetime.now(timezone.utc).isoformat(),
    })
    with conn.cursor() as cur:
        # DO NOTHING, not DO UPDATE: the insert is attempted atomically
        # and simply declines if a row already exists. Deliberately not a
        # SELECT-then-INSERT — two concurrent self-heal downloads would
        # both see "no row" and the second would hit a primary-key
        # violation. This way the loser of that race falls through to the
        # hash comparison below and, for identical bytes, succeeds.
        cur.execute("""
            INSERT INTO deed_pdfs (deed_id, pdf_data, sha256, generated_at)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (deed_id) DO NOTHING
            RETURNING deed_id
        """, (deed_id, psycopg2.Binary(pdf_bytes), digest))

        if cur.fetchone() is None:
            # Something is already stored. Identical bytes → no-op (the
            # deed row's stamp still refreshes below, so the H1 self-heal
            # path keeps working). Different bytes → refuse.
            cur.execute("SELECT sha256 FROM deed_pdfs WHERE deed_id = %s", (deed_id,))
            row = cur.fetchone()
            stored_sha = row[0] if row else None
            if stored_sha != digest:
                raise StoredPdfConflict(deed_id, stored_sha or "unknown", digest)
        cur.execute("""
            UPDATE deeds
            SET pdf_url = %s,
                metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb,
                status = CASE WHEN COALESCE(status, '') = 'deleted'
                              THEN status ELSE 'completed' END,
                completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
            WHERE id = %s
        """, (f"/deeds/{deed_id}/download", stamp, deed_id))
        conn.commit()
    return digest


def generate_and_store(conn, row) -> str:
    """Render the PDF for a deed row and persist it. Returns the sha256."""
    pdf_bytes = render_deed_pdf(row)
    return store_deed_pdf(conn, row["id"], pdf_bytes)
