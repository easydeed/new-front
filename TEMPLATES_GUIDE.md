# DeedPro Templates Component Guide

This guide provides comprehensive documentation for developers and AI agents working with the DeedPro templates system for deed generation.

## 🏗️ **Architecture Overview**

DeedPro's deed generation system uses a **three-layer architecture**:

1. **Frontend Deed Wizard** (`/frontend/src/app/create-deed/page.tsx`) - User interface for data collection
2. **Backend API Endpoint** (`/backend/main.py` → `/generate-deed`) - Template rendering and PDF generation
3. **HTML Templates** (`/backend/templates/`) - Pixel-perfect legal document layouts

### **Technology Stack**
- **Jinja2**: Template engine for data injection into HTML
- **WeasyPrint**: HTML-to-PDF conversion with precise legal formatting
- **FastAPI**: Backend REST API for template processing
- **Next.js**: Frontend deed wizard interface

---

## 📁 **File Structure**

```
backend/
├── templates/
│   ├── grant_deed.html          # Grant Deed template
│   ├── quitclaim_deed.html      # Quitclaim Deed template
│   ├── warranty_deed.html       # Warranty Deed template (future)
│   └── deed_of_trust.html       # Deed of Trust template (future)
├── tests/
│   ├── test_generate_deed.py    # Template generation tests
│   ├── sample_data.json         # Test data for all deed types
│   └── README.md                # Testing documentation
└── main.py                      # Contains /generate-deed endpoint

frontend/src/app/
└── create-deed/
    └── page.tsx                 # Deed wizard UI (integrates with backend)
```

---

## 🎯 **Template Design Principles**

### **Legal Compliance**
- **Exact margins**: 1 inch on all sides (`@page { margin: 1in; }`)
- **Standard paper**: 8.5" x 11" (`@page { size: 8.5in 11in; }`)
- **Legal font**: Times New Roman, 12pt (`font-family: 'Times New Roman', serif; font-size: 12pt;`)
- **Line spacing**: 1.5 line height (`line-height: 1.5`)

### **Data Injection**
- **Jinja2 placeholders**: `{{ variable_name }}` for dynamic data
- **Fallback values**: `{{ variable_name or "____________________" }}` for missing data
- **Conditional content**: `{% if condition %}...{% endif %}` for optional sections

### **Pixel-Perfect Layout**
- **Consistent spacing**: `.section { margin-bottom: 0.25in; }`
- **Header formatting**: Centered, bold, 14pt, uppercase
- **Signature sections**: 1 inch top margin with border
- **Notary sections**: Bordered box with 0.5 inch padding

---

## 🔧 **API Endpoint Specification**

### **POST /generate-deed**

**Request Format:**
```json
{
  "deed_type": "grant_deed",
  "data": {
    "recording_requested_by": "Agent Name",
    "mail_to": "123 Main St, City CA 90210",
    "order_no": "12345",
    "escrow_no": "67890",
    "apn": "987-654-321",
    "documentary_tax": "500.00",
    "city": "Anytown",
    "grantor": "John Doe",
    "grantee": "Jane Smith",
    "county": "Los Angeles",
    "property_description": "Legal description...",
    "date": "2025-01-24",
    "grantor_signature": "John Doe",
    "county_notary": "Los Angeles",
    "notary_date": "2025-01-24",
    "notary_name": "Mary Public Notary",
    "appeared_before_notary": "John Doe",
    "notary_signature": "Mary Public Notary"
  }
}
```

**Response Format:**
```json
{
  "html": "<html>...</html>",
  "pdf_base64": "JVBERi0xLjQK...",
  "deed_type": "grant_deed",
  "status": "success"
}
```

---

## 📋 **Supported Deed Types**

### **1. Grant Deed** (`grant_deed.html`)
**Purpose**: Standard property transfer with basic warranties  
**Key Fields**: grantor, grantee, property_description, documentary_tax  
**Legal Language**: "hereby GRANT(S) to"  

### **2. Quitclaim Deed** (`quitclaim_deed.html`)
**Purpose**: Property transfer without warranties  
**Key Fields**: grantor, grantee, property_description  
**Legal Language**: "hereby REMISE, RELEASE and FOREVER QUITCLAIM to"  

### **3. Warranty Deed** (Coming Soon)
**Purpose**: Property transfer with full warranties  
**Additional Fields**: warranties, title_guarantees  

### **4. Deed of Trust** (Coming Soon)
**Purpose**: Property as loan collateral  
**Additional Fields**: loan_amount, lender, trustee, interest_rate, loan_term  

---

## 🎨 **Template Structure & Styling**

### **Standard CSS Classes**
```css
.header          /* Deed title: centered, bold, 14pt, uppercase */
.section         /* Content blocks with 0.25in bottom margin */
.bold            /* Bold text for labels and legal declarations */
.signature       /* Signature area with top border and padding */
.notary-section  /* Bordered notary acknowledgment box */
.checkbox        /* 12pt square checkboxes for form fields */
```

