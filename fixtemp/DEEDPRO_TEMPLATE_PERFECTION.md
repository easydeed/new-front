# DeedPro Template Perfection Guide
> **Goal:** Best-looking deed templates in the industry

---

## 🎯 Design Philosophy

**Industry Standard + Modern Polish**

Our templates should be:
1. **Instantly recognizable** as professional legal documents
2. **County recorder approved** — meets all CA requirements
3. **Title company ready** — includes all fields EOs expect
4. **Visually superior** — clean typography, perfect spacing, QR verification

---

## 📋 Current Issues to Fix

### 1. Missing Title/Escrow Reference Numbers
**Problem:** Templates only have `title_order_no` — missing `escrow_no`
**Solution:** Add both prominently in header area

```
Current:
APN: 1234-567-890    Order No: 12345

Better:
APN: 1234-567-890    Title Order: TC-2026-12345    Escrow: ESC-789456
```

### 2. Margins Need Perfection
**Current:** `margin: 0.5in 0.625in 0.625in 0.75in`
**Problem:** Asymmetric, not optimized for recording stamps

**California Recorder Requirements:**
- Top margin: Minimum 2.5" for recorder's stamp area
- Left margin: Minimum 1" for binding
- Right margin: Minimum 0.5"
- Bottom margin: Minimum 0.5"

**Perfect Margins:**
```css
@page {
    size: letter;
    margin: 0.5in 0.5in 0.5in 1in;  /* Top Right Bottom Left */
}

/* But FIRST 2.5" of page is recorder space */
.recorder-header {
    min-height: 2.5in;
}
```

### 3. No QR Code Placement
**Current:** No QR code on templates
**Solution:** Add QR code in footer area of page 1

### 4. Typography Could Be Sharper
**Current:** Basic Times New Roman
**Solution:** Enhanced typography with better hierarchy

---

## 📐 Perfect Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← 1" left margin                                    0.5" right → │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  RECORDING REQUESTED BY:          ┌─────────────────────────────┐  │
│  Pacific Coast Title Company      │                             │  │
│                                   │   SPACE ABOVE THIS LINE     │  │
│  WHEN RECORDED MAIL TO:           │   FOR RECORDER'S USE ONLY   │  │
│  Jane Smith                       │                             │  │
│  123 Main Street                  │        (3.5" × 2.5")        │  │
│  Los Angeles, CA 90001            │                             │  │
│                                   └─────────────────────────────┘  │
│  MAIL TAX STATEMENTS TO:                                           │
│  Same as above                                        ↑ 2.5" min   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  APN: 1234-567-890-00   Title Order: TC-2026-12345   Escrow: 789   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                          GRANT DEED                                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ DOCUMENTARY TRANSFER TAX                                    │   │
│  │                                                             │   │
│  │ The undersigned Grantor(s) declare(s):                      │   │
│  │ Documentary Transfer Tax is $________                       │   │
│  │                                                             │   │
│  │ ☒ Computed on full value of property conveyed, OR           │   │
│  │ ☐ Computed on full value less liens remaining at sale       │   │
│  │                                                             │   │
│  │ ☒ Unincorporated area    ☐ City of _______________          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  FOR VALUABLE CONSIDERATION, receipt of which is hereby             │
│  acknowledged,                                                      │
│                                                                     │
│  JOHN SMITH AND JANE SMITH, HUSBAND AND WIFE ("Grantor")           │
│                                                                     │
│  hereby GRANT(S) to                                                 │
│                                                                     │
│  ROBERT JOHNSON, A SINGLE MAN ("Grantee")                          │
│                                                                     │
│  the following described real property in the County of             │
│  LOS ANGELES, State of California:                                  │
│                                                                     │
│  [Legal Description or "See Exhibit A attached hereto"]             │
│                                                                     │
│  Assessor's Parcel Number: 1234-567-890-00                         │
│                                                                     │
│  Dated: January 22, 2026                                           │
│                                                                     │
│                                                                     │
│  _________________________________                                  │
│  JOHN SMITH                                                        │
│                                                                     │
│  _________________________________                                  │
│  JANE SMITH                                                        │
│                                                                     │
│                                                                     │
│  ┌──────────┐                                                      │
│  │ ▄▄▄▄▄▄▄▄ │  Verify: deedpro.com/verify/DOC-2026-A7X9K           │
│  │ █ QR   █ │  Generated by DeedPro • Prepared for recording       │
│  │ █ CODE █ │                                                      │
│  │ ▀▀▀▀▀▀▀▀ │                                                      │
│  └──────────┘                                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Typography Specification

