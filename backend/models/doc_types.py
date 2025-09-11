from typing import Dict, Any


def get_document_types_registry() -> Dict[str, Any]:
    """Return document type registry with JSON-like configurations.

    Grant Deed follows 5 steps as required by plan:
    1) request details
    2) tax
    3) parties/property
    4) review
    5) generate
    """
    return {
        "grant_deed": {
            "label": "Grant Deed",
            "steps": [
                {"key": "request_details", "title": "Request Details"},
                {"key": "tax", "title": "Transfer Tax"},
                {"key": "parties_property", "title": "Parties & Property"},
                {"key": "review", "title": "Review"},
                {"key": "generate", "title": "Generate"},
            ],
            "fields": {
                "request_details": [
                    {"name": "requested_by", "type": "string", "required": False},
                    {"name": "title_company", "type": "string", "required": False},
                    {"name": "escrow_no", "type": "string", "required": False},
                    {"name": "title_order_no", "type": "string", "required": False},
                    {"name": "return_to", "type": "address", "required": False},
                    {"name": "apn", "type": "string", "required": False},
                ],
                "tax": [
                    {"name": "dtt_amount", "type": "currency", "required": False},
                    {"name": "dtt_basis", "type": "enum", "options": ["full_value", "less_liens"], "required": False},
                    {"name": "area_type", "type": "enum", "options": ["unincorporated", "city"], "required": False},
                    {"name": "city_name", "type": "string", "required": False},
                ],
                "parties_property": [
                    {"name": "grantors_text", "type": "multiline", "required": True},
                    {"name": "grantees_text", "type": "multiline", "required": True},
                    {"name": "county", "type": "string", "required": True},
                    {"name": "legal_description", "type": "multiline", "required": True},
                ],
                "review": [],
                "generate": [],
            },
            "schemas": {
                "county": {"type": "string", "minLength": 2},
                "apn": {"type": "string"},
            },
        }
    }


