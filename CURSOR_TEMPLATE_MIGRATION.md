# DeedPro Template Migration Task

## Objective
Replace the legacy deed templates with the new professional templates. The new templates are designed for PDFShift (Chrome headless) rendering and feature a modern, professional design suitable for county recorder acceptance.

---

## Current State

**Old templates location:** `templates/` (root level, contains legacy templates)
- `templates/grant_deed_ca/index.jinja2` (OLD - delete)
- `templates/quitclaim_deed_ca/index.jinja2` (OLD - delete)
- `templates/interspousal_transfer_ca/index.jinja2` (OLD - delete)
- `templates/warranty_deed_ca/index.jinja2` (OLD - delete)
- `templates/tax_deed_ca/index.jinja2` (OLD - delete)

**New templates location:** `templates/new_templates/`
- `grant_deed_ca/index.jinja2` (NEW)
- `quitclaim_deed_ca/index.jinja2` (NEW)
- `interspousal_transfer_ca/index.jinja2` (NEW)
- `warranty_deed_ca/index.jinja2` (NEW)
- `tax_deed_ca/index.jinja2` (NEW)
- `grant_deed_ca/preview_sample.html` (preview file - can be kept or deleted)

---

## Migration Steps

### Step 1: Backup (Optional but Recommended)
```bash
# Create backup of old templates
mkdir -p templates/legacy_backup
cp -r templates/grant_deed_ca templates/legacy_backup/
cp -r templates/quitclaim_deed_ca templates/legacy_backup/
cp -r templates/interspousal_transfer_ca templates/legacy_backup/
cp -r templates/warranty_deed_ca templates/legacy_backup/
cp -r templates/tax_deed_ca templates/legacy_backup/
```

### Step 2: Remove Old Templates
```bash
# Delete old template files (keep the folder structure)
rm templates/grant_deed_ca/index.jinja2
rm templates/quitclaim_deed_ca/index.jinja2
rm templates/interspousal_transfer_ca/index.jinja2
rm templates/warranty_deed_ca/index.jinja2
rm templates/tax_deed_ca/index.jinja2

# Also remove any legacy partial templates if they exist
rm -f templates/grant_deed_ca/body_deed.jinja2
rm -f templates/grant_deed_ca/header_return_block.jinja2
rm -f templates/grant_deed_ca/footer_execution_notary.jinja2
```

### Step 3: Move New Templates Into Place
```bash
# Copy new templates to their proper locations
cp templates/new_templates/grant_deed_ca/index.jinja2 templates/grant_deed_ca/
cp templates/new_templates/quitclaim_deed_ca/index.jinja2 templates/quitclaim_deed_ca/
cp templates/new_templates/interspousal_transfer_ca/index.jinja2 templates/interspousal_transfer_ca/
cp templates/new_templates/warranty_deed_ca/index.jinja2 templates/warranty_deed_ca/
cp templates/new_templates/tax_deed_ca/index.jinja2 templates/tax_deed_ca/
```

### Step 4: Clean Up
```bash
# Remove the new_templates staging folder
rm -rf templates/new_templates/
```

### Step 5: Verify Template Variables
The new templates expect these Jinja2 variables. Verify the backend passes them correctly:

**All Deed Types (Common Variables):**
- `requested_by` - Who requested recording
- `title_company` - Title company name (fallback for requested_by)
- `return_to` - Dict with: name, company, address1, address2, city, state, zip
- `mail_tax_to` - Where to mail tax statements (optional)
- `apn` - Assessor's Parcel Number
- `title_order_no` - Title order number
- `escrow_no` - Escrow number
- `county` - County name
- `grantors_text` - Grantor name(s), semicolon-separated for multiple
- `grantees_text` - Grantee name(s)
- `legal_description` - Legal description text
- `exhibit_threshold` - Character limit before using Exhibit A (default: 600)
- `execution_date` - Date of execution
- `now()` - Function to get current datetime (for default date)

**Grant Deed & Quitclaim Deed & Warranty Deed (DTT Variables):**
- `dtt` - Dict with:
  - `amount` - Dollar amount (e.g., "550.00")
  - `basis` - "full" or "less_liens"
  - `area_type` - "unincorporated" or "city"
  - `city_name` - City name if area_type is "city"

**Interspousal Transfer Deed:**
- `dtt_exempt_reason` - Additional exemption reason (optional)
- `vesting` - How title will be held

**Warranty Deed:**
- `covenants` - Subject-to exceptions (optional)

**Tax Deed:**
- `tax_sale_ref` - Tax sale reference number
- `tax_sale_date` - Date of tax sale
- `tax_sale_amount` - Purchase price at tax sale
- `tax_years_delinquent` - Years of delinquent taxes
- `tax_collector_name` - Name of tax collector
- `deputy_name` - Name of deputy (optional)
- `tax_collector_office` - Office name (optional)

---

## Backend Code Check

Verify these files pass the correct variables to templates:

1. **`backend/routers/deeds.py`** - Grant Deed generation
2. **`backend/routers/deeds_extra.py`** - Other deed types
3. **`backend/pdf_engine.py`** - PDF rendering (ensure `now()` is passed to Jinja context)

### Critical: Ensure `now()` is in Jinja Context

In the PDF rendering function, make sure the Jinja environment has access to `now()`:

```python
from datetime import datetime

# When rendering template
context = {
    # ... other variables ...
    'now': datetime.now,  # Pass the function, not the result
}
```

---

## Testing Checklist

After migration, test each deed type:

- [ ] Grant Deed generates PDF correctly
- [ ] Quitclaim Deed generates PDF correctly
- [ ] Interspousal Transfer Deed generates PDF correctly
- [ ] Warranty Deed generates PDF correctly
- [ ] Tax Deed generates PDF correctly
- [ ] Long legal descriptions trigger Exhibit A page
- [ ] Multiple grantors (semicolon-separated) create multiple signature lines
- [ ] DTT section displays correctly with all checkbox combinations
- [ ] Notary section renders with proper seal area size
- [ ] PDF looks professional when printed

---

## Rollback Plan

If issues arise, restore from backup:
```bash
cp -r templates/legacy_backup/* templates/
```

---

## Notes

- The new templates use CSS Grid which requires PDFShift (Chrome headless) or a modern PDF renderer
- If still using WeasyPrint, the templates will still work but Grid layouts will fall back to block display
- The preview_sample.html file can be opened in any browser to see how the Grant Deed looks with sample data
