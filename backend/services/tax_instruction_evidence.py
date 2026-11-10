"""Pure receipt preparation, not acceptance, identity or filing evidence.

Not persisted while v2 is disabled. Contact never enters this snapshot. The
later approval record must bind actual displayed wording and preview bytes.
"""
import hashlib
import json
from datetime import datetime, timezone

from services.tax_instructions import CONTRACT_VERSION


def instruction_receipt(request, *, received_at: datetime):
    if received_at.tzinfo is None or received_at.utcoffset() is None:
        raise ValueError("Receipt time must be timezone-aware")
    instructions = request.transfer_tax.model_dump(mode="json", exclude_unset=True)
    canonical = json.dumps(instructions, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return {
        "contract_version": CONTRACT_VERSION,
        "original_instructions": instructions,
        "instruction_sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        "source": "api_v2_request",
        "claimed_actor": {"name": request.approver.name, "role": request.approver.role},
        "identity_verified": False,
        "received_at": received_at.astimezone(timezone.utc).isoformat(),
        "reviewed_profile_version": None,
        "approval": None,
        "displayed_declaration": None,
        "preview_sha256": None,
    }
