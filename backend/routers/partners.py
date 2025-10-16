"""
Phase 15 v5: Industry Partners API
Purpose: Manage title companies, real estate partners, and lenders
Scope: User-scoped (upgradeable to org-scoped when Teams feature added)
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from database import get_db_connection
from auth import get_current_user_id
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/partners", tags=["partners"])

# ========== PYDANTIC SCHEMAS ==========

class PartnerCategory:
    """Valid partner categories"""
    TITLE_COMPANY = "title_company"
    REAL_ESTATE = "real_estate"
    LENDER = "lender"

class PartnerRole:
    """Valid roles for partner people"""
    TITLE_OFFICER = "title_officer"
    REALTOR = "realtor"
    LOAN_OFFICER = "loan_officer"

class PartnerPersonCreate(BaseModel):
    """Create a contact person for a partner"""
    name: str = Field(..., min_length=1, max_length=200)
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class PartnerCreate(BaseModel):
    """Create a new partner (title company, real estate, lender)"""
    name: str = Field(..., min_length=2, max_length=200)
    category: str = Field(..., pattern="^(title_company|real_estate|lender)$")  # Pydantic v2 syntax
    person: Optional[PartnerPersonCreate] = None

class PartnerSelectItem(BaseModel):
    """Item for dropdown selection"""
    display: str  # e.g. "Acme Title — Jane Smith (Title Officer)"
    partner_id: str
    person_id: Optional[str] = None
    category: str
    role: Optional[str] = None

class PartnerOut(BaseModel):
    """Partner response"""
    id: str
    user_id: int
    name: str
    category: str
    created_at: str

class PartnerPersonOut(BaseModel):
    """Partner person response"""
    id: str
    partner_id: str
    name: str
    role: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    created_at: str

# ========== ENDPOINTS ==========

@router.get("/selectlist", response_model=List[PartnerSelectItem])
async def get_partners_selectlist(user_id: int = Depends(get_current_user_id)):
    """
    Get all partners for the current user in dropdown-friendly format.
    
    Returns items like:
    - "Acme Title — Jane Smith (Title Officer)"
    - "First American Title"
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cursor = conn.cursor()
        
        # Get partners with optional people (LEFT JOIN)
        cursor.execute("""
            SELECT 
                p.id as partner_id,
                p.name as partner_name,
                p.category,
                pp.id as person_id,
                pp.name as person_name,
                pp.role
            FROM partners p
            LEFT JOIN partner_people pp ON pp.partner_id = p.id
            WHERE p.user_id = %s
            ORDER BY p.name, pp.name
        """, (user_id,))
        
        rows = cursor.fetchall()
        
        # Build select items
        result = []
        for row in rows:
            if row['person_id']:
                # Partner with person: "Acme Title — Jane Smith (Title Officer)"
                display = f"{row['partner_name']} — {row['person_name']}"
                if row['role']:
                    display += f" ({row['role'].replace('_', ' ').title()})"
                result.append(PartnerSelectItem(
                    display=display,
                    partner_id=row['partner_id'],
                    person_id=row['person_id'],
                    category=row['category'],
                    role=row['role']
                ))
            else:
                # Partner without people: "First American Title"
                result.append(PartnerSelectItem(
                    display=row['partner_name'],
                    partner_id=row['partner_id'],
                    category=row['category']
                ))
        
        logger.info(f"✅ [PARTNERS] User {user_id} fetched {len(result)} partner items")
        return result
        
    except Exception as e:
        logger.error(f"❌ [PARTNERS] Error fetching partners for user {user_id}: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fetch partners: {str(e)}")
    finally:
        conn.close()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_partner(payload: PartnerCreate, user_id: int = Depends(get_current_user_id)):
    """
    Create a new partner (title company, real estate, lender) with optional contact person.
    
    Example:
    {
      "name": "Acme Title Company",
      "category": "title_company",
      "person": {
        "name": "Jane Smith",
        "role": "title_officer",
        "email": "jane@acme.com",
        "phone": "555-1234"
      }
    }
    """
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cursor = conn.cursor()
        
        # Check for duplicate partner name (per user)
        cursor.execute("""
            SELECT id FROM partners 
            WHERE user_id = %s AND LOWER(name) = LOWER(%s)
        """, (user_id, payload.name.strip()))
        
        existing = cursor.fetchone()
        if existing:
            logger.info(f"⚠️ [PARTNERS] User {user_id} tried to create duplicate partner: {payload.name}")
            return {"id": existing['id'], "success": True, "message": "Partner already exists"}
        
        # Create partner
        partner_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO partners (id, user_id, name, category, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (partner_id, user_id, payload.name.strip(), payload.category))
        
        # Create person if provided
        person_id = None
        if payload.person and payload.person.name.strip():
            person_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO partner_people (id, partner_id, name, role, email, phone, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (
                person_id,
                partner_id,
                payload.person.name.strip(),
                payload.person.role,
                payload.person.email,
                payload.person.phone
            ))
        
        conn.commit()
        
        logger.info(f"✅ [PARTNERS] User {user_id} created partner {partner_id}: {payload.name}" +
                   (f" with person {person_id}" if person_id else ""))
        
        return {"id": partner_id, "person_id": person_id, "success": True}
        
    except Exception as e:
        logger.error(f"❌ [PARTNERS] Error creating partner for user {user_id}: {e}")
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create partner: {str(e)}")
    finally:
        conn.close()


@router.get("", response_model=List[PartnerOut])
async def list_partners(user_id: int = Depends(get_current_user_id)):
    """List all partners for the current user"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, user_id, name, category, created_at
            FROM partners
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        
        rows = cursor.fetchall()
        return [PartnerOut(**dict(row)) for row in rows]
        
    except Exception as e:
        logger.error(f"❌ [PARTNERS] Error listing partners for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list partners: {str(e)}")
    finally:
        conn.close()

