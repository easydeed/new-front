# 📄 PDF Generation System

**Last Updated**: October 30, 2025  
**Purpose**: Technical documentation for DeedPro's PDF generation pipeline

---

## 🎯 **OVERVIEW**

DeedPro generates legal deed PDFs using:
1. **Jinja2** - HTML template rendering
2. **Weasyprint** - HTML-to-PDF conversion  
3. **FastAPI** - REST API endpoints
4. **Pydantic** - Request validation

**Supported Deed Types**:
- Grant Deed (CA)
- Quitclaim Deed (CA)
- Interspousal Transfer Deed (CA)
- Warranty Deed (CA)
- Tax Deed (CA)

---

## 🏗️ **ARCHITECTURE**

### **Generation Flow**:
```
Frontend Request
  ↓
FastAPI Endpoint (/api/generate/{deed-type}-ca)
  ↓
Pydantic Validation (Required fields, data types)
  ↓
Jinja2 Template Rendering (HTML generation)
  ↓
Weasyprint Conversion (HTML → PDF)
  ↓
StreamingResponse (PDF bytes to client)
```

---

## 📁 **FILE STRUCTURE**

### **Backend Files**:
```
backend/
├── routers/
│   ├── deeds.py               # Grant Deed endpoint
│   └── deeds_extra.py         # Other deed types (Phase 17-19)
├── models/
│   ├── grant_deed.py          # Grant Deed Pydantic model
│   ├── quitclaim_deed.py      # Quitclaim Pydantic model
│   ├── interspousal_transfer.py
│   ├── warranty_deed.py
│   └── tax_deed.py
```

### **Template Files**:
```
templates/
├── grant_deed_ca/
│   └── index.jinja2           # Grant Deed template
├── quitclaim_deed_ca/
│   └── index.jinja2           # Quitclaim template
├── interspousal_transfer_ca/
│   └── index.jinja2
├── warranty_deed_ca/
│   └── index.jinja2
└── tax_deed_ca/
    └── index.jinja2
```

---

## 🔧 **IMPLEMENTATION DETAILS**

### **1. Pydantic Models**

**Location**: `backend/models/{deed}_deed.py`

**Base Context** (All deed types inherit from this):
```python
class BaseDeedContext(BaseModel):
    requested_by: Optional[str] = None
    title_company: Optional[str] = None
    escrow_no: Optional[str] = None
    title_order_no: Optional[str] = None
    return_to: Optional[Dict[str, Optional[str]]] = None
    
    apn: Optional[str] = None
    county: Optional[str] = None
    legal_description: Optional[str] = None
    property_address: Optional[str] = None
    
    grantors_text: Optional[str] = None
    grantees_text: Optional[str] = None
    
    execution_date: Optional[str] = None  # YYYY-MM-DD
    exhibit_threshold: int = 600
    
    @validator('county')
    def county_optional_for_pdf(cls, v):
        # ✅ PHASE 19 FIX: Allow empty county
        return v or ''
```

**Phase 19 Critical Fix**:
- ❌ **OLD**: Strict validators rejected empty fields → 500 errors
- ✅ **NEW**: Permissive validators allow blanks → PDF template handles display

**Why**: Not all data is available at PDF generation time. Templates can show "N/A" or blank fields.

---

### **2. FastAPI Endpoints**

#### **Grant Deed** (`backend/routers/deeds.py`):
```python
@router.post("/grant-deed-ca", response_class=StreamingResponse)
async def generate_grant_deed_ca(
    ctx: GrantDeedRenderContext,
    user_id: str = Depends(get_current_user_id)
):
    # Render HTML
    template = env.get_template("grant_deed_ca/index.jinja2")
    html = template.render(
        now=datetime.now,  # ← CRITICAL: Pass function for template
        datetime=datetime,
        **ctx.dict()
    )
    
    # Convert to PDF
    from weasyprint import HTML
    pdf_bytes = HTML(string=html, encoding='utf-8').write_pdf()
    
    # Stream response
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=grant_deed.pdf"}
    )
```

#### **Other Deed Types** (`backend/routers/deeds_extra.py`):
**Added**: Phase 17-19

