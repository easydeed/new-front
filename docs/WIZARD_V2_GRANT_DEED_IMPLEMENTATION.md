# 📄 Grant Deed Wizard v2 — Implementation Guide

## 📋 Overview

We rebuilt Steps 2–5 of the Grant Deed wizard and created a new backend PDF endpoint. The implementation provides:

✅ **Aligned with dynamic wizard flow**: Next.js → FastAPI → Jinja → PDF  
✅ **Structured, stateful Grant Deed details** with proper validation  
✅ **Pixel-perfect PDF output** on US Letter (8.5 × 11 in) matching Pre-Listing Report Analysis formatting  
✅ **Configurable page setup** (margins, size) with locked defaults capability  

---

## 🎯 Frontend Implementation (Steps 2–5)

### **Step 2 — Request Details**
- **Inputs**: Requested By, Title Company, Escrow/Order #, Title Order #, Mail-To block, APN
- **AI Smart Fill**: Mail-To suggestion from PIQ (Step 1 property data) using existing AI integration
- **Layout**: Two-column grid with bottom-border inputs (minimalist, theme-consistent)
- **Route**: `frontend/src/features/wizard/steps/Step2RequestDetails.tsx`

### **Step 3 — Declarations & Documentary Transfer Tax**
- **Inputs**: DTT amount, Computation basis (full vs. less liens), Area type (Unincorporated vs. City)
- **Conditional**: City name input appears when "City" is selected
- **Route**: `frontend/src/features/wizard/steps/Step3DeclarationsTax.tsx`

### **Step 4 — Grantors/Grantees & Property**
- **Grantors**: Prefilled from TitlePoint enrichment (editable text box)
- **Grantees**: User enters manually
- **County**: Single input (auto-filled from Step 1)
- **Legal Description**: Large text area (auto-exhibit if >600 chars)
- **Route**: `frontend/src/features/wizard/steps/Step4PartiesProperty.tsx`

### **Step 5 — Preview & Generate**
- **Preview**: On-screen preview matches Jinja template output exactly
- **Edit Shortcuts**: Jump back to prior steps with dedicated buttons
- **PDF Generation**: POSTs to `/api/generate/grant-deed-ca`
- **Route**: `frontend/src/features/wizard/steps/Step5Preview.tsx`

### **UI Primitives**
- **`InputUnderline`**: Bottom-border inputs with labels and hints
- **`TextareaUnderline`**: Multi-line inputs with minimalist styling
- **`MoneyInput`**: Specialized input with $ indicator
- **`RadioGroupRow`**: Clean radio button groups
- **Location**: `frontend/src/components/ui/`

---

## 🔧 Backend Implementation (FastAPI + Jinja)

### **Endpoint Configuration**
- **Path**: `POST /api/generate/grant-deed-ca`
- **Model**: `GrantDeedRenderContext`
- **Template**: `templates/grant_deed_ca/index.jinja2` (ROOT templates folder)
- **Renderer**: WeasyPrint with explicit Letter + margins
- **Authentication**: JWT required via `Authorization: Bearer {token}`

### **Template Structure** 
**⚠️ IMPORTANT**: Templates are in ROOT `templates/` folder, NOT `backend/templates/`

```
templates/grant_deed_ca/
├── index.jinja2                    # Main template with @page setup
├── header_return_block.jinja2      # Recording & Mail-To section  
├── body_deed.jinja2                # DTT declarations & granting language
└── footer_execution_notary.jinja2  # Signatures & notary acknowledgment

templates/_macros/
└── notary_ack.jinja2               # California All-Purpose Acknowledgment
```

### **Data Model**
```python
class GrantDeedRenderContext(BaseModel):
    # Request Details (Step 2)
    requested_by: Optional[str]
    title_company: Optional[str]
    escrow_no: Optional[str]
    title_order_no: Optional[str]
    return_to: Optional[Dict[str, Optional[str]]]  # Mail-To block
    apn: Optional[str]

    # Transfer Tax (Step 3)  
    dtt: Optional[Dict[str, Optional[str]]]  # amount, basis, area_type, city_name

    # Parties & Property (Step 4)
    grantors_text: Optional[str]
    grantees_text: Optional[str]
    county: Optional[str]
    legal_description: Optional[str]
    execution_date: Optional[str]

    # PDF Configuration
    exhibit_threshold: int = 600
    recorder_profile: Optional[Dict[str, Any]] = None
    page: PageSetup = PageSetup()
```

### **Page Setup Configuration**
```python
class PageMargins(BaseModel):
    top: str = "1in"     # Legal compliance standard
    right: str = "1in"
    bottom: str = "1in" 
    left: str = "1in"

class PageSetup(BaseModel):
    size: str = "Letter"   # "Letter" or explicit "8.5in 11in"
    margins: PageMargins = PageMargins()
```

---

## 📐 Pixel-Perfect PDF Generation

