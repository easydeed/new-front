
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import Column, String, DateTime, ForeignKey, func

Base = declarative_base()

class Partner(Base):
    __tablename__ = "partners"
    id = Column(String, primary_key=True)
    organization_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False)  # title_company | real_estate | lender
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    people = relationship("PartnerPerson", back_populates="partner", cascade="all, delete-orphan")

class PartnerPerson(Base):
    __tablename__ = "partner_people"
    id = Column(String, primary_key=True)
    partner_id = Column(String, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=True)  # title_officer | realtor | loan_officer
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    partner = relationship("Partner", back_populates="people")
