# Phase 24-G: PDF Deed Templates Redesign with V0

**Date**: November 5, 2025  
**Phase**: 24-G  
**Goal**: Modernize PDF deed templates for professional, legal-compliant documents  
**Approach**: V0 generates HTML/CSS → Convert to Jinja2 templates

---

## 🎯 V0 PROMPT - PDF DEED TEMPLATES

**Copy this entire prompt to V0, then attach your reference image:**

---

### PROJECT CONTEXT

I need you to design **professional, legal-compliant PDF templates** for real estate deed documents. These templates will be rendered as HTML/CSS and converted to PDF using Weasyprint.

**Current System:**
- Backend: Python FastAPI + Jinja2 templates + Weasyprint (HTML → PDF)
- 5 deed types: Grant Deed, Quitclaim Deed, Interspousal Transfer, Warranty Deed, Tax Deed
- Templates use California legal formatting standards
- Generated PDFs are used for county recorder filing

**Reference Image Attached**: Shows the desired professional layout and styling

---

### DEED TYPES TO DESIGN

Please create **5 complete HTML templates**, one for each deed type:

#### 1. **Grant Deed (California)**
**Purpose**: Transfer property with warranties  
**Key Sections**:
- Recording information (requested by, return to)
- Documentary transfer tax section
- APN and county
- Legal description (with exhibit threshold for long descriptions)
- Grantor and Grantee information
- Vesting details
- Consideration (purchase price)
- Signature blocks (Grantor, Notary)
- Recording stamp space (top right, 3" × 4")

#### 2. **Quitclaim Deed (California)**
**Purpose**: Transfer any interest without warranties  
**Key Sections**:
- Recording information
- APN and county  
- Legal description (with exhibit threshold)
- Grantor and Grantee
- Vesting
- Signature blocks (Grantor, Notary)
- Recording stamp space

#### 3. **Interspousal Transfer Deed (California)**
**Purpose**: Transfer between spouses (tax-exempt)  
**Key Sections**:
- Recording information
- Preliminary Change of Ownership Report exemption notice
- APN and county
- Legal description
- Transferor (spouse) and Transferee (spouse)
- Exemption declaration (Rev. & Tax. Code §62, §63)
- Signature blocks
- Recording stamp space

#### 4. **Warranty Deed (California)**
**Purpose**: Transfer with full warranties and covenants  
**Key Sections**:
- Recording information
- Documentary transfer tax
- APN and county
- Legal description (with exhibit threshold)
- Grantor and Grantee
- Vesting
- Warranty covenants (5 traditional covenants)
- Consideration
- Signature blocks
- Recording stamp space

#### 5. **Tax Deed (California)**
**Purpose**: Transfer resulting from tax sale  
**Key Sections**:
- Recording information
- Tax sale reference (sale date, case number)
- APN and county
- Legal description
- Tax Collector as Grantor
- Purchaser as Grantee
- Sale amount
- Signature blocks (Tax Collector)
- Recording stamp space

---

### LEGAL REQUIREMENTS (CRITICAL - MUST FOLLOW)

#### **California Civil Code Compliance:**
1. **§1092**: Legal description required for recordability
2. **§1093**: APN required in all counties
3. **§11911-11934**: Documentary transfer tax declaration
4. **§1180-1189**: Proper acknowledgment and notarization

