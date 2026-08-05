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
from typing import Optional

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
    """RED-S2: RESTRICT, not CASCADE — and see database.py for the why.

    This CREATE is a second copy of a statement that also lives in
    `database.create_tables()`, which is the one schema authority (H1).
    It exists because db.py calls it at import to guarantee the table
    before anything reads it. Both copies now say RESTRICT; if they ever
    disagree again, a pinned test fails.
    """
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS deed_pdfs (
                deed_id INTEGER PRIMARY KEY REFERENCES deeds(id) ON DELETE RESTRICT,
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
    # RED-S4: which rate table produced this deed's number.
    #
    # RED0 R3-3 — the officer's confirmation records that she accepted A
    # NUMBER; nothing recorded which schedule produced it. A deed
    # generated under last March's rate is indistinguishable from one
    # generated today, so the audit trail cannot answer the only question
    # a dispute asks: was this the right rate ON THAT DATE.
    #
    # Both the human version string and the content fingerprint are
    # stamped. The version is a promise someone remembered to update; the
    # fingerprint is the machine's check on that promise, and the pair
    # disagreeing is itself the signal.
    try:
        from services.jurisdictions import REGISTRY_VERSION, registry_fingerprint
        rates = {"rate_registry_version": REGISTRY_VERSION,
                 "rate_registry_fingerprint": registry_fingerprint()}
    except Exception as e:
        # Never block a deed on a provenance stamp — but never pretend it
        # is there either.
        rates = {"rate_registry_version": None,
                 "rate_registry_error": f"{type(e).__name__}"}
    stamp = json.dumps({
        "pdf_sha256": digest,
        "pdf_generated_at": datetime.now(timezone.utc).isoformat(),
        **rates,
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

    # RED-S2: the second copy.
    #
    # Until this ticket, the line above was the ONLY place a generated
    # instrument existed. Losing the database lost every deed and the
    # sha256 that made each one verifiable, in one event.
    #
    # Written AFTER the commit, deliberately. The database row is the
    # system of record; a store that is slow or down must not hold up an
    # officer's deed, and a rolled-back transaction must not leave an
    # orphan artifact claiming to be an instrument that was never stored.
    #
    # The failure is RECORDED, not swallowed (invariant #4). The
    # precedent is the email path: a failed send does not lose the lead,
    # it writes `notify_error` on the row so the queue shows it flagged.
    # Same shape here — `artifact_error` on the deed's metadata, and a
    # loud log. An officer is never blocked by it; an operator can always
    # find it.
    _mirror_to_artifact_store(conn, deed_id, pdf_bytes, digest)
    return digest


def _mirror_to_artifact_store(conn, deed_id: int, pdf_bytes: bytes, digest: str):
    from services.artifact_store import artifact_key, get_store

    key = artifact_key(deed_id, digest)
    try:
        store = get_store()
        store.put(key, pdf_bytes)
        note = json.dumps({"artifact_key": key, "artifact_store": store.name,
                           "artifact_error": None})
    except Exception as e:
        # Loud, recorded, and non-blocking — in that order.
        print(f"[artifact-store] ❌ SECOND COPY FAILED for deed {deed_id} "
              f"({key}): {type(e).__name__}: {e}")
        note = json.dumps({"artifact_key": key, "artifact_store": None,
                           "artifact_error": f"{type(e).__name__}: {str(e)[:300]}"})

    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE deeds
                SET metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb
                WHERE id = %s
            """, (note, deed_id))
            conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print(f"[artifact-store] could not record mirror state for deed "
              f"{deed_id}: {e}")


def read_stored_pdf(conn, deed_id: int) -> Optional[bytes]:
    """The stored instrument, from the database or the second copy.

    Order matters and is the opposite of what you might expect: the
    DATABASE is tried first, because it is the system of record and its
    bytes are the ones the sha256 was computed over at generation. The
    object store is the fallback for exactly the case this ticket exists
    for — the row is gone or unreadable.

    Both paths hash-verify before returning. A second copy that returns
    the wrong bytes is worse than one that returns nothing, because the
    caller would have no way to tell.
    """
    from services.artifact_store import artifact_key, get_store, verify

    stored_sha = None
    with conn.cursor() as cur:
        cur.execute("SELECT pdf_data, sha256 FROM deed_pdfs WHERE deed_id = %s",
                    (deed_id,))
        row = cur.fetchone()
        if row:
            data = bytes(row["pdf_data"] if isinstance(row, dict) else row[0])
            stored_sha = row["sha256"] if isinstance(row, dict) else row[1]
            if verify(data, stored_sha):
                return data
            print(f"[artifact-store] ⚠️ deed {deed_id}: stored bytes do NOT "
                  f"match their recorded sha256 — falling back to the "
                  f"second copy")

    if not stored_sha:
        with conn.cursor() as cur:
            cur.execute("SELECT metadata->>'pdf_sha256' AS s FROM deeds WHERE id = %s",
                        (deed_id,))
            r = cur.fetchone()
            stored_sha = (r["s"] if isinstance(r, dict) else r[0]) if r else None
    if not stored_sha:
        return None

    data = get_store().get(artifact_key(deed_id, stored_sha))
    if data is not None and verify(data, stored_sha):
        return data
    return None


def generate_and_store(conn, row) -> str:
    """Render the PDF for a deed row and persist it. Returns the sha256."""
    pdf_bytes = render_deed_pdf(row)
    return store_deed_pdf(conn, row["id"], pdf_bytes)