### **Required HTML Structure**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>[Deed Type]</title>
  <style>/* Pixel-perfect CSS */</style>
</head>
<body>
  <!-- Recording request section -->
  <!-- Header section -->
  <!-- Legal declarations -->
  <!-- Property description -->
  <!-- Signature section -->
  <!-- Notary acknowledgment -->
</body>
</html>
```

---

## 🧪 **Testing Framework**

### **Running Tests**
```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run all template tests
pytest tests/ -v

# Run specific deed type test
pytest tests/test_generate_deed.py::test_generate_grant_deed -v
```

### **Test Coverage**
- ✅ **Data Injection**: All Jinja2 variables populated correctly
- ✅ **HTML Structure**: Required headers, sections, and legal text present
- ✅ **CSS Validation**: Pixel-perfect margins, fonts, and spacing
- ✅ **PDF Generation**: WeasyPrint successfully creates base64 output
- ✅ **Error Handling**: Invalid deed types and missing fields handled gracefully

### **Adding New Tests**
1. Add template data to `/backend/tests/sample_data.json`
2. Create test function in `/backend/tests/test_generate_deed.py`
3. Validate HTML structure, data injection, and PDF output

---

## 🚀 **Adding New Deed Types**

### **Step 1: Create HTML Template**
```bash
# Create new template file
touch backend/templates/new_deed_type.html
```

### **Step 2: Design Template**
- Copy structure from existing deed (grant_deed.html)
- Modify legal language for specific deed type
- Add deed-specific fields as Jinja2 variables
- Ensure pixel-perfect CSS compliance

### **Step 3: Add Test Data**
```json
// Add to backend/tests/sample_data.json
"new_deed_type": {
  "field1": "value1",
  "field2": "value2",
  // ... all required fields
}
```

### **Step 4: Create Tests**
```python
# Add to backend/tests/test_generate_deed.py
def test_generate_new_deed_type(sample_new_deed_data):
    response = client.post("/generate-deed", json=sample_new_deed_data)
    assert response.status_code == 200
    html = response.json()["html"]
    assert "NEW DEED TYPE" in html
    # ... additional assertions
```

### **Step 5: Update Frontend**
```tsx
// Add to frontend/src/app/create-deed/page.tsx
<option value="new_deed_type">New Deed Type</option>
```

---

## 🔧 **Development Workflow**

### **Local Development**
1. **Edit Templates**: Modify `/backend/templates/*.html`
2. **Test Changes**: Run `pytest backend/tests/ -v`
3. **Validate Output**: Check HTML structure and PDF generation
4. **Frontend Integration**: Test with deed wizard UI

### **Deployment Process**
1. **Commit Changes**: `git add . && git commit -m "Update templates"`
2. **Push to Repo**: `git push`
3. **Deploy Frontend**: `vercel --prod` (for UI changes)
4. **Deploy Backend**: Deploy to Render (for template/API changes)

---

## 🚨 **Common Issues & Solutions**

### **Template Not Found Error**
```
TemplateNotFound: new_deed_type.html
```
**Solution**: Ensure template file exists in `/backend/templates/` with correct filename

### **PDF Generation Fails**
```
WeasyPrint error: CSS parsing failed
```
**Solution**: Validate CSS syntax, ensure proper @page rules and print styles

### **Data Injection Issues**
```
Jinja2 variable not rendering
```
**Solution**: Check variable names match between frontend data and template placeholders

### **Spacing/Margin Problems**
```
PDF layout doesn't match requirements
```
**Solution**: Verify CSS units (use inches: `1in`, points: `12pt`), check @page margins

---

## 📚 **Resources & References**

### **Documentation**
- [Jinja2 Template Documentation](https://jinja.palletsprojects.com/)
- [WeasyPrint CSS Print Support](https://weasyprint.readthedocs.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

### **Legal Requirements**
- California deed formatting standards
- County recorder requirements
- Notary acknowledgment formats

### **Development Tools**
- **CSS Validation**: Check print styles with browser dev tools
- **PDF Testing**: Use WeasyPrint CLI for rapid iteration
- **Template Debugging**: Jinja2 template debugging techniques

---

## 💡 **Best Practices**

### **Template Development**
- ✅ **Start with existing template** as base structure
- ✅ **Test early and often** with real data
- ✅ **Validate legal compliance** with sample documents
- ✅ **Use consistent naming** for Jinja2 variables
- ✅ **Include fallback values** for all data fields

### **Code Quality**
- ✅ **Comment complex CSS** especially print-specific rules
- ✅ **Use semantic HTML** structure for accessibility
- ✅ **Follow naming conventions** for template files
- ✅ **Write comprehensive tests** for all deed types
- ✅ **Document field requirements** for each deed type

### **Performance**
- ✅ **Optimize CSS** for fast PDF rendering
- ✅ **Minimize template complexity** for WeasyPrint efficiency
- ✅ **Cache templates** in production environment
- ✅ **Use appropriate file sizes** for base64 PDF output

---

*This guide is maintained by the DeedPro development team. For questions or contributions, refer to the main README.md or create an issue in the repository.* 