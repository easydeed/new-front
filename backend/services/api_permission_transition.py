"""P05 read-only inventory and pure rehearsal; never activates a cutover."""
import re
from copy import deepcopy
from uuid import UUID

from services.api_permissions import ACTIVE_SCOPES, validate_scopes


def inventory(conn):
    """Aggregate storage facts, not inferred customer grants or live findings."""
    with conn.cursor() as cur:
        cur.execute("""SELECT COUNT(*) AS total_keys,
            COUNT(*) FILTER (WHERE is_active IS TRUE) AS active_keys,
            COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) AS timestamped_keys,
            COUNT(*) FILTER (WHERE is_active IS TRUE AND revoked_at IS NOT NULL) AS active_with_revocation,
            COUNT(*) FILTER (WHERE scopes IS NULL) AS null_scopes,
            COUNT(*) FILTER (WHERE cardinality(scopes)=0) AS empty_scopes,
            COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM unnest(scopes) s WHERE s IS NULL OR NOT (s=ANY(%s)))) AS unknown_scopes,
            COUNT(*) FILTER (WHERE cardinality(scopes)<>(SELECT COUNT(DISTINCT s) FROM unnest(scopes) s)) AS duplicate_or_null_scopes
            FROM api_keys""", (list(ACTIVE_SCOPES),))
        counts = dict(cur.fetchone())
        cur.execute("""SELECT COUNT(*) AS records_without_key_owner FROM api_deeds d
            WHERE d.api_key_id IS NULL OR NOT EXISTS (SELECT 1 FROM api_keys k WHERE k.id=d.api_key_id)""")
        counts.update(dict(cur.fetchone()))
    return {"counts": {key: int(value) for key, value in counts.items()},
            "cutover_authorized": False, "manifest_required": True}


def plan_manifest(keys, decisions):
    """Explicit all-key decisions, never guessed from a label or organization.

    Caller supplies review metadata only, not credentials. The return value
    is a synthetic/dry plan with original scope/state for a reversal rehearsal;
    there is intentionally no executable application function.
    """
    def identifier(value):
        try:
            return str(UUID(value))
        except (ValueError, TypeError, AttributeError):
            raise ValueError("A valid opaque key ID is required") from None

    records = {}
    for row in keys:
        if set(row) != {"key_id", "scopes", "is_active", "revoked_at"}:
            raise ValueError("Only non-secret key review fields are allowed")
        key_id = identifier(row['key_id'])
        if key_id in records:
            raise ValueError("Duplicate key review ID")
        records[key_id] = row
    choices = {}
    for decision in decisions:
        if set(decision) != {"key_id", "approved_scopes", "owner_reference"}:
            raise ValueError("Explicit scopes and an opaque owner reference are required")
        key_id = identifier(decision['key_id'])
        if key_id in choices:
            raise ValueError("Duplicate owner decision")
        reference = decision['owner_reference']
        if (not isinstance(reference, str) or not re.fullmatch(r'[A-Za-z0-9._:-]{1,120}', reference)
                or reference.startswith(('dp_test_', 'dp_live_'))):
            raise ValueError("Use a bounded opaque owner reference, not contact or credentials")
        scopes = validate_scopes(decision['approved_scopes'])
        choices[key_id] = (scopes, reference)
    if records.keys() != choices.keys():
        raise ValueError("Every reviewed key requires exactly one explicit owner decision")
    plan = []
    for key_id, row in records.items():
        scopes, reference = choices[key_id]
        if row['revoked_at'] is not None and scopes:
            raise ValueError("A revoked key cannot receive an active grant")
        plan.append({"key_id": key_id, "owner_reference": reference,
                     "before": {"scopes": deepcopy(row['scopes']), "is_active": row['is_active'],
                                "revoked_at": row['revoked_at']},
                     "proposed_scopes": scopes})
    return {"apply_allowed": False, "customer_ownership_changed": False,
            "legacy_behavior_recreated": False, "plan": plan}
