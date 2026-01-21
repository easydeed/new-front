"""
Pydantic models for API v1 Deed endpoints
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DeedType(str, Enum):
    GRANT_DEED = "grant_deed"
    QUITCLAIM_DEED = "quitclaim_deed"
    INTERSPOUSAL_TRANSFER = "interspousal_transfer"
    WARRANTY_DEED = "warranty_deed"
    TAX_DEED = "tax_deed"


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


class GrantorModel(BaseModel):
    name: str = Field(..., description="Grantor name(s), uppercase recommended")
    address: Optional[AddressModel] = None


class GranteeModel(BaseModel):
    name: str = Field(..., description="Grantee name(s), uppercase recommended")
    vesting: str = Field(..., description="Vesting clause (e.g., 'a married couple as joint tenants')")


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


class DeedOptionsModel(BaseModel):
    include_notary_page: bool = Field(True, description="Include notary acknowledgment page")
    include_qr_code: bool = Field(True, description="Include QR verification code")


class CreateDeedRequest(BaseModel):
    deed_type: DeedType
    property: PropertyModel
    grantor: GrantorModel
    grantee: GranteeModel
    transfer_tax: TransferTaxModel
    recording: RecordingModel
    options: Optional[DeedOptionsModel] = DeedOptionsModel()
    
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


# Error Response
class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None


class APIErrorResponse(BaseModel):
    success: bool = False
    error: ErrorResponse


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
class VerificationPropertyModel(BaseModel):
    address: str
    county: str


class VerificationPartiesModel(BaseModel):
    grantor: str
    grantee: str


class VerificationDocumentModel(BaseModel):
    document_id: str
    deed_type: str
    status: str
    created_at: datetime
    property: VerificationPropertyModel
    parties: VerificationPartiesModel


class VerificationResponse(BaseModel):
    valid: bool
    document: Optional[VerificationDocumentModel] = None
    message: Optional[str] = None
