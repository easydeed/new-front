"""P03 structural instructions, not tax classification or county clearance.

One conditional judgment for the prepared contract. No rate, exemption list,
legal wording or inference from value, relationship or instrument lives here.
"""
from decimal import Decimal
from enum import Enum
from typing import Annotated

from pydantic import AfterValidator, Field

from services.api_catalog import InstrumentRuleError
from services.api_input_validation import stored_amount, substantive_text

CONTRACT_VERSION = "P03-v2-preparation-2026-11-10"


class TaxMode(str, Enum):
    TAX_DUE = "tax_due"
    NO_TAX_DUE = "no_tax_due"
    STATUTORY_EXEMPTION = "statutory_exemption"


def decimal_amount(value: str) -> Decimal:
    """Only call after explicit_amount; never round or replace the raw input."""
    return Decimal(value.strip().replace("$", "").replace(",", ""))


def explicit_amount(value: str) -> str:
    # Compose in ONE validator: P02's alias-composition warning applies here.
    substantive_text(value)
    stored_amount(value)
    if value.strip().replace("$", "").startswith("-"):
        raise ValueError("A tax amount must not have a negative sign, including negative zero")
    return value


ExplicitAmount = Annotated[str, Field(min_length=1, max_length=64), AfterValidator(explicit_amount)]


def refuse(field: str, message: str):
    raise InstrumentRuleError(message, field="body.transfer_tax." + field)


def validate_component(component, path: str):
    """Conditional presence and contradictions; no legal sufficiency verdict."""
    amount = decimal_amount(component.amount)
    supplied = component.model_fields_set
    if component.mode == TaxMode.TAX_DUE:
        if amount <= 0:
            refuse(path + ".amount", "Tax-due instructions require a positive explicit amount")
        if component.basis is None:
            refuse(path + ".basis", "Tax-due instructions require an explicit basis")
        for name in ("grounds", "citation"):
            if name in supplied:
                refuse(path + "." + name, "Do not combine tax-due instructions with no-tax or exemption fields")
        if "supporting_loan" in supplied and component.basis.value != "less_liens":
            refuse(path + ".supporting_loan", "Loan support belongs to explicit less-liens instructions")
    else:
        if amount != 0:
            refuse(path + ".amount", "No-tax and exemption instructions require explicit zero")
        if component.grounds is None:
            refuse(path + ".grounds", "Supply the professional's grounds for this instruction")
        for name in ("basis", "supporting_loan"):
            if name in supplied:
                refuse(path + "." + name, "Do not supply taxable-basis fields for a no-tax or exemption instruction")
        if component.mode == TaxMode.STATUTORY_EXEMPTION and component.citation is None:
            refuse(path + ".citation", "Supply the professional's statutory citation; it is not verified by DeedPro")
        if component.mode == TaxMode.NO_TAX_DUE and "citation" in supplied:
            refuse(path + ".citation", "Use statutory_exemption for a statutory exemption claim")


def validate_bundle(bundle):
    validate_component(bundle.county, "county")
    if bundle.location == "city":
        if bundle.city_name is None:
            refuse("city_name", "An incorporated-city instruction requires an explicit city name")
        if bundle.city is None:
            refuse("city", "State the city's treatment separately, even when declaring zero city tax")
        validate_component(bundle.city, "city")
    else:
        for name in ("city_name", "city"):
            if name in bundle.model_fields_set:
                refuse(name, "An unincorporated instruction must not also supply city instructions")
    total = decimal_amount(bundle.county.amount)
    if bundle.city is not None:
        total += decimal_amount(bundle.city.amount)
    if decimal_amount(bundle.total_amount) != total:
        refuse("total_amount", "The explicit total must equal the exact county and city amounts; no amount is corrected automatically")
