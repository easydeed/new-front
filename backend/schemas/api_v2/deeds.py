"""Disabled-profile P03 contract; valid structure is not legal approval."""
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from schemas.api_v1.deeds import CreateDeedRequest, PropertyModel, TaxBasis
from services.api_input_validation import RequiredText
from services import tax_instructions
from services.tax_instructions import CONTRACT_VERSION, ExplicitAmount, TaxMode


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SupportingLoan(StrictModel):
    balance: Optional[ExplicitAmount] = None
    recording_reference: Optional[RequiredText] = None

    @model_validator(mode="after")
    def supplied_facts(self):
        if self.balance is None and self.recording_reference is None:
            raise ValueError("Supply a loan balance or recording reference; county-specific requirements remain held")
        return self


class TaxComponent(StrictModel):
    mode: TaxMode
    amount: ExplicitAmount
    basis: Optional[TaxBasis] = None
    grounds: Optional[RequiredText] = None
    citation: Optional[RequiredText] = None
    supporting_loan: Optional[SupportingLoan] = None


class TaxInstruction(StrictModel):
    profile_id: RequiredText = Field(..., max_length=100, description="No approved profiles exist in this preparation")
    location: Literal["city", "unincorporated"]
    city_name: Optional[RequiredText] = Field(None, max_length=100)
    county: TaxComponent
    city: Optional[TaxComponent] = None
    total_amount: ExplicitAmount

    @model_validator(mode="after")
    def explicit_instructions(self):
        tax_instructions.validate_bundle(self)
        return self


class V2Property(PropertyModel):
    # Reuse factual validation, but v2 does not silently supply a state.
    state: RequiredText = Field(..., min_length=2, max_length=2)


class PrepareDeedRequest(CreateDeedRequest):
    """Reuse P02 facts, instrument catalog and holds; no v1 tax coercion."""
    property: V2Property
    transfer_tax: TaxInstruction
    model_config = ConfigDict(extra="forbid", json_schema_extra={
        "x-deedpro-contract-version": CONTRACT_VERSION,
        "x-generation-enabled": False,
        "description": "Preparation only. No county profile approved; production router is not mounted.",
    })

    @model_validator(mode="after")
    def consistent_city(self):
        tt = self.transfer_tax
        if tt.location == "city" and tt.city_name.strip().casefold() != self.property.city.strip().casefold():
            tax_instructions.refuse("city_name", "Property city and tax-instruction city conflict; correct the facts rather than choosing one silently")
        return self
