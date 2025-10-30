# 📚 Adding New Deed Types

**Last Updated**: October 30, 2025  
**Purpose**: Step-by-step guide for adding new deed types to DeedPro

---

## 🎯 **CURRENT DEED TYPES**

✅ **Implemented** (Phase 17-19):
- Grant Deed (CA)
- Quitclaim Deed (CA)
- Interspousal Transfer Deed (CA)
- Warranty Deed (CA)
- Tax Deed (CA)

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Two Wizard Paths**:
1. **Modern Wizard**: Canonical Adapter → Backend
2. **Classic Wizard**: Context Builder → Backend

**Both paths end at**: PDF Generation (Jinja2 + Weasyprint)

---

## ✅ **COMPLETE CHECKLIST**

Use this checklist to add a new deed type:

### **Backend** (Required):
- [ ] 1. Create Pydantic model (`backend/models/{deed}_deed.py`)
- [ ] 2. Create Jinja2 template (`templates/{deed}_ca/index.jinja2`)
- [ ] 3. Add endpoint (`backend/routers/deeds_extra.py`)
- [ ] 4. Test PDF generation

### **Frontend - Modern Wizard** (Optional):
- [ ] 5. Create canonical adapter (`frontend/src/utils/canonicalAdapters/{deed}.ts`)
- [ ] 6. Add to adapter index (`canonicalAdapters/index.ts`)
- [ ] 7. Add docType mapping (`docEndpoints.ts`)
- [ ] 8. Create prompt flow (`promptFlows.ts`)

### **Frontend - Classic Wizard** (Optional):
- [ ] 9. Create context builder (`frontend/src/features/wizard/context/buildContext.ts`)
- [ ] 10. Add to docEndpoints.ts
- [ ] 11. Test wizard flow

---

## 📝 **STEP-BY-STEP GUIDE**

### **STEP 1: Create Pydantic Model**

**File**: `backend/models/{deed_name}_deed.py`

**Pattern** (Copy from existing deed):
```python
from pydantic import BaseModel, validator
from typing import Optional, Dict
from datetime import date

class BaseDeedContext(BaseModel):
    """Base context for all deed types"""
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
    
    execution_date: Optional[str] = None
    exhibit_threshold: int = 600
    
    # ✅ PHASE 19 LESSON: Use permissive validators!
    @validator('county')
    def county_optional_for_pdf(cls, v):
        return v or ''  # Allow empty, template handles display
    
    @validator('execution_date', pre=True, always=False)
    def validate_date_format(cls, v):
        if not v:
            return v
        date.fromisoformat(v)  # Validate format only
        return v

# Your deed-specific model
class YourDeedContext(BaseDeedContext):
    """Context for Your Deed Type"""
    # Add deed-specific fields here
    pass
```

**Key Lessons** (Phase 19):
- ✅ Use permissive validators (allow empty fields)
- ✅ Don't raise errors for missing data
- ✅ Let templates handle blank fields

---

### **STEP 2: Create Jinja2 Template**

**File**: `templates/{deed_name}_ca/index.jinja2`

