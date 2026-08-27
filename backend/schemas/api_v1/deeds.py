"""
Pydantic models for API v1 Deed endpoints
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum


from services.api_catalog import API_DEED_TYPES, rules_for

# A2: derived from the FORMS registry (via services/form_families), deed
# family only per the Flag-4 doctrine ruling. The old hardcoded five-value
# list silently omitted four deed-family instruments the chassis renders.
DeedType = Enum("DeedType", {t.upper(): t for t in API_DEED_TYPES}, type=str)


class TaxBasis(str, Enum):
    FULL_VALUE = "full_value"
    LESS_LIENS = "less_liens"


# Request Models
class AddressModel(BaseModel):
    line1: str = Field(..., description="Street address line 1")
    line2: Optional[str] = Field(None, description="Street address line 2")
    city: str
    state: str = Field(..., min_length=2, max_length=2)
    zip: str = Field(..., min_length=5, max_length=10)


class PropertyModel(BaseModel):
    address: str = Field(..., description="Street address")
    city: str
    state: str = Field("CA", description="State (must be CA)")
    zip: str
    county: str
    apn: str = Field(..., description="Assessor's Parcel Number")
    legal_description: str = Field(..., description="Full legal description")
    
    @validator('state')
    def state_must_be_ca(cls, v):
        if v.upper() != 'CA':
            raise ValueError('Currently only California (CA) deeds are supported')
        return v.upper()


class EntityModel(BaseModel):
    """Recitals an entity grantor's deed prints about itself. Required for
    the entity deed types (see api_catalog.TYPE_REQUIREMENTS) — the deed
    recites them mid-sentence, so an absent value prints a blank line
    inside a granting clause."""
    entity_state: Optional[str] = Field(
        None, description="State under whose laws the entity is organized (e.g. 'California')")
    partnership_type: Optional[str] = Field(
        None, description="Partnership type recited on the deed (e.g. 'general partnership')")


class GrantorModel(BaseModel):
    name: str = Field(..., description="Grantor name(s), uppercase recommended")
    address: Optional[AddressModel] = None
    entity: Optional[EntityModel] = Field(
        None, description="Required for entity deed types (grant_deed_corp, grant_deed_partnership)")


class GranteeModel(BaseModel):
    name: str = Field(..., description="Grantee name(s), uppercase recommended")
    # A2: optional at the schema level because two instruments FIX their
    # own vesting and refuse a supplied value; per-type enforcement lives
    # in CreateDeedRequest.check_type_rules so the message can say why.
    vesting: Optional[str] = Field(
        None, description="Vesting clause (e.g., 'a married couple as joint tenants'). "
                          "Required for most deed types; refused for the fixed-vesting "
                          "instruments, whose title is itself the vesting decision.")


class TransferTaxModel(BaseModel):
    exempt: bool = Field(..., description="Is transfer tax exempt?")
    exempt_code: Optional[str] = Field(None, description="R&T code if exempt (e.g., 'R&T 11927')")
    value: Optional[float] = Field(None, description="Transfer value in dollars")
    computed_amount: Optional[str] = Field(None, description="Computed tax amount as string")
    basis: Optional[TaxBasis] = Field(None, description="full_value or less_liens")
    city_tax: Optional[bool] = Field(None, description="Does city tax apply?")
    city_name: Optional[str] = Field(None, description="City name for city tax")


class ReturnToModel(BaseModel):
    name: str
    company: Optional[str] = None
    address: str
    city: str
    state: str
    zip: str


class RecordingModel(BaseModel):
    requested_by: str = Field(..., description="Name of requesting party")
    return_to: ReturnToModel
    title_order_no: Optional[str] = None
    escrow_no: Optional[str] = None


class CreateDeedRequest(BaseModel):
    deed_type: DeedType
    property: PropertyModel
    grantor: GrantorModel
    grantee: GranteeModel
    transfer_tax: TransferTaxModel
    recording: RecordingModel

    @validator("recording")
    def check_type_rules(cls, v, values):
        """A2 — per-instrument facts and refusals, matching what the
        wizard's backend enforces for the same instruments. Runs on the
        last field so the earlier ones are present in `values`.

        Two refusals matter doctrinally:
        - A fixed-vesting instrument (joint tenancy, CP with right of
          survivorship) states its vesting on its face and its template
          never reads a supplied value. Accepting one and dropping it
          would silently discard a caller's legal input, so we refuse it
          and say which instrument decided.
        - An entity deed recites the entity's organizing state mid
          granting-clause. Missing, it prints a blank line inside the
          recital — a defective instrument, not a partial one.
        """
        deed_type = values.get("deed_type")
        grantee = values.get("grantee")
        grantor = values.get("grantor")
        if deed_type is None:
            return v
        rules = rules_for(deed_type.value if hasattr(deed_type, "value") else str(deed_type))
        supplied_vesting = (getattr(grantee, "vesting", None) or "").strip() if grantee else ""

        if rules.fixed_vesting and supplied_vesting:
            raise ValueError(
                f"This instrument fixes its own vesting — {rules.note} "
                "Remove grantee.vesting, or choose a deed type whose vesting you set."
            )
        if rules.requires_vesting and not supplied_vesting:
            raise ValueError("grantee.vesting is required for this deed type")

        if rules.required_entity_facts:
            entity = getattr(grantor, "entity", None)
            missing = [f for f in rules.required_entity_facts
                       if not (getattr(entity, f, None) or "").strip()]
            if missing:
                raise ValueError(
                    "This instrument recites facts about the grantor entity that are "
                    f"missing: {', '.join('grantor.entity.' + f for f in missing)}. "
                    + rules.note
                )
        return v


    class Config:
        json_schema_extra = {
            "example": {
                "deed_type": "grant_deed",
                "property": {
                    "address": "123 Main Street",
                    "city": "Los Angeles",
                    "state": "CA",
                    "zip": "90001",
                    "county": "Los Angeles",
                    "apn": "5432-001-012",
                    "legal_description": "LOT 1 OF TRACT NO. 12345..."
                },
                "grantor": {"name": "JOHN SMITH AND JANE SMITH, HUSBAND AND WIFE"},
                "grantee": {"name": "ROBERT JOHNSON", "vesting": "a single man"},
                "transfer_tax": {"exempt": False, "value": 750000, "computed_amount": "825.00", "basis": "full_value"},
                "recording": {
                    "requested_by": "ABC Title Company",
                    "return_to": {
                        "name": "Jane Doe",
                        "company": "ABC Title Company",
                        "address": "789 Business Blvd, Suite 100",
                        "city": "Los Angeles",
                        "state": "CA",
                        "zip": "90003"
                    }
                }
            }
        }


# Response Models
class DeedUrlsModel(BaseModel):
    pdf: str
    verification: str


class DeedPropertyResponse(BaseModel):
    address: str
    apn: str
    county: str


class DeedPartiesResponse(BaseModel):
    grantor: str
    grantee: str


class DeedTransferTaxResponse(BaseModel):
    amount: Optional[str] = None
    exempt: bool


class DeedDataResponse(BaseModel):
    deed_id: str
    document_id: str
    deed_type: str
    status: str
    created_at: datetime
    urls: DeedUrlsModel
    property: DeedPropertyResponse
    parties: DeedPartiesResponse
    transfer_tax: Optional[DeedTransferTaxResponse] = None


class DeedResponse(BaseModel):
    success: bool = True
    data: DeedDataResponse


class DeedListItem(BaseModel):
    deed_id: str
    document_id: str
    deed_type: str
    status: str
    created_at: datetime
    property_address: str


class PaginationModel(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class DeedListResponse(BaseModel):
    success: bool = True
    data: dict  # Contains deeds list and pagination


# Transfer Tax Calculator
class TransferTaxCalculateRequest(BaseModel):
    value: float = Field(..., gt=0, description="Property value in dollars")
    city: Optional[str] = None
    county: str = Field(..., description="County name")
    less_liens: float = Field(0, ge=0, description="Amount of liens to subtract")


class TaxBreakdownItem(BaseModel):
    name: str
    rate: str
    amount: float
    notes: Optional[str] = None


class TransferTaxBreakdown(BaseModel):
    county: TaxBreakdownItem
    city: Optional[TaxBreakdownItem] = None


class TransferTaxCalculateResponse(BaseModel):
    success: bool = True
    data: dict


# Verification
class VerificationDocumentModel(BaseModel):
    document_id: str
    deed_type: str
    status: str
    created_at: datetime


class VerificationResponse(BaseModel):
    valid: bool
    document: Optional[VerificationDocumentModel] = None
    message: Optional[str] = None
