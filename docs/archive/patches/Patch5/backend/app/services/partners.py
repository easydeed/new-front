from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.partner import Partner
from app.schemas.partner import PartnerCreate, PartnerUpdate

def list_partners(db: Session, organization_id: str) -> List[Partner]:
  return db.query(Partner).filter(Partner.organization_id == organization_id, Partner.is_active == True).order_by(Partner.company_name.asc()).all()

def get_partner(db: Session, organization_id: str, partner_id: str) -> Optional[Partner]:
  return db.query(Partner).filter(Partner.organization_id == organization_id, Partner.id == partner_id).first()

def create_partner(db: Session, organization_id: str, user_id: str, obj_in: PartnerCreate) -> Partner:
  p = Partner(
    organization_id = organization_id,
    created_by_user_id = user_id,
    category = obj_in.category or 'other',
    role = obj_in.role or 'other',
    company_name = obj_in.company_name,
    contact_name = obj_in.contact_name,
    email = obj_in.email,
    phone = obj_in.phone,
    address_line1 = obj_in.address_line1,
    address_line2 = obj_in.address_line2,
    city = obj_in.city,
    state = obj_in.state,
    postal_code = obj_in.postal_code,
    notes = obj_in.notes,
    is_active = True if obj_in.is_active is None else obj_in.is_active
  )
  db.add(p)
  db.commit()
  db.refresh(p)
  return p

def update_partner(db: Session, organization_id: str, partner_id: str, obj_in: PartnerUpdate) -> Optional[Partner]:
  p = get_partner(db, organization_id, partner_id)
  if not p:
    return None
  for field, value in obj_in.dict(exclude_unset=True).items():
    setattr(p, field, value)
  db.add(p)
  db.commit()
  db.refresh(p)
  return p

def delete_partner(db: Session, organization_id: str, partner_id: str) -> bool:
  p = get_partner(db, organization_id, partner_id)
  if not p:
    return False
  # soft delete
  p.is_active = False
  db.add(p)
  db.commit()
  return True

def admin_list_all(db: Session):
  return db.query(Partner).order_by(Partner.organization_id.asc(), Partner.company_name.asc()).all()
