"""P03 preparation only: no generation implementation and no production mount.

Tests mount this router in a synthetic app. Do not mount it in main without
the separate profile/form, acceptance evidence and release reviews.
"""
from fastapi import APIRouter, Depends, HTTPException

from routers.api_v1.router import PublicAPIRoute, get_api_key
from schemas.api_v2.deeds import PrepareDeedRequest
from services import tax_profiles
from services.tax_instructions import CONTRACT_VERSION

router = APIRouter(prefix="/api/v2", tags=["Prepared API v2"], route_class=PublicAPIRoute)


@router.get("/capabilities")
async def capabilities(api_key: dict = Depends(get_api_key)):
    tax_profiles.disabled_registry()
    return {"contract_version": CONTRACT_VERSION, "generation_enabled": False,
            "approved_tax_profiles": [], "release_state": "domain_review_required"}


@router.post("/deeds", status_code=409, responses={422: {"description": "Invalid explicit instructions"}})
async def prepare_deed(deed_request: PrepareDeedRequest, api_key: dict = Depends(get_api_key)):
    """Always refuses: structural validity is not domain or release approval."""
    tax_profiles.require_reviewed_profile(deed_request.transfer_tax.profile_id)
    # Independent release boundary even if a future edit opens the registry.
    # There is intentionally no renderer, deed persistence, or success URL.
    raise HTTPException(409, detail={
        "code": "V2_RELEASE_REVIEW_REQUIRED",
        "message": "V2 generation is not released; profile approval alone cannot enable it.",
    })