### Font Hierarchy

| Element | Font | Size | Weight | Style |
|---------|------|------|--------|-------|
| **Document Title** | Times New Roman | 22pt | Bold | UPPERCASE, 4px letter-spacing |
| **Section Headers** | Times New Roman | 12pt | Bold | UPPERCASE |
| **Body Text** | Times New Roman | 12pt | Normal | Justified |
| **Party Names** | Times New Roman | 12pt | Bold | UPPERCASE |
| **Legal Description** | Times New Roman | 11pt | Normal | Justified, pre-wrap |
| **Labels** | Times New Roman | 9pt | Bold | UPPERCASE, 0.5px letter-spacing |
| **Reference Numbers** | Courier New | 10pt | Normal | Monospace for APNs |
| **Footer/QR** | Arial | 8pt | Normal | Clean sans-serif |

### Line Heights

| Element | Line Height |
|---------|-------------|
| Body text | 1.5 |
| Legal description | 1.6 |
| Labels | 1.35 |
| Compact areas | 1.3 |

---

## 📄 Reference Numbers Section

### Required Fields (All Deed Types)

```html
<div class="reference-section">
    <div class="reference-row">
        <!-- Left side: APN (most important) -->
        <div class="reference-primary">
            <span class="ref-label">APN:</span>
            <span class="ref-value apn">{{ apn }}</span>
        </div>
        
        <!-- Right side: Title & Escrow numbers -->
        <div class="reference-secondary">
            {% if title_order_no %}
            <span class="ref-item">
                <span class="ref-label">Title Order:</span>
                <span class="ref-value">{{ title_order_no }}</span>
            </span>
            {% endif %}
            {% if escrow_no %}
            <span class="ref-item">
                <span class="ref-label">Escrow:</span>
                <span class="ref-value">{{ escrow_no }}</span>
            </span>
            {% endif %}
        </div>
    </div>
</div>
```

### CSS for Reference Section

```css
.reference-section {
    border-bottom: 1.5pt solid #000;
    padding-bottom: 0.1in;
    margin-bottom: 0.15in;
}

.reference-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 10pt;
}

.reference-primary {
    font-weight: bold;
}

.reference-secondary {
    display: flex;
    gap: 0.4in;
}

.ref-label {
    font-weight: bold;
    text-transform: uppercase;
    font-size: 9pt;
    letter-spacing: 0.3px;
    margin-right: 0.08in;
}

.ref-value {
    font-weight: normal;
}

.ref-value.apn {
    font-family: "Courier New", monospace;
    letter-spacing: 0.5px;
}
```

---

## 📱 QR Code Footer Section

### Placement
- Bottom of Page 1 (main deed page)
- Left-aligned, with verification text to the right
- Subtle but professional

### HTML Structure

```html
<footer class="deed-footer">
    <div class="qr-verification">
        <div class="qr-code">
            <img src="{{ qr_code_data_url }}" alt="Verification QR Code" />
        </div>
        <div class="verification-text">
            <div class="verify-label">Verify this document:</div>
            <div class="verify-url">deedpro.com/verify/{{ document_id }}</div>
            <div class="verify-meta">
                Generated by DeedPro • {{ now().strftime('%B %d, %Y') }}
            </div>
        </div>
    </div>
</footer>
```

### CSS for Footer

