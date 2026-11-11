"""P04: contact-free request and approval evidence; never identity proof.

Legacy content_hash remains the legacy JSON serialization digest. This module
adds a separate, named scheme; it never repairs or replaces historical hashes.
"""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json

SNAPSHOT_VERSION = "api-contact-free-request/1"
EVIDENCE_VERSION = "api-approval-evidence/1"


def canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False, allow_nan=False)


def digest(value) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def without_contact(payload):
    """Only the dedicated field, not email-like text in legal facts."""
    if isinstance(payload, str):
        payload = json.loads(payload)
    if not isinstance(payload, dict):
        raise ValueError("Request snapshot must be an object")
    result = deepcopy(payload)
    if isinstance(result.get("approver"), dict):
        result["approver"].pop("email", None)
    return result


def request_snapshot(request, *, execution_date: str):
    payload = without_contact(request.model_dump(mode="json"))
    payload["_execution_date"] = execution_date
    return payload


def validate_snapshot(row):
    """No retroactive version assignment or hash check for legacy snapshots."""
    version = row.get("request_snapshot_version")
    if version is None:
        return
    payload = row.get("request_data") or {}
    if isinstance(payload, str):
        payload = json.loads(payload)
    if (version != SNAPSHOT_VERSION or payload != without_contact(payload)
            or digest(payload) != row.get("request_snapshot_sha256")):
        raise ValueError("Request evidence integrity check failed")


def utc(value: datetime) -> str:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("Evidence event time must be timezone-aware")
    return value.astimezone(timezone.utc).isoformat()


def approval_evidence(row, *, pdf_sha256: str, approved_at: datetime,
                      license_claimed, client_digest_supplied: bool,
                      server_declarations):
    validate_snapshot(row)
    snapshot = without_contact(row.get("request_data") or {})
    return {
        "version": EVIDENCE_VERSION,
        "deed_id": row["deed_id"], "document_id": row["document_id"],
        "deed_type": row["deed_type"],
        "request_snapshot": snapshot,
        "request_snapshot_sha256": digest(snapshot),
        "request_snapshot_origin": (SNAPSHOT_VERSION if row.get("request_snapshot_version")
                                    else "legacy-request-projected-at-approval"),
        "pdf_sha256": pdf_sha256,
        "claimed_approver": {"name": row.get("approver_name"),
                             "role": row.get("approver_role"),
                             "license_claimed": license_claimed},
        "approved_at": utc(approved_at),
        "source": "confirmation-token-approve-request",
        "identity_verified": False,
        "client_pdf_digest_supplied": bool(client_digest_supplied),
        # The server cannot attest which UI a bearer client rendered/read.
        # Record the current artifact wording, not a fictional display event.
        "server_artifact_declarations": list(server_declarations),
        "displayed_declaration": None,
        "display_attested": False,
    }


def legacy_transition_plan(row, *, legacy_content_hash, prepared_at: datetime):
    """Pure owner-review proposal. No writes, approval backfill, or erasure.

    Even a matching pre-transition hash is tied to the legacy serialization;
    the redacted snapshot cannot later verify that original digest.
    """
    from utils.short_code import generate_content_hash
    payload = row.get("request_data") or {}
    if isinstance(payload, str):
        payload = json.loads(payload)
    original_matches = (generate_content_hash(json.dumps(payload, default=str))
                        == legacy_content_hash) if legacy_content_hash else None
    snapshot = without_contact(payload)
    return {
        "version": "api-legacy-contact-transition-plan/1",
        "deed_id": row["deed_id"], "prepared_at": utc(prepared_at),
        "original_content_hash": legacy_content_hash,
        "original_hash_matches_current_serialization": original_matches,
        "proposed_snapshot": snapshot, "proposed_snapshot_sha256": digest(snapshot),
        "original_hash_verifiable_from_redacted_snapshot": False,
        "approval_event_created": False, "applied": False,
        "requires_owner_batch_approval": True,
    }