**Pattern** (Same for all deed types):
```python
@router.post("/quitclaim-deed-ca", response_class=StreamingResponse)
async def generate_quitclaim_deed_ca(ctx: QuitclaimDeedContext):
    pdf = _render_pdf("quitclaim_deed_ca/index.jinja2", ctx.dict())
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=quitclaim_deed.pdf"}
    )

def _render_pdf(template_path: str, ctx: Dict[str, Any]) -> bytes:
    # ✅ PHASE 19 FIX: Add datetime functions to context
    from datetime import datetime
    ctx['now'] = datetime.now  # Pass function, not result!
    ctx['datetime'] = datetime
    
    template = env.get_template(template_path)
    html = template.render(**ctx)
    
    from weasyprint import HTML
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        HTML(string=html, encoding='utf-8').write_pdf(tmp.name)
        with open(tmp.name,'rb') as f:
            pdf = f.read()
    return pdf
```

**Phase 19 Critical Fix**:
- ❌ **OLD**: Missing `now()` function in context → Template error: `'now' is undefined`
- ✅ **NEW**: Explicitly pass `datetime.now` function to Jinja context

**Why**: Templates use `{{ now().strftime('%B %d, %Y') }}` for current date formatting.

---

### **3. Jinja2 Templates**

**Location**: `templates/{deed_type}_ca/index.jinja2`

**Common Template Features**:
```jinja2
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            size: letter;
            margin: 0.5in;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
        }
    </style>
</head>
<body>
    <h1>{{ deed_title }}</h1>
    
    {# Current date using now() function #}
    <p>Date: {{ now().strftime('%B %d, %Y') }}</p>
    
    {# Property information #}
    <p>APN: {{ apn or 'N/A' }}</p>
    <p>County: {{ county or 'N/A' }}</p>
    
    {# Legal description with exhibit threshold #}
    {% if legal_description|length > exhibit_threshold %}
        <p>See Exhibit A attached</p>
        <div class="page-break"></div>
        <h2>Exhibit A - Legal Description</h2>
        <p>{{ legal_description }}</p>
    {% else %}
        <p>{{ legal_description }}</p>
    {% endif %}
    
    {# Parties #}
    <p>Grantor: {{ grantors_text }}</p>
    <p>Grantee: {{ grantees_text }}</p>
</body>
</html>
```

**Key Template Patterns**:
- Use `{{ field or 'N/A' }}` for optional fields
- Check `|length` for long text (exhibit threshold)
- Format dates with `now().strftime()`
- Use CSS `@page` for legal document formatting

---

### **4. Frontend Integration**

#### **Modern Wizard** (Canonical Adapter):
**File**: `frontend/src/lib/deeds/finalizeDeed.ts`

```typescript
const backendPayload = {
  deed_type: 'quitclaim-deed',  // Hyphenated format
  property_address: canonical.property.address,
  apn: canonical.property.apn,
  county: canonical.property.county,
  legal_description: canonical.property.legalDescription,
  grantor_name: canonical.parties.grantor.name,
  grantee_name: canonical.parties.grantee.name,
  requested_by: canonical.requestDetails.requestedBy,
  source: 'modern-canonical'
};

// Save to database
await fetch('/api/deeds/create', {
  method: 'POST',
  body: JSON.stringify(backendPayload)
});

// Redirect to preview page for PDF generation
router.push(`/deeds/${deedId}/preview?mode=modern`);
```

#### **Classic Wizard** (Direct Generation):
**File**: `frontend/src/features/wizard/steps/Step5PreviewFixed.tsx`

```typescript
// Get PDF generation endpoint
import { getGenerateEndpoint } from '../context/docEndpoints';
const endpoint = getGenerateEndpoint(docType);  // e.g., '/api/generate/quitclaim-deed-ca'

// Build context
const contextData = contextBuilder(wizardData);

// Generate PDF
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(contextData)
});

const blob = await response.blob();
// Display PDF or download
```

**docType Format Mapping** (`frontend/src/features/wizard/context/docEndpoints.ts`):
```typescript
export const DOC_ENDPOINTS: Record<string, string> = {
  'grant-deed': '/api/generate/grant-deed-ca',
  'grant_deed': '/api/generate/grant-deed-ca',
  
  'quitclaim-deed': '/api/generate/quitclaim-deed-ca',
  'quitclaim_deed': '/api/generate/quitclaim-deed-ca',
  'quitclaim': '/api/generate/quitclaim-deed-ca',  // ✅ Canonical format
  
  // ... other deed types
};
```