### **Page Setup (US Letter)**
At the top of `index.jinja2`:
```jinja2
{% set m = page.margins or {'top':'1in','right':'1in','bottom':'1in','left':'1in'} %}
<style>
  @page {
    size: 8.5in 11in;
    margin: {{ m.top }} {{ m.right }} {{ m.bottom }} {{ m.left }};
  }
  /* Legal compliance fonts and spacing */
  html, body { 
    font-family: 'Times New Roman', serif; 
    font-size: 12pt;
    line-height: 1.4;
  }
</style>
```

### **Template Block Structure**
1. **Header Block**: Recording box, Mail-To address, Order/APN info
2. **Body Block**: DTT declarations, granting language, legal description
3. **Footer Block**: Signature lines, notary acknowledgment
4. **Auto Exhibit A**: Triggered for legal descriptions >600 characters

### **WeasyPrint Integration**
The router uses WeasyPrint (matching existing pattern):
```python
with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
    HTML(string=html_content, encoding='utf-8').write_pdf(tmp_file.name)
```

---

## 🔒 Locking Page Defaults (Optional)

### **Option A — Hard-code in Model**
```python
class PageMargins(BaseModel):
    top: str = "0.75in"   # Pre-Listing Report margins
    right: str = "0.5in"
    bottom: str = "0.5in"
    left: str = "0.5in"
```

### **Option B — Central Configuration**
Create `backend/config/page_profiles.json`:
```json
{
  "default": { 
    "size": "Letter", 
    "margins": { "top": "1in", "right": "1in", "bottom": "1in", "left": "1in" } 
  },
  "grant_deed": { 
    "size": "Letter", 
    "margins": { "top": "1in", "right": "1in", "bottom": "1in", "left": "1in" } 
  }
}
```

---

## 🛤️ Access Points & Routes

### **New Wizard Route**
- **URL**: `/create-deed/grant-deed`
- **Component**: `frontend/src/app/create-deed/grant-deed/page.tsx`
- **Features**: Complete 5-step isolated wizard experience

### **API Endpoint** 
- **URL**: `POST /api/generate/grant-deed-ca`
- **Authentication**: JWT Bearer token required
- **Response**: PDF download with `Content-Disposition: attachment`

### **State Management**
- **Validation**: Zod schemas in `frontend/src/features/wizard/validation/grantDeed.ts`
- **Types**: TypeScript interfaces in `frontend/src/features/wizard/types.ts`
- **Storage**: localStorage persistence with auto-save functionality

---

## 🔄 Integration with Existing Systems

### **Property Search Integration**
- Uses existing `PropertySearchWithTitlePoint` component
- Carries forward APN, county, and TitlePoint enrichment data
- Compatible with existing SiteX and Google Places APIs

### **AI Integration**
- **PIQ Smart Fill**: Uses existing AI suggestion system for mail-to addresses
- **TitlePoint Prefill**: Leverages current TitlePoint ownership data
- **Client-side processing**: AI suggestions happen in frontend, templates render results

### **Authentication**
- Uses existing JWT authentication system
- Requires `localStorage.getItem('access_token')` for API calls
- Proper 401 error handling with user-friendly messages

---

## ✅ Key Accomplishments

### **Technical Features**
- ✅ **Minimalist UI**: Bottom-border inputs with 2-column responsive layouts
- ✅ **AI-Powered**: Smart suggestions using existing PIQ and TitlePoint data
- ✅ **Pixel-Perfect**: US Letter with 1-inch margins matching legal standards
- ✅ **Production Ready**: Full validation, error handling, and auto-save

### **Developer Experience**  
- ✅ **Reusable Components**: UI primitives can be used for other documents
- ✅ **Clear Separation**: Frontend steps, backend models, and templates are isolated
- ✅ **Extensible Pattern**: Easy to adapt for Quitclaim, Warranty, etc.
- ✅ **Full Documentation**: Complete implementation guide and troubleshooting

### **User Experience**
- ✅ **Step-by-step Guidance**: Clear progress indicators and validation
- ✅ **Edit Shortcuts**: Jump back to any step from preview screen
- ✅ **Auto-save**: Never lose progress with localStorage persistence
- ✅ **WYSIWYG Preview**: On-screen preview matches PDF output exactly

---

## 🔄 Extending to Other Document Types

This pattern can be reused for other deed types:

1. **Create new step components** in `frontend/src/features/wizard/steps/`
2. **Add validation schemas** in `frontend/src/features/wizard/validation/`
3. **Create Jinja templates** in `templates/{document_type}/`
4. **Add FastAPI endpoint** in `backend/routers/` with document-specific model
5. **Wire up new route** in `frontend/src/app/create-deed/{document_type}/`

The UI primitives, state management, and PDF generation infrastructure are all reusable.

---

**Last Updated**: August 2025  
**Version**: 2.0.0-wizard-v2  
**Status**: Production Ready ✅