**Pattern**:
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
            line-height: 1.4;
        }
        .header {
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>YOUR DEED TYPE</h1>
    </div>
    
    {# Current Date #}
    <p>Date: {{ now().strftime('%B %d, %Y') }}</p>
    
    {# Recording Information #}
    <p>Recording Requested By: {{ requested_by or 'N/A' }}</p>
    <p>When Recorded Mail To: {{ return_to.name or 'N/A' }}</p>
    
    {# Property Information #}
    <p>APN: {{ apn or 'N/A' }}</p>
    <p>County: {{ county or 'N/A' }}</p>
    
    {# Legal Description with Exhibit Threshold #}
    {% if legal_description and legal_description|length > exhibit_threshold %}
        <p><strong>Legal Description:</strong> See Exhibit A attached hereto</p>
        
        <div style="page-break-before: always;"></div>
        
        <h2>Exhibit A - Legal Description</h2>
        <p>{{ legal_description }}</p>
    {% else %}
        <p><strong>Legal Description:</strong> {{ legal_description or 'N/A' }}</p>
    {% endif %}
    
    {# Parties #}
    <p><strong>Grantor:</strong> {{ grantors_text or '_____________________' }}</p>
    <p><strong>Grantee:</strong> {{ grantees_text or '_____________________' }}</p>
    
    {# Signature Section #}
    <div style="margin-top: 40px;">
        <p>Dated: ________________</p>
        <br><br>
        <p>_____________________________</p>
        <p>Grantor Signature</p>
    </div>
</body>
</html>
```

**Key Patterns**:
- Use `{{ field or 'N/A' }}` for optional fields
- Use `now().strftime()` for dates
- Check `|length` for exhibit threshold
- Use `page-break-before: always` for exhibits

---

### **STEP 3: Add Backend Endpoint**

**File**: `backend/routers/deeds_extra.py`

**Pattern**:
```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from backend.models.your_deed import YourDeedContext
import io
import tempfile
from datetime import datetime

router = APIRouter()

def _render_pdf(template_path: str, ctx: Dict[str, Any]) -> bytes:
    """Helper to render PDF from Jinja template"""
    # ✅ PHASE 19 CRITICAL: Add datetime functions to context
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

@router.post("/your-deed-ca", response_class=StreamingResponse)
async def generate_your_deed_ca(ctx: YourDeedContext):
    """Generate Your Deed PDF"""
    pdf = _render_pdf("your_deed_ca/index.jinja2", ctx.dict())
    
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=your_deed.pdf"
        }
    )
```

**Register Router** (`backend/main.py`):
```python
from backend.routers import deeds_extra
app.include_router(deeds_extra.router, prefix="/api/generate", tags=["Deeds Extra"])
```

---

### **STEP 4: Create Canonical Adapter (Modern Wizard)**

**File**: `frontend/src/utils/canonicalAdapters/yourDeed.ts`

**Pattern**:
```typescript
export function toCanonical(state: any) {
  return {
    deedType: 'your-deed',  // Hyphenated format for backend
    property: {
      address: state.propertyAddress || state.fullAddress || null,
      apn: state.apn || null,
      county: state.county || null,
      legalDescription: state.legalDescription || null,
    },
    parties: {
      grantor: { name: state.grantorName || null },
      grantee: { name: state.granteeName || null },
    },
    vesting: { description: state.vesting || null },
    requestDetails: {
      requestedBy: state.requestedBy || null,
    },
  };
}
```

---

### **STEP 5: Register in Adapter Index**

**File**: `frontend/src/utils/canonicalAdapters/index.ts`

**Add to switch statement** (support ALL 3 formats):
```typescript
import * as yourDeed from './yourDeed';

export function toCanonicalFor(docType: string, state: any): any {
  switch (docType) {
    // ... existing cases ...
    
    // ✅ PHASE 19 LESSON: Support 3 formats!
    case 'your_deed':           // Canonical
    case 'your-deed':           // Hyphenated
    case 'yourDeed':            // CamelCase
      return yourDeed.toCanonical(state);
    
    default:
      console.warn('[toCanonicalFor] Unknown docType:', docType);
      return grant(state);  // Fallback
  }
}
```

---

### **STEP 6: Add to Endpoint Mapping**

**File**: `frontend/src/features/wizard/context/docEndpoints.ts`

**Add all 3 formats**:
```typescript
export const DOC_ENDPOINTS: Record<string, string> = {
  // ... existing mappings ...
  
  // ✅ Support ALL formats
  'your-deed': '/api/generate/your-deed-ca',
  'your_deed': '/api/generate/your-deed-ca',
  'yourDeed': '/api/generate/your-deed-ca',
};
```

---

### **STEP 7: Create Prompt Flow (Modern Wizard)**

**File**: `frontend/src/features/wizard/mode/flows/promptFlows.ts`

**Pattern**:
```typescript
export const promptFlows: Record<DocType, PromptFlow> = {
  // ... existing flows ...
  
  your_deed: {
    steps: [
      {
        id: 'grantor',
        question: 'Who is transferring the property?',
        fieldKey: 'grantorName',
        prefillFrom: (data) => data.currentOwnerPrimary
      },
      {
        id: 'grantee',
        question: 'Who is receiving the property?',
        fieldKey: 'granteeName'
      },
      {
        id: 'requestedBy',
        question: 'Recording requested by?',
        fieldKey: 'requestedBy',
        inputType: 'partnersCombo'
      },
      // Add more questions as needed
    ]
  }
};
```

---

### **STEP 8: Test End-to-End**

#### **Modern Wizard Test**:
```bash
1. Navigate to: /create-deed/your-deed?mode=modern
2. Search property: "1358 5th St, La Verne, CA 91750"
3. Answer all prompts
4. Review SmartReview summary
5. Click "Confirm & Finalize"
6. Generate PDF on preview page
7. Verify all fields appear correctly
```

#### **Classic Wizard Test**:
```bash
1. Navigate to: /create-deed/your-deed
2. Search property
3. Fill all 5 steps
4. Generate PDF at Step 5
5. Verify PDF fields
6. Click "Finalize Deed"
7. Verify redirect and save
```

---

## 🐛 **COMMON ISSUES & SOLUTIONS**

### **Issue #1: 500 Error - Field Required**
**Cause**: Strict Pydantic validator  
**Fix**: Use permissive validators (allow empty)

### **Issue #2: Template Error - 'now' is undefined**
**Cause**: Missing datetime functions in context  
**Fix**: Add `ctx['now'] = datetime.now` in `_render_pdf`

### **Issue #3: Wrong PDF Generated**
**Cause**: docType format mismatch  
**Fix**: Add ALL 3 formats to `DOC_ENDPOINTS`

### **Issue #4: Fields Not Hydrating**
**Cause**: SiteX field mapping incorrect  
**Fix**: Check [SITEX_FIELD_MAPPING.md](SITEX_FIELD_MAPPING.md)

---

## 📊 **TIME ESTIMATES**

| Step | Time | Difficulty |
|------|------|------------|
| Pydantic Model | 15 min | Easy |
| Jinja2 Template | 1-2 hours | Medium |
| Backend Endpoint | 15 min | Easy |
| Canonical Adapter | 30 min | Easy |
| Prompt Flow | 30 min | Medium |
| Testing | 30 min | Easy |
| **Total** | **3-4 hours** | **Medium** |

---

## 🔗 **RELATED DOCUMENTATION**

- [PDF_GENERATION_SYSTEM.md](../backend/PDF_GENERATION_SYSTEM.md) → PDF generation details
- [ARCHITECTURE.md](ARCHITECTURE.md) → Modern vs Classic wizards
- [SITEX_FIELD_MAPPING.md](SITEX_FIELD_MAPPING.md) → Property enrichment
- [BREAKTHROUGHS.md](../../BREAKTHROUGHS.md) → Recent fixes and patterns

---

## 🎓 **KEY LESSONS** (Phase 16-19)

1. ✅ **Permissive Validators**: Allow empty fields, templates handle blanks
2. ✅ **datetime Functions**: Always pass `now` and `datetime` to Jinja
3. ✅ **Multiple Formats**: Support canonical, snake_case, hyphenated
4. ✅ **SiteX Fields**: Use correct nested paths (CountyName, LegalDescriptionInfo)
5. ✅ **Test Both Wizards**: Modern AND Classic flows

---

**Need Help?** Check [BREAKTHROUGHS.md](../../BREAKTHROUGHS.md) for common patterns and solutions!
