"""
Partners Router
User-facing CRUD for Industry Partners (org-scoped)
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel, EmailStr
from auth import get_current_user_id
from services.partners import (
    list_partners,
    create_partner,
    get_partner,
    update_partner,
    delete_partner
)

router = APIRouter()


# Pydantic schemas
class PartnerCreate(BaseModel):
    company_name: str
    category: Optional[str] = 'other'
    role: Optional[str] = 'other'
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = True


class PartnerUpdate(BaseModel):
    company_name: Optional[str] = None
    category: Optional[str] = None
    role: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


def partner_address_line(p) -> str:
    """The partner's mailing address as ONE line, for the deed.

    PARTNER1 lifted this out of the selectlist endpoint's closure. It was
    a nested function, so the only way to test what actually prints on a
    deed was to render one — the same reason the SiteX mapping went
    untested for months (DX0 §0). A rule that ends up as ink on a
    recorded instrument should be reachable by a test that does not need
    a PDF.

    Empty in, empty out: a partner with no address must assemble to "",
    never to stray punctuation. ", ," on a recorded document reads as
    data that got lost, and it is worse than a blank because it is
    visible.
    """
    street = " ".join(str(p.get(k) or "").strip()
                      for k in ("address_line1", "address_line2")).strip()
    locality = " ".join(str(p.get(k) or "").strip()
                        for k in ("state", "postal_code")).strip()
    city = str(p.get("city") or "").strip()
    tail = ", ".join(x for x in (city, locality) if x)
    return ", ".join(x for x in (street, tail) if x)


def _require_company_name(value, *, required: bool):
    """A partner with no company name has nothing to print.

    `company_name` is NOT NULL in the schema and it is the line that
    renders in the deed's Recording Requested By block. Blank input used
    to reach the INSERT/UPDATE and fail on the constraint, which the
    service caught and reported as `None` — surfacing to the officer as
    "Partner not found", a 404 about a row that exists. Say the true
    thing instead.
    """
    if value is None:
        if required:
            raise HTTPException(status_code=400, detail="Company name is required")
        return
    if not " ".join(str(value).split()):
        raise HTTPException(status_code=400, detail="Company name is required")


# Helper function to get user's organization
def get_user_organization(user_id: int) -> str:
    """Get organization_id for user - uses user_id as unique org for data isolation"""
    # SECURITY FIX: Each user gets their own "organization" based on user_id
    # This prevents data leaking between users
    return f'user-{user_id}'


@router.get("", response_model=List[Dict])
async def list_my_partners(
    active_only: bool = True,
    user_id: int = Depends(get_current_user_id)
):
    """List all partners for current user (user-scoped, not shared)"""
    try:
        organization_id = get_user_organization(user_id)
        partners = list_partners(organization_id, active_only)
        return partners
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list partners: {str(e)}")


@router.post("", response_model=Dict, status_code=201)
async def create_my_partner(
    payload: PartnerCreate,
    user_id: int = Depends(get_current_user_id)
):
    """Create a new partner in current user's organization"""
    try:
        organization_id = get_user_organization(user_id)
        _require_company_name(payload.company_name, required=True)

        partner = create_partner(
            organization_id=organization_id,
            user_id=user_id,
            data=payload.dict()
        )
        
        if not partner:
            raise HTTPException(status_code=500, detail="Failed to create partner")
        
        return partner
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create partner: {str(e)}")


# Registered BEFORE /{partner_id}: a slash-less /partners/selectlist must
# never match the id route ('selectlist'::uuid cast). The proxy's trailing
# slash is no longer load-bearing.
@router.get("/selectlist/", response_model=List[Dict])
@router.get("/selectlist", response_model=List[Dict], include_in_schema=False)
async def get_partners_selectlist(
    user_id: int = Depends(get_current_user_id)
):
    """Get simplified partner list for dropdowns (id, name, category)"""
    try:
        organization_id = get_user_organization(user_id)
        partners = list_partners(organization_id, active_only=True)

        # Simplify for dropdown. D2: the address rides along so selecting
        # a partner can fill the deed's "Recording Requested By" block —
        # the data always existed on the partner row; the deed never got it.
        return [
            {
                'id': p['id'],
                'name': p['company_name'],
                'category': p.get('category', 'other'),
                'address': partner_address_line(p),
                # PARTNER2/B: the rolodex is now a RECIPIENT picker, not
                # only an address source. Sharing a deed or requesting a
                # signing needs the person and their address — without
                # these three the officer picks a partner and then
                # retypes the email she already stored, which is the
                # whole complaint this part answers.
                'role': p.get('role', 'other'),
                'contact_name': p.get('contact_name'),
                'email': p.get('email'),
            }
            for p in partners
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get partners: {str(e)}")


@router.get("/{partner_id}", response_model=Dict)
async def get_my_partner(
    partner_id: str,
    user_id: int = Depends(get_current_user_id)
):
    """Get a single partner (must belong to user's organization)"""
    try:
        organization_id = get_user_organization(user_id)
        
        partner = get_partner(partner_id, organization_id)
        
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        return partner
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get partner: {str(e)}")


@router.put("/{partner_id}", response_model=Dict)
async def update_my_partner(
    partner_id: str,
    payload: PartnerUpdate,
    user_id: int = Depends(get_current_user_id)
):
    """Update a partner (must belong to user's organization)"""
    try:
        organization_id = get_user_organization(user_id)

        # Filter out None values
        update_data = {k: v for k, v in payload.dict().items() if v is not None}
        if 'company_name' in update_data:
            _require_company_name(update_data['company_name'], required=True)
        
        partner = update_partner(partner_id, organization_id, update_data)
        
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found or does not belong to your organization")
        
        return partner
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update partner: {str(e)}")


@router.delete("/{partner_id}", status_code=204)
async def delete_my_partner(
    partner_id: str,
    user_id: int = Depends(get_current_user_id)
):
    """Delete a partner (must belong to user's organization)"""
    try:
        organization_id = get_user_organization(user_id)
        
        success = delete_partner(partner_id, organization_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Partner not found or does not belong to your organization")
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete partner: {str(e)}")