#### **County Recorder Requirements:**
1. **Recording Stamp Area**: Top right corner, 3" wide × 4" tall (reserved, no content)
2. **Margins**: Minimum 1" top, 0.5" sides and bottom (preferably 1" all sides)
3. **Font**: Legible serif font (Times New Roman, 11-12pt minimum)
4. **Paper Size**: 8.5" × 11" (US Letter)
5. **First Page Header**: "Recording Requested By" and "When Recorded Return To"
6. **Title**: Deed type clearly labeled (centered, bold, all caps)

#### **Legal Description Handling:**
- If ≤600 characters: Display inline in main document
- If >600 characters: Show "See Exhibit A attached hereto" + separate exhibit page
- Exhibit page: Page break, "EXHIBIT A - LEGAL DESCRIPTION" header, full description

#### **Notary Section (Required for all except Tax Deed):**
- State and County appearance
- Date of acknowledgment
- Notary name and commission
- Signature line for notary
- "NOTARY SEAL" indicator box (2" × 2")

---

### DESIGN SPECIFICATIONS

#### **Visual Style (Use Reference Image as Guide):**
- Professional, clean, traditional legal document aesthetic
- Modern typography while maintaining legal formality
- Clear visual hierarchy (headers → subheaders → body text)
- Adequate whitespace for readability
- Subtle borders/dividers where appropriate
- NOT too colorful (this is a legal document)
- Print-friendly (black/dark gray on white)

#### **Typography:**
```css
/* Suggested font stack */
font-family: 'Times New Roman', 'Georgia', serif;

/* Font sizes */
- Document title: 16-18pt, bold, uppercase, centered
- Section headers: 13-14pt, bold
- Body text: 11-12pt, regular
- Legal disclaimers: 10pt, italic
- Footer/page numbers: 9pt
```

#### **Layout Structure:**
```
┌─────────────────────────────────────────────────┐
│ Top margin (1")                    [STAMP AREA] │ ← Top right 3"×4" reserved
│                                    [           ] │
│ Recording Requested By: _________  [           ] │
│ When Recorded Mail To:             [___________] │
│ Name: _______________                            │
│ Address: ____________                            │
│                                                  │
│           GRANT DEED (or other type)             │ ← Centered, bold, 18pt
│                                                  │
│ APN: ___________________  County: __________     │
│                                                  │
│ [Documentary Transfer Tax Section]               │ ← Only for taxable deeds
│                                                  │
│ FOR VALUABLE CONSIDERATION... [legal language]   │
│                                                  │
│ GRANTOR: _____________________________________   │
│ GRANTEE: _____________________________________   │
│                                                  │
│ [Legal Description Section]                      │
│                                                  │
│ [Vesting Section]                                │
│                                                  │
│ [Signature Block - Grantor]                      │
│                                                  │
│ [Notary Acknowledgment Section]                  │
│ State of California         )                    │
│ County of ____________      ) ss.                │
│                                                  │
│ [Notary signature and seal area]                 │
│                                                  │
│ Bottom margin (0.5")                             │
└─────────────────────────────────────────────────┘
```

#### **Color Palette (Minimal):**
- Primary text: `#000000` (black)
- Secondary text: `#333333` (dark gray)
- Borders/dividers: `#CCCCCC` (light gray)
- Background: `#FFFFFF` (white)
- Optional subtle accent: `#F5F5F5` (off-white for section backgrounds)

---

### DYNAMIC CONTENT (Jinja2 Variables)

Your HTML templates should use placeholders that we'll convert to Jinja2. Use this format:

```html
<!-- Static text -->
<p>APN: {{APN_PLACEHOLDER}}</p>
<p>County: {{COUNTY_PLACEHOLDER}}</p>

<!-- For optional fields -->
<p>Requested By: {{REQUESTED_BY_PLACEHOLDER}}</p>

<!-- For legal description with exhibit logic -->
<div>
  <h3>Legal Description:</h3>
  {{LEGAL_DESCRIPTION_PLACEHOLDER}}
  <!-- We'll add conditional logic for exhibit threshold -->
</div>
```

**Common Variables Across All Deeds:**
- `{{APN}}` - Assessor's Parcel Number
- `{{COUNTY}}` - County name
- `{{PROPERTY_ADDRESS}}` - Full property address
- `{{LEGAL_DESCRIPTION}}` - Legal description of property
- `{{GRANTORS_TEXT}}` - Grantor name(s)
- `{{GRANTEES_TEXT}}` - Grantee name(s)
- `{{REQUESTED_BY}}` - Recording requested by (person/company)
- `{{RETURN_TO_NAME}}` - Return document to (name)
- `{{RETURN_TO_ADDRESS}}` - Return address (street, city, state, zip)
- `{{EXECUTION_DATE}}` - Date of signing
- `{{NOTARY_COUNTY}}` - County where notarized
- `{{NOTARY_DATE}}` - Date of notarization

**Deed-Specific Variables:**
- Grant/Warranty Deed: `{{DOCUMENTARY_TAX}}`, `{{CONSIDERATION}}`, `{{CITY_TAX}}`
- Tax Deed: `{{TAX_SALE_DATE}}`, `{{TAX_SALE_AMOUNT}}`, `{{CASE_NUMBER}}`
- Interspousal: `{{TRANSFEROR_NAME}}`, `{{TRANSFEREE_NAME}}`, `{{RELATIONSHIP}}`

---

### WEASYPRINT CSS REQUIREMENTS

**Your CSS must be Weasyprint-compatible. Key constraints:**

```css
/* Page setup */
@page {
  size: letter;  /* 8.5" × 11" */
  margin: 1in 0.5in 0.5in 0.5in;  /* top right bottom left */
  
  @top-right {
    content: "";  /* Reserved for recording stamp */
    width: 3in;
    height: 4in;
  }
}

/* Page breaks */
.page-break {
  page-break-before: always;
}

.avoid-page-break {
  page-break-inside: avoid;
}

/* Weasyprint supports */
- CSS 2.1 + some CSS3 (flexbox, grid are LIMITED)
- Prefer: tables, floats, absolute positioning
- Font embedding: @font-face works
- No JavaScript, no animations
- Print media queries: @media print

/* Avoid */
- CSS Grid (partial support, buggy)
- Complex flexbox (basic works, nested is risky)
- Transform, transition, animation
- Viewport units (vh, vw) - use fixed units
```

**Safe Layout Patterns:**
```css
/* Two-column layout - use float or table */
.two-column-float {
  width: 48%;
  float: left;
  margin-right: 4%;
}

.two-column-table {
  display: table;
  width: 100%;
}

.table-cell {
  display: table-cell;
  width: 50%;
  padding: 0 10px;
}
```

---

### SIGNATURE BLOCKS FORMATTING

**Standard Signature Block Layout:**

```
Dated: ________________, 20____


_________________________________
[Grantor Name]
Grantor


STATE OF CALIFORNIA        )
                           ) ss.
COUNTY OF ____________     )

On ______________, 20____, before me, ________________________,
Notary Public, personally appeared ________________________,
who proved to me on the basis of satisfactory evidence to be
the person(s) whose name(s) is/are subscribed to the within
instrument and acknowledged to me that he/she/they executed
the same in his/her/their authorized capacity(ies), and that
by his/her/their signature(s) on the instrument the person(s),
or the entity upon behalf of which the person(s) acted,
executed the instrument.

I certify under PENALTY OF PERJURY under the laws of the State
of California that the foregoing paragraph is true and correct.

WITNESS my hand and official seal.


_________________________________
Notary Public Signature

[NOTARY SEAL]   ← 2" × 2" box


Commission Expires: ________________
```

---

### DELIVERABLES REQUESTED

Please provide **5 complete HTML files** with embedded CSS:

1. `grant-deed-ca.html` - Grant Deed template
2. `quitclaim-deed-ca.html` - Quitclaim Deed template
3. `interspousal-transfer-ca.html` - Interspousal Transfer template
4. `warranty-deed-ca.html` - Warranty Deed template
5. `tax-deed-ca.html` - Tax Deed template

**Each file should include:**
- Full HTML5 structure (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`)
- Embedded `<style>` block with all CSS
- `@page` rules for Weasyprint
- All required sections with placeholder variables
- Comments indicating where Jinja2 logic will be added
- Recording stamp area reserved (top right)
- Proper signature blocks and notary sections

**Design Requirements:**
- Match the reference image aesthetic (attached)
- Professional legal document appearance
- Clear visual hierarchy
- Print-ready formatting
- Weasyprint-compatible CSS only
- Responsive to content length (text wrapping, page breaks)

---

### EXAMPLE SNIPPET (Grant Deed Header)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Grant Deed - California</title>
  <style>
    @page {
      size: letter;
      margin: 1in 0.5in 0.5in 1in;
    }
    
    body {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
    }
    
    .header {
      margin-bottom: 30px;
    }
    
    .recording-info {
      margin-bottom: 20px;
      font-size: 11pt;
    }
    
    .deed-title {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 40px 0 30px 0;
      letter-spacing: 1px;
    }
    
    .property-info {
      display: table;
      width: 100%;
      margin-bottom: 20px;
    }
    
    .property-row {
      display: table-row;
    }
    
    .property-cell {
      display: table-cell;
      padding: 5px 10px 5px 0;
      border-bottom: 1px solid #000;
    }
    
    .section-header {
      font-size: 13pt;
      font-weight: bold;
      margin: 20px 0 10px 0;
      text-transform: uppercase;
    }
    
    /* More styles... */
  </style>
</head>
<body>
  <div class="header">
    <div class="recording-info">
      <p><strong>Recording Requested By:</strong> {{REQUESTED_BY}}</p>
      <p><strong>When Recorded Mail To:</strong></p>
      <p style="margin-left: 20px;">
        {{RETURN_TO_NAME}}<br>
        {{RETURN_TO_ADDRESS}}
      </p>
    </div>
  </div>
  
  <h1 class="deed-title">Grant Deed</h1>
  
  <div class="property-info">
    <div class="property-row">
      <div class="property-cell"><strong>APN:</strong> {{APN}}</div>
      <div class="property-cell"><strong>County:</strong> {{COUNTY}}</div>
    </div>
  </div>
  
  <!-- Continue with rest of deed content... -->
</body>
</html>
```

---

### SUCCESS CRITERIA

Your templates should:
- ✅ Match the reference image style and professionalism
- ✅ Meet all California Civil Code requirements
- ✅ Include all required sections for each deed type
- ✅ Use Weasyprint-compatible CSS only
- ✅ Have clear placeholder variables for dynamic content
- ✅ Reserve top-right corner for recording stamp
- ✅ Include proper notary acknowledgment sections
- ✅ Be print-ready (proper margins, page breaks)
- ✅ Handle long legal descriptions with exhibit logic placeholders
- ✅ Look professional and trustworthy (for county filing)

---

**Reference Image Attached**: [User will attach their design reference]

**Please generate all 5 deed templates with the styling from the reference image. Make them professional, legally compliant, and beautiful!**

---

## 📋 POST-V0 CONVERSION STEPS

After V0 generates the HTML templates, we'll need to:

### **Step 1: Convert HTML to Jinja2**
Replace placeholder variables with Jinja2 syntax:

```html
<!-- V0's output -->
<p>APN: {{APN}}</p>

<!-- Convert to Jinja2 -->
<p>APN: {{ apn or 'N/A' }}</p>
```

### **Step 2: Add Conditional Logic**
Add exhibit threshold logic for legal descriptions:

```jinja2
{% if legal_description and legal_description|length > exhibit_threshold %}
  <p><strong>Legal Description:</strong> See Exhibit A attached hereto</p>
  
  <div class="page-break"></div>
  
  <h2>EXHIBIT A - LEGAL DESCRIPTION</h2>
  <p>{{ legal_description }}</p>
{% else %}
  <p><strong>Legal Description:</strong> {{ legal_description or 'N/A' }}</p>
{% endif %}
```

### **Step 3: Add Date Functions**
```jinja2
<!-- Current date -->
<p>Date: {{ now().strftime('%B %d, %Y') }}</p>

<!-- Formatted execution date -->
<p>Dated: {{ execution_date or now().strftime('%B %d, %Y') }}</p>
```

### **Step 4: Move to Templates Directory**
```bash
# Save V0's HTML files as Jinja2 templates
templates/
├── grant_deed_ca/
│   └── index.jinja2          # Converted from V0's grant-deed-ca.html
├── quitclaim_deed_ca/
│   └── index.jinja2          # Converted from V0's quitclaim-deed-ca.html
├── interspousal_transfer_ca/
│   └── index.jinja2
├── warranty_deed_ca/
│   └── index.jinja2
└── tax_deed_ca/
    └── index.jinja2
```

### **Step 5: Test PDF Generation**
```bash
# Test each deed type
cd backend
python -c "
from routers.deeds import generate_grant_deed_ca
from models.grant_deed import GrantDeedRenderContext

ctx = GrantDeedRenderContext(
    apn='8381-021-001',
    county='LOS ANGELES',
    grantors_text='JOHN DOE',
    grantees_text='JANE SMITH',
    legal_description='TRACT NO 6654 LOT 44'
)

# This will test the new template
pdf = generate_grant_deed_ca(ctx)
print('PDF generated successfully!')
"
```

### **Step 6: Visual QA Checklist**
- [ ] Recording stamp area is blank (top right, 3"×4")
- [ ] Margins are correct (1" all sides minimum)
- [ ] Font is legible (11-12pt serif)
- [ ] All required sections present
- [ ] Notary section formatted correctly
- [ ] Legal description handles exhibit threshold
- [ ] Signature blocks have adequate space
- [ ] Page breaks work correctly for exhibits
- [ ] Document looks professional for county filing
- [ ] No Weasyprint rendering errors

---

## 🎯 PHASE 24-G SUCCESS METRICS

### **Completion Criteria:**
1. ✅ V0 generates all 5 deed templates
2. ✅ Templates converted to Jinja2 format
3. ✅ All placeholders mapped to correct variables
4. ✅ Conditional logic added (exhibit threshold, optional fields)
5. ✅ Templates saved in `templates/` directory
6. ✅ PDF generation tested for all 5 deed types
7. ✅ Visual QA passed (professional, legal-compliant)
8. ✅ No Weasyprint errors
9. ✅ County recorder requirements met
10. ✅ User approves final PDF appearance

### **Files to Create/Update:**
- `templates/grant_deed_ca/index.jinja2` ✅
- `templates/quitclaim_deed_ca/index.jinja2` ✅
- `templates/interspousal_transfer_ca/index.jinja2` ✅
- `templates/warranty_deed_ca/index.jinja2` ✅
- `templates/tax_deed_ca/index.jinja2` ✅
- `v0-prompts/phase-24g-pdf-templates-redesign.md` ✅ (this file)
- `PHASE_24G_COMPLETE_SUMMARY.md` (after completion)

---

## 📚 RELATED DOCUMENTATION

- `docs/backend/PDF_GENERATION_SYSTEM.md` - Current PDF system
- `docs/wizard/ADDING_NEW_DEED_TYPES.md` - Template creation guide
- `backend/models/` - Pydantic models for each deed type
- `backend/routers/deeds.py` - PDF generation endpoints
- `docs/V0_INTEGRATION_LESSONS_LEARNED.md` - V0 integration patterns

---

**Phase 24-G**: Professional PDF Template Redesign  
**Status**: Ready for V0 Prompt  
**Next**: User attaches reference image → V0 generates templates → Convert to Jinja2


