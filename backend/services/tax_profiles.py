"""Deliberately closed profile registry. Activation requires code/domain review.

No environment switch, caller-supplied approval, guessed county fallback, or
existing municipal rate entry can activate a legal declaration workflow.
"""
import json
from pathlib import Path

from fastapi import HTTPException

from services.tax_instructions import CONTRACT_VERSION

REGISTRY_PATH = Path(__file__).with_suffix(".json")


def disabled_registry():
    data = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    if data != {"contract_version": CONTRACT_VERSION,
                "release_state": "domain_review_required", "profiles": {}}:
        raise RuntimeError("Tax profiles cannot be activated in the v2 preparation")
    return data


def require_reviewed_profile(profile_id: str):
    disabled_registry()  # Malformed or changed config fails closed too.
    raise HTTPException(409, detail={
        "code": "TAX_PROFILE_REVIEW_REQUIRED",
        "message": "No county tax-declaration profile is approved. Generation is unavailable.",
        "details": [{"field": "body.transfer_tax.profile_id",
                     "message": "Domain review and separate release approval are required"}],
    })
