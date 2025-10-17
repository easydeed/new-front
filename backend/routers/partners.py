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


# Helper function to get user's organization
def get_user_organization(user_id: int) -> str:
    """Get organization_id for user (defaults to 'default-org')"""
    # For now, all users belong to 'default-org'
    # Later: Query from users table when organization_id column exists
    return 'default-org'


@router.get("", response_model=List[Dict])
async def list_my_partners(
    active_only: bool = True,
    user_id: int = Depends(get_current_user_id)
):
    """List all partners for current user's organization"""
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


@router.get("/selectlist/", response_model=List[Dict])
async def get_partners_selectlist(
    user_id: int = Depends(get_current_user_id)
):
    """Get simplified partner list for dropdowns (id, name, category)"""
    try:
        organization_id = get_user_organization(user_id)
        partners = list_partners(organization_id, active_only=True)
        
        # Simplify for dropdown
        return [
            {
                'id': p['id'],
                'name': p['company_name'],
                'category': p.get('category', 'other')
            }
            for p in partners
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get partners: {str(e)}")
