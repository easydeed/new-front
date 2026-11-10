"""P02 structural input limits, shared by the API schema and in-process demo.

Never normalize legal contents, infer instructions, or certify a name as an
identity. The instrument catalog still owns vesting/entity requirements.
"""
import re
from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, BeforeValidator, Field

from services.required_fields import has_substance

VALIDATION_REVISION = "P02-2026-11-09"
TEXT_LIMIT = 10_000
LEGAL_DESCRIPTION_LIMIT = 1_000_000


def postgres_text(value: str) -> str:
    if "\x00" in value:
        raise ValueError("Text must not contain a NUL character")
    return value


def substantive_text(value: str) -> str:
    # Keep one AfterValidator per alias: Field metadata composition in the
    # request models can otherwise replace an earlier AfterValidator.
    postgres_text(value)
    if not has_substance(value):
        raise ValueError("A nonblank value is required")
    return value  # Validate, do not trim or rewrite the caller's facts.


def stored_amount(value: str) -> str:
    # Presence/conditional tax instructions belong to P03, not this syntax
    # check. Preserve legacy omitted/blank values and either numeric sign.
    if not has_substance(value):
        return value
    text = value.strip()
    if not re.fullmatch(r"\$?[+-]?(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)(?:\.[0-9]{1,2})?", text):
        raise ValueError("Use a decimal amount with at most two fractional digits")
    amount = Decimal(text.replace("$", "").replace(",", ""))
    # Matches api_deeds.transfer_tax_amount DECIMAL(10,2), not a tax rule.
    if abs(amount) > Decimal("99999999.99"):
        raise ValueError("Amount exceeds the stored decimal precision (10,2)")
    return value


def numeric_not_boolean(value):
    if isinstance(value, bool):
        raise ValueError("A numeric value, not a boolean, is required")
    return value


Text = Annotated[str, Field(max_length=TEXT_LIMIT), AfterValidator(postgres_text)]
RequiredText = Annotated[Text, Field(min_length=1), AfterValidator(substantive_text)]
LegalDescription = Annotated[
    str, Field(min_length=1, max_length=LEGAL_DESCRIPTION_LIMIT),
    AfterValidator(substantive_text),
]
FiniteNumber = Annotated[float, Field(allow_inf_nan=False), BeforeValidator(numeric_not_boolean)]
StoredAmount = Annotated[str, Field(max_length=64), AfterValidator(stored_amount)]