```css
.deed-footer {
    position: absolute;
    bottom: 0.5in;
    left: 1in;
    right: 0.5in;
}

.qr-verification {
    display: flex;
    align-items: center;
    gap: 0.15in;
    padding-top: 0.1in;
    border-top: 0.5pt solid #ccc;
}

.qr-code {
    width: 0.75in;
    height: 0.75in;
    flex-shrink: 0;
}

.qr-code img {
    width: 100%;
    height: 100%;
}

.verification-text {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
    color: #444;
    line-height: 1.4;
}

.verify-label {
    font-weight: bold;
    color: #000;
}

.verify-url {
    font-family: "Courier New", monospace;
    font-size: 9pt;
    color: #7C4DFF;
}

.verify-meta {
    font-size: 7pt;
    color: #888;
    margin-top: 2pt;
}
```

---

## 📐 Perfect Margins & Spacing

### @page Rule

```css
@page {
    size: letter;  /* 8.5in × 11in */
    margin: 0.5in 0.5in 0.75in 1in;
    
    /* 
     * Top: 0.5in (but content starts after 2.5" recorder space)
     * Right: 0.5in
     * Bottom: 0.75in (room for QR footer)
     * Left: 1in (binding edge)
     */
}

@page :first {
    /* First page needs more top margin for recorder */
    margin-top: 0.5in;
}
```

### Recorder Space Box

```css
.recorder-space {
    width: 3.5in;
    height: 2in;           /* Minimum 2" per CA requirements */
    border: 2pt solid #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 0.2in;
}

.recorder-space-label {
    font-family: Arial, sans-serif;
    font-size: 8pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #000;
    text-align: center;
    line-height: 1.5;
}
```

### Content Spacing

```css
/* Section spacing */
.deed-section {
    margin-bottom: 0.2in;
}

/* Paragraph spacing */
.deed-body p {
    margin-bottom: 0.15in;
    text-indent: 0;        /* No indent for legal docs */
    text-align: justify;
}

/* Party names get extra breathing room */
.party-block {
    margin: 0.12in 0;
}

/* Signature blocks */
.signature-entry {
    margin-bottom: 0.4in;  /* Enough room to sign */
}

.signature-line {
    width: 3.5in;
    height: 0.4in;
    border-bottom: 1pt solid #000;
}
```

---

## ✅ Complete Template Checklist

### Header Section
- [ ] Recording Requested By (company name)
- [ ] When Recorded Mail To (full address, 4 lines)
- [ ] Mail Tax Statements To (or "Same as above")
- [ ] Recorder's Space Box (3.5" × 2", right-aligned)

