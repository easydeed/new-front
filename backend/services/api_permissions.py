"""Owner-approved P05 permissions. Candidate only: existing-key cutover held.

One registry serves HTTP handlers, direct internal calls and admin issuance.
Scopes never imply ownership, another scope, or a new public endpoint.
"""
from fastapi import HTTPException

OPERATIONS = {
    "deed.create": "deed:create",
    "deed.read": "deed:read",
    "deed.list": "deed:read",
    "deed.pdf": "deed:pdf",
    "deed.handoff": "deed:handoff",
    "tax.calculate": "tax:calculate",
}
RESERVED_SCOPES = frozenset({"deed:evidence", "usage:read"})
ACTIVE_SCOPES = tuple(sorted(set(OPERATIONS.values())))


def validate_scopes(scopes):
    """Require an explicit exact vocabulary; no normalization or wildcard."""
    if (not isinstance(scopes, list) or any(not isinstance(s, str) or s not in ACTIVE_SCOPES for s in scopes)
            or len(scopes) != len(set(scopes))):
        raise HTTPException(422, detail={
            "code": "INVALID_SCOPES",
            "message": "Select explicit unique supported permissions",
            "allowed_scopes": list(ACTIVE_SCOPES),
        })
    return list(scopes)


def permits(api_key, operation):
    scope = OPERATIONS.get(operation)
    scopes = api_key.get("scopes") if isinstance(api_key, dict) else None
    # Treat malformed legacy shapes as no grant, not substring membership.
    return bool(scope and isinstance(scopes, list) and scope in scopes)


def require_operation(api_key, operation):
    if not permits(api_key, operation):
        raise HTTPException(403, detail={
            "code": "INSUFFICIENT_SCOPE",
            "message": "API key does not permit this operation",
            "details": {"operation": operation, "required_scope": OPERATIONS.get(operation)},
        })


def permission_catalog():
    return {"scopes": list(ACTIVE_SCOPES), "operations": dict(OPERATIONS),
            "reserved_unavailable": sorted(RESERVED_SCOPES)}
