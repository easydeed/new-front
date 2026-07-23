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
        "vesting": row.get("vesting") or "",
        "requested_by": row.get("requested_by") or "",
        "title_order_no": meta.get("title_order_no") or "",
        "escrow_no": meta.get("escrow_no") or "",
        "return_to": return_to,
        "dtt": _map_dtt(meta.get("dtt")),
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


def store_deed_pdf(conn, deed_id: int, pdf_bytes: bytes) -> str:
    """Persist the PDF bytes and stamp pdf_url + sha256 on the deed row."""
    digest = hashlib.sha256(pdf_bytes).hexdigest()
    stamp = json.dumps({
        "pdf_sha256": digest,
        "pdf_generated_at": datetime.now(timezone.utc).isoformat(),
    })
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO deed_pdfs (deed_id, pdf_data, sha256, generated_at)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (deed_id) DO UPDATE
                SET pdf_data = EXCLUDED.pdf_data,
                    sha256 = EXCLUDED.sha256,
                    generated_at = CURRENT_TIMESTAMP
        """, (deed_id, psycopg2.Binary(pdf_bytes), digest))
        cur.execute("""
            UPDATE deeds
            SET pdf_url = %s,
                metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb
            WHERE id = %s
        """, (f"/deeds/{deed_id}/download", stamp, deed_id))
        conn.commit()
    return digest


def generate_and_store(conn, row) -> str:
    """Render the PDF for a deed row and persist it. Returns the sha256."""
    pdf_bytes = render_deed_pdf(row)
    return store_deed_pdf(conn, row["id"], pdf_bytes)
