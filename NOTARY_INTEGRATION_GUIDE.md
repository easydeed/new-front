# Notary Acknowledgment Integration Guide

## How to Add Page 2 to Deed Templates

### Step 1: Copy the Partial

Copy `_partials/notary_acknowledgment.jinja2` to your backend templates folder:

```
backend/templates/
├── _partials/
│   └── notary_acknowledgment.jinja2  ← NEW
├── grant_deed_ca/
│   └── index.jinja2
├── quitclaim_deed_ca/
│   └── index.jinja2
└── ...
```

### Step 2: Update Each Deed Template

At the **end** of each deed template (before `</body>`), add:

```jinja2
    <!-- END OF DEED CONTENT -->
    
    </div> <!-- Close .deed-page -->

    {# ================================================================
       PAGE 2: NOTARY ACKNOWLEDGMENT
       California Civil Code § 1189
       ================================================================ #}
    {% include '_partials/notary_acknowledgment.jinja2' %}

</body>
</html>
```

### Step 3: Pass Required Variables

When rendering the template, ensure these variables are passed:

```python
# In main.py or generate_deed.py

template_vars = {
    # Existing variables...
    'grantors_text': grantors_text,
    'county': county,
    
    # New variables for notary page
    'document_title': 'Grant Deed',  # or 'Quitclaim Deed', etc.
    'execution_date': execution_date or '',
    'page_count': 2,  # Will be 2 with notary page
    
    # For Phase 4 (QR verification) - optional for now
    'document_id': None,  # e.g., 'DOC-2026-A7X9K'
    'qr_code_data': None,  # Base64 data URL
}
```

---

## Template-Specific Instructions

### Grant Deed (`grant_deed_ca/index.jinja2`)

Find the closing `</div>` for the main deed page and add:

```jinja2
        </div> <!-- Close .notary-section or last section -->
    </div> <!-- Close .deed-page -->

    {# PAGE 2: NOTARY ACKNOWLEDGMENT #}
    {% set document_title = 'Grant Deed' %}
    {% include '_partials/notary_acknowledgment.jinja2' %}

</body>
</html>
```

### Quitclaim Deed (`quitclaim_deed_ca/index.jinja2`)

Same pattern:

```jinja2
    {% set document_title = 'Quitclaim Deed' %}
    {% include '_partials/notary_acknowledgment.jinja2' %}
```

### Interspousal Transfer (`interspousal_transfer_ca/index.jinja2`)

```jinja2
    {% set document_title = 'Interspousal Transfer Deed' %}
    {% include '_partials/notary_acknowledgment.jinja2' %}
```

### Warranty Deed (`warranty_deed_ca/index.jinja2`)

```jinja2
    {% set document_title = 'Warranty Deed' %}
    {% include '_partials/notary_acknowledgment.jinja2' %}
```

### Tax Deed (`tax_deed_ca/index.jinja2`)

```jinja2
    {% set document_title = 'Tax Deed' %}
    {% include '_partials/notary_acknowledgment.jinja2' %}
```

---

## Testing

After integration, test PDF generation:

1. Create a Grant Deed through the app
2. Download/preview the PDF
3. Verify:
   - Page 2 starts on a new page
   - Disclaimer box is at the top
   - County is pre-filled
   - Grantor names are pre-filled
   - Seal area is 2.25" x 2.25"

---

## CSS Notes for PDFShift

The notary template uses CSS that works with both WeasyPrint and PDFShift:

- `page-break-before: always` — Forces new page
- Flexbox for signature/seal layout
- Explicit widths in inches (not percentages)
- Border-based underlines (not text-decoration)

If using PDFShift, you may want to add:

```css
@media print {
    .notary-page {
        page-break-before: always;
        page-break-inside: avoid;
    }
}
```

---

## Variables Reference

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `county` | Yes | `"Los Angeles"` | Pre-fills venue |
| `grantors_text` | Yes | `"JOHN SMITH AND JANE SMITH"` | Pre-fills signer names |
| `document_title` | No | `"Grant Deed"` | Optional section |
| `execution_date` | No | `"January 21, 2026"` | Optional section |
| `page_count` | No | `2` | Optional section |
| `document_id` | No | `"DOC-2026-A7X9K"` | QR verification (Phase 4) |
| `qr_code_data` | No | `"data:image/png;base64,..."` | QR code image (Phase 4) |
