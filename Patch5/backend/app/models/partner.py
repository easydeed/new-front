from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.db.base_class import Base  # assumes you have a declarative Base

PartnerCategory = ('title_company','real_estate','lender','other')
PartnerRole = ('title_officer','realtor','loan_officer','other')

class Partner(Base):
  __tablename__ = 'partners'
  id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  organization_id = Column(String, index=True, nullable=False)  # org partition
  created_by_user_id = Column(String, index=True, nullable=False)

  category = Column(String, nullable=False, default='other')  # Enum alternative for portability
  role = Column(String, nullable=False, default='other')

  company_name = Column(String, nullable=False)
  contact_name = Column(String, nullable=True)
  email = Column(String, nullable=True)
  phone = Column(String, nullable=True)

  address_line1 = Column(String, nullable=True)
  address_line2 = Column(String, nullable=True)
  city = Column(String, nullable=True)
  state = Column(String, nullable=True)
  postal_code = Column(String, nullable=True)

  notes = Column(Text, nullable=True)
  is_active = Column(Boolean, nullable=False, default=True)

  created_at = Column(DateTime(timezone=True), server_default=func.now())
  updated_at = Column(DateTime(timezone=True), onupdate=func.now())