**Phase 19 Critical Fix**:
- Support **3 docType formats**: `canonical`, `snake_case`, `hyphenated`
- Why: Different parts of system use different formats

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue #1: 500 Error - County/Field Required**
**Symptom**: PDF generation fails with `ValueError: County is required`  
**Root Cause**: Strict Pydantic validator rejecting empty values  
**Fix** (Phase 19):
```python
# ❌ WRONG
@validator('county')
def county_required(cls, v):
    if not v:
        raise ValueError('County is required')

# ✅ CORRECT
@validator('county')
def county_optional_for_pdf(cls, v):
    return v or ''  # Allow empty, template handles display
```

---

### **Issue #2: Template Error - 'now' is undefined**
**Symptom**: `jinja2.exceptions.UndefinedError: 'now' is undefined`  
**Root Cause**: Jinja context missing `now()` function  
**Fix** (Phase 19):
```python
# ❌ WRONG
template.render(**ctx)

# ✅ CORRECT
ctx['now'] = datetime.now  # Pass function, not datetime.now()!
ctx['datetime'] = datetime
template.render(**ctx)
```

---

### **Issue #3: Wrong PDF Generated (e.g., Grant Deed instead of Quitclaim)**
**Symptom**: User requests Quitclaim, gets Grant Deed PDF  
**Root Cause**: docType format mismatch (canonical vs hyphenated)  
**Fix** (Phase 19):
```typescript
// Support ALL 3 formats in docEndpoints.ts
'quitclaim': '/api/generate/quitclaim-deed-ca',       // Canonical
'quitclaim_deed': '/api/generate/quitclaim-deed-ca',  // Snake case
'quitclaim-deed': '/api/generate/quitclaim-deed-ca',  // Hyphenated
```

---

## ✅ **CHECKLIST: Adding a New Deed Type**

### **Backend**:
1. ✅ Create Pydantic model in `backend/models/{deed}_deed.py`
   - Inherit from `BaseDeedContext`
   - Use permissive validators (allow empty fields)
   
2. ✅ Create Jinja2 template in `templates/{deed}_ca/index.jinja2`
   - Use CSS `@page` for legal formatting
   - Handle optional fields with `{{ field or 'N/A' }}`
   - Use `now().strftime()` for dates
   
3. ✅ Add endpoint in `backend/routers/deeds_extra.py`
   ```python
   @router.post("/{deed}-deed-ca", response_class=StreamingResponse)
   async def generate_{deed}_deed_ca(ctx: {Deed}DeedContext):
       pdf = _render_pdf("{deed}_deed_ca/index.jinja2", ctx.dict())
       return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf")
   ```
   
4. ✅ Ensure `_render_pdf` passes `now` and `datetime` to context

### **Frontend**:
5. ✅ Add endpoint mapping in `frontend/src/features/wizard/context/docEndpoints.ts`
   - Add **all 3 formats**: canonical, snake_case, hyphenated
   
6. ✅ Create canonical adapter in `frontend/src/utils/canonicalAdapters/{deed}.ts`
   - Map UI state → backend schema
   
7. ✅ Test end-to-end:
   - Search property → Fill wizard → Generate PDF
   - Verify all fields appear correctly
   - Check PDF formatting (margins, fonts)

---

## 📊 **PERFORMANCE**

**Typical Generation Time**: 1-3 seconds  
**Factors**:
- Template complexity
- Legal description length (exhibit threshold)
- Server load

**Optimization**:
- Use exhibit threshold (600 chars) for long legal descriptions
- Cache Jinja environment
- Stream PDF response (don't load entire PDF in memory)

---

## 🔗 **RELATED DOCUMENTATION**

- [ROUTES.md](ROUTES.md) → API endpoints reference
- [SITEX_FIELD_MAPPING.md](../wizard/SITEX_FIELD_MAPPING.md) → Property data enrichment
- [ADDING_NEW_DEED_TYPES.md](../wizard/ADDING_NEW_DEED_TYPES.md) → Step-by-step guide
- [BREAKTHROUGHS.md](../../BREAKTHROUGHS.md) → Recent fixes and discoveries

---

**Key Lessons** (Phase 16-20):
1. ✅ Use permissive Pydantic validators (allow empty fields)
2. ✅ Always pass `now` and `datetime` to Jinja context
3. ✅ Support 3 docType formats for robustness
4. ✅ Test with real SiteX data (county, legal description)
5. ✅ Handle optional fields gracefully in templates