### Reference Line
- [ ] APN (Assessor's Parcel Number)
- [ ] Title Order Number
- [ ] Escrow Number
- [ ] Properly formatted with separating line

### Document Title
- [ ] Centered, bold, uppercase
- [ ] 22pt with letter-spacing
- [ ] Appropriate deed type name

### Documentary Transfer Tax Box
- [ ] Amount field
- [ ] Full value / Less liens checkboxes
- [ ] Unincorporated / City checkboxes
- [ ] City name field if applicable
- [ ] Clear visual border

### Granting Clause
- [ ] "FOR VALUABLE CONSIDERATION..."
- [ ] Grantor name(s) in BOLD UPPERCASE
- [ ] Grant language appropriate to deed type
- [ ] Grantee name(s) in BOLD UPPERCASE
- [ ] Vesting information
- [ ] County name

### Legal Description
- [ ] Proper font size (11pt)
- [ ] Justified alignment
- [ ] Pre-wrap for whitespace
- [ ] Exhibit A reference for long descriptions

### Execution Section
- [ ] Date line with proper formatting
- [ ] Signature lines (3.5" wide)
- [ ] Name under each signature line
- [ ] Capacity/title if applicable

### Footer
- [ ] QR code (0.75" square)
- [ ] Verification URL
- [ ] Generation timestamp
- [ ] "Generated by DeedPro" branding

### Notary Page (Page 2)
- [ ] CA Civil Code §1189 disclaimer box
- [ ] California All-Purpose Acknowledgment
- [ ] Venue (State/County)
- [ ] Date field
- [ ] Notary name field
- [ ] Signer names (pre-filled)
- [ ] Acknowledgment language
- [ ] Penalty of perjury certification
- [ ] Signature line
- [ ] Commission expiration field
- [ ] Seal area (2.25" square)

---

## 🔧 Template Variables Required

### All Templates Need

```python
{
    # Recording Info
    'requested_by': str,           # Company/person requesting recording
    'return_to': {
        'name': str,
        'company': str,
        'address1': str,
        'address2': str,           # Optional
        'city': str,
        'state': str,
        'zip': str
    },
    'mail_tax_to': str,            # Or "Same as above"
    
    # Reference Numbers
    'apn': str,                    # Assessor's Parcel Number
    'title_order_no': str,         # Title company order number
    'escrow_no': str,              # Escrow number (NEW - ADD THIS)
    
    # Parties
    'grantors_text': str,          # Formatted grantor name(s)
    'grantees_text': str,          # Formatted grantee name(s)
    'vesting': str,                # How title is held
    
    # Property
    'county': str,
    'legal_description': str,
    
    # Transfer Tax (Grant, Quitclaim, Warranty)
    'dtt': {
        'amount': str,             # "550.00"
        'basis': str,              # "full" or "less_liens"
        'area_type': str,          # "unincorporated" or "city"
        'city_name': str           # City name if applicable
    },
    
    # Execution
    'execution_date': str,
    
    # Verification (NEW)
    'document_id': str,            # "DOC-2026-A7X9K"
    'qr_code_data_url': str,       # Base64 QR code image
    
    # Utilities
    'now': function                # datetime.now for default date
}
```

---

## 📊 Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Escrow Number** | ❌ Missing | ✅ Prominently displayed |
| **Title Order** | Partial | ✅ Full support |
| **Margins** | Asymmetric | ✅ CA compliant |
| **QR Code** | ❌ None | ✅ Footer verification |
| **Typography** | Basic | ✅ Professional hierarchy |
| **Recorder Space** | 2" | ✅ 2.5" (safer) |
| **Footer** | None | ✅ Verification + branding |

---

## 🚀 Implementation Priority

### Phase 1: Critical Fields (Today)
1. Add `escrow_no` variable to all templates
2. Update reference line to include both Title Order and Escrow
3. Fix margins to CA requirements

### Phase 2: QR Verification (This Week)
1. Add footer section with QR code
2. Pass `document_id` and `qr_code_data_url` to templates
3. Style verification section

### Phase 3: Typography Polish (This Week)
1. Refine font sizes and weights
2. Perfect spacing throughout
3. Test print output

### Phase 4: All Templates (This Week)
Apply changes to all 5 deed types:
1. Grant Deed
2. Quitclaim Deed
3. Interspousal Transfer Deed
4. Warranty Deed
5. Tax Deed

---

## 📝 Notes for Cursor

### Files to Modify

```
templates/
├── grant_deed_ca/
│   └── index.jinja2          # Most common, do first
├── quitclaim_deed_ca/
│   └── index.jinja2
├── interspousal_transfer_ca/
│   └── index.jinja2
├── warranty_deed_ca/
│   └── index.jinja2
├── tax_deed_ca/
│   └── index.jinja2
└── _partials/
    └── notary_acknowledgment.jinja2
```

### Backend Changes Needed

```python
# In deed generation endpoint, add:
- escrow_no parameter
- document_id generation
- qr_code_data_url generation (use qrcode library)
```

### Testing

1. Generate each deed type
2. Print to PDF and verify margins
3. Test QR code scanning
4. Verify all fields display correctly
5. Compare to actual recorded deeds from county

---

*Goal: When an EO downloads a DeedPro deed, they should think "This is the most professional deed template I've ever seen."*
