# Deed Generation & Template System Guide

## Overview
This guide documents the DeedPro backend's deed generation and template system, including:
- API endpoints for deed preview and PDF generation
- Template structure and customization
- Integration with the frontend

---

## API Endpoints

### 1. Generate Deed Preview (HTML)
- **Endpoint:** `POST /generate-deed-preview`
- **Description:** Renders a pixel-perfect HTML preview of a deed using the correct template. No authentication or plan limits.
- **Request Body Example:**
```json
{
  "deed_type": "Grant Deed",
  "data": {
    "recording_requested_by": "John Doe",
    "mail_to": "Jane Smith",
    "order_no": "ORD-123",
    "escrow_no": "ESC-456",
    "apn": "123-456-789",
    "documentary_tax": "100.00",
    "city": "Los Angeles",
    "grantor": "John Doe",
    "grantee": "Jane Smith",
    "county": "Los Angeles",
    "property_description": "Lot 1, Block 2, Tract 12345",
    "date": "2024-07-01",
    "grantor_signature": "John Doe",
    "county_notary": "Los Angeles",
    "notary_date": "2024-07-01",
    "notary_name": "Notary Public",
    "appeared_before_notary": "John Doe",
    "notary_signature": "Notary Public"
  }
}
```
- **Response Example:**
```json
{
  "html": "<html>...</html>",
  "deed_type": "Grant Deed",
  "status": "success"
}
```

### 2. Download Deed as PDF
- **Endpoint:** `GET /deeds/{deed_id}/download`
- **Description:** Generates and returns a PDF of the deed using the correct template. Requires authentication and checks plan limits.
- **Response Example:**
```json
{
  "pdf_base64": "JVBERi0xLjQKJ...",
  "deed_type": "Grant Deed",
  "deed_id": 123,
  "status": "success"
}
```

---

## Template System
- Templates are stored in `/backend/templates/`.
- Each deed type has its own HTML file (e.g., `grant_deed.html`, `quitclaim_deed.html`).
- Templates use Jinja2 syntax for data injection.
- Legal formatting and notary sections are included.

---

## Integration Notes
- The frontend deed wizard calls `/generate-deed-preview` for live previews.
- For PDF downloads, the frontend calls `/deeds/{deed_id}/download` after deed creation.
- To add new deed types, create a new template file and update the backend template mapping.

---

## Example Template Snippet
```html
<p class="bold">RECORDING REQUESTED BY:</p>
<p>{{ recording_requested_by }}</p>
<!-- ... -->
```

---

## Troubleshooting
- Ensure all required fields are provided in the data payload.
- If PDF generation fails, check WeasyPrint installation and template validity.
- For new templates, validate HTML and Jinja2 syntax.

---

## See Also
- [QUICK_START_FOR_NEW_AGENTS.md](./QUICK_START_FOR_NEW_AGENTS.md)
- [README.md](./README.md)
- [TEMPLATES_GUIDE.md](./TEMPLATES_GUIDE.md) 