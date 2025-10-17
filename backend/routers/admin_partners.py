"""
Admin Partners Router
Admin-only CRUD for all partners across all organizations
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from auth import get_current_user_id
from database import get_db_connection
from psycopg2.extras import RealDictCursor
from services.partners import list_all_partners, get_partner, update_partner

router = APIRouter()


def is_admin(user_id: int) -> bool:
    """Check if user is admin/superuser"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return False
        
        # Check if user has admin role
        return user.get('role') == 'admin'
    except Exception as e:
        print(f"Error checking admin status: {e}")
        return False
    finally:
        cursor.close()
        conn.close()


def require_admin(user_id: int = Depends(get_current_user_id)) -> int:
    """Dependency to require admin access"""
    if not is_admin(user_id):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_id


@router.get("", response_model=List[Dict])
async def list_all_partners_admin(
    active_only: bool = False,
    user_id: int = Depends(require_admin)
):
    """List ALL partners across all organizations (admin only)"""
    try:
        partners = list_all_partners(active_only)
        return partners
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list partners: {str(e)}")


@router.get("/{partner_id}", response_model=Dict)
async def get_partner_admin(
    partner_id: str,
    user_id: int = Depends(require_admin)
):
    """Get any partner by ID (admin only)"""
    try:
        partner = get_partner(partner_id, organization_id=None)
        
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        return partner
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get partner: {str(e)}")


@router.put("/{partner_id}/toggle-active", response_model=Dict)
async def toggle_partner_active_admin(
    partner_id: str,
    user_id: int = Depends(require_admin)
):
    """Toggle partner active status (admin only)"""
    try:
        # Get current partner
        partner = get_partner(partner_id, organization_id=None)
        
        if not partner:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        # Toggle is_active
        new_status = not partner.get('is_active', True)
        
        updated = update_partner(
            partner_id,
            partner['organization_id'],
            {'is_active': new_status}
        )
        
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to update partner")
        
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle partner: {str(e)}")

