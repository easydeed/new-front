"""D1 response fidelity only: zero is a stored value, not missing."""
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from routers.api_v1.router import _deed_response_from_row


@pytest.mark.parametrize("amount,expected", [(Decimal("0.00"), "$0.00"), (0, "$0.00"),
    (0.0, "$0.00"), (None, None), (Decimal("825.00"), "$825.00")])
def test_stored_zero_response(amount, expected):
    row = {"status": "pending_confirmation", "deed_id": "synthetic", "document_id": "synthetic",
           "deed_type": "grant_deed", "created_at": datetime.now(timezone.utc),
           "property_address": "Synthetic address", "property_apn": "Synthetic APN", "property_county": "Synthetic county",
           "grantor_name": "Synthetic grantor", "grantee_name": "Synthetic grantee",
           "transfer_tax_amount": amount, "transfer_tax_exempt": True}
    assert _deed_response_from_row(row).data.transfer_tax.amount == expected
