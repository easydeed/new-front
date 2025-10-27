
from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.partner import IndustryPartner

class PartnerCRUD:
    def list_for_user(self, db: Session, user_id: str) -> List[IndustryPartner]:
        return db.query(IndustryPartner).filter(IndustryPartner.user_id == user_id).order_by(IndustryPartner.created_at.desc()).all()

    def get_by_name(self, db: Session, user_id: str, name: str) -> Optional[IndustryPartner]:
        return db.query(IndustryPartner).filter(IndustryPartner.user_id == user_id, IndustryPartner.name == name).first()

    def create(self, db: Session, user_id: str, name: str) -> IndustryPartner:
        p = IndustryPartner(user_id=user_id, name=name)
        db.add(p); db.commit(); db.refresh(p); return p

partner_crud = PartnerCRUD()
