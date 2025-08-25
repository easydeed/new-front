# 📄 DeedPro Templates Guide

## ⚠️ IMPORTANT: Templates in Monorepo

**Templates are now located in the `/templates` directory of the monorepo and accessed by the backend via relative path.**

---

## 🏗️ **Enhanced Template Architecture Overview**

DeedPro's **AI-enhanced deed generation system** uses a **five-layer intelligent architecture**:

1. **AI-Enhanced Wizard** (`/frontend/src/app/create-deed/page.tsx`) - Intelligent data collection with real-time validation
2. **Smart Data Mapper** (`/frontend/src/utils/deedDataMapper.ts`) - Comprehensive field mapping and validation
3. **Enhanced Components** (`/frontend/src/components/`) - Professional preview and wizard flow management
4. **Backend API Endpoint** (`/backend/main.py` → `/generate-deed-preview`) - Template rendering with AI integration
5. **Dynamic Templates** (`/templates/`) - Intelligent templates with dynamic features and calculations

### **Technology Stack**
- **Jinja2**: Template engine for data injection into HTML
- **WeasyPrint**: HTML-to-PDF conversion with precise legal formatting
- **FastAPI**: Backend REST API for template processing
- **Next.js**: Frontend deed wizard interface

---

## 📁 **Monorepo File Structure**

```
new-front/                          # MONOREPO ROOT
├── frontend/
│   └── src/app/create-deed/
│       └── page.tsx                # Deed wizard UI (integrates with backend)
├── backend/
│   ├── main.py                     # Contains /generate-deed endpoint
│   └── [other backend files]
├── templates/                      # SHARED TEMPLATES DIRECTORY
│   ├── grant_deed.html            # Grant Deed template
│   ├── quitclaim_deed.html        # Quitclaim Deed template
│   ├── warranty_deed.html         # Warranty Deed template (future)
│   └── deed_of_trust.html         # Deed of Trust template (future)
├── scripts/
│   ├── add_addon.py               # Database widget addon setup
│   └── [other scripts]
└── [documentation files]
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
# From backend directory (tests backend + templates)
cd backend
pytest tests/ -v

# From project root
python -m pytest backend/tests/ -v

# Run specific template test
pytest backend/tests/test_templates.py::test_grant_deed -v
```

### **Test Coverage**
- ✅ **Data Injection**: All Jinja2 variables populated correctly
- ✅ **HTML Structure**: Required headers, sections, and legal text present
- ✅ **CSS Validation**: Pixel-perfect margins, fonts, and spacing
- ✅ **PDF Generation**: WeasyPrint successfully creates base64 output
- ✅ **Error Handling**: Invalid deed types and missing fields handled gracefully

### **Testing Templates Manually**
```bash
# Test template rendering from backend directory
cd backend
python -c "
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('../templates'))
template = env.get_template('grant_deed.html')
html = template.render({
    'grantor': 'Test Grantor',
    'grantee': 'Test Grantee',
    'property_description': 'Test Property Description'
})
print('Template rendered successfully!')
print(f'HTML length: {len(html)} characters')
"
```

---

## 🚀 **Adding New Deed Types**

### **Step 1: Create HTML Template**
```bash
# Create new template file in templates directory
cd templates
touch new_deed_type.html
```

### **Step 2: Design Template**
- Copy structure from existing deed (grant_deed.html)
- Modify legal language for specific deed type
- Add deed-specific fields as Jinja2 variables
- Ensure pixel-perfect CSS compliance

### **Step 3: Add Test Data**
```json
// Add to backend/tests/sample_data.json (if exists)
"new_deed_type": {
  "field1": "value1",
  "field2": "value2",
  // ... all required fields
}
```

### **Step 4: Create Tests**
```python
# Add to backend/tests/test_templates.py
def test_generate_new_deed_type():
    sample_data = {
        "deed_type": "new_deed_type",
        "data": {
            "field1": "value1",
            "field2": "value2"
            # ... test data
        }
    }
    response = client.post("/generate-deed", json=sample_data)
    assert response.status_code == 200
    html = response.json()["html"]
    assert "NEW DEED TYPE" in html
    # ... additional assertions
```

### **Step 5: Update Frontend**
```tsx
// Add to frontend/src/app/create-deed/page.tsx
const deedTypes = [
  // ... existing deed types
  {
    type: 'New Deed Type',
    icon: <YourIconHere />,
    description: 'Description of new deed type.',
    popular: false
  }
];
```

---

## 🔧 **Development Workflow**

### **Local Development**
```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Start frontend  
cd frontend
npm run dev

# Terminal 3: Edit templates
cd templates
# Edit .html files

# Test template changes immediately via frontend or API
```

### **Template Development Process**
1. **Edit Template**: Modify `/templates/*.html`
2. **Test Backend**: Restart backend to reload templates
3. **Test via API**: Call `/generate-deed` endpoint
4. **Test via Frontend**: Use deed wizard UI
5. **Validate Output**: Check HTML structure and PDF generation

### **Template Path Configuration**
```python
# In backend/main.py
from jinja2 import Environment, FileSystemLoader

# Templates accessed via relative path from backend directory
env = Environment(loader=FileSystemLoader('../templates'))
```

---

## ✨ **Enhanced Template Features (NEW)**

### **Dynamic Checkbox Logic**
Templates now include **intelligent checkbox rendering** that responds to user selections:

```html
<!-- Dynamic checkboxes that show ✓ marks based on user data -->
<p><span class="checkbox">{{ "✓" if tax_computed_full_value else "" }}</span> Computed on full value of property conveyed, or</p>
<p><span class="checkbox">{{ "✓" if tax_computed_less_liens else "" }}</span> Computed on full value less liens and encumbrances remaining at time of sale.</p>
<p><span class="checkbox">{{ "✓" if is_unincorporated else "" }}</span> Unincorporated area <span class="checkbox">{{ "✓" if not is_unincorporated else "" }}</span> City of {{ city }}</p>
```

### **Smart Data Integration**
- **AI Suggestions**: Templates receive enhanced data with AI-powered field suggestions
- **Auto-Calculations**: Documentary tax automatically computed ($0.55 per $500 CA standard)
- **Date Formatting**: Legal date formatting (MM/DD/YYYY) applied automatically
- **Vesting Integration**: Property descriptions include vesting information when provided

### **Enhanced Field Mapping**
Templates use the **smart data mapper** (`deedDataMapper.ts`) for:
- **Comprehensive validation** before rendering
- **Fallback values** for missing data
- **AI suggestion integration** 
- **Automatic field calculations**

### **Template Variables (Enhanced)**
```jinja2
<!-- Core variables with AI enhancement -->
{{ recording_requested_by }}     <!-- AI + user input -->
{{ mail_to }}                    <!-- Smart fallback: AI + mailTo || address || search -->
{{ documentary_tax }}            <!-- Auto-calculated from sales price -->
{{ property_description }}       <!-- Enhanced with vesting details -->

<!-- NEW: Dynamic features -->
{{ tax_computed_full_value }}    <!-- Boolean for checkbox logic -->
{{ tax_computed_less_liens }}    <!-- Boolean for checkbox logic -->
{{ is_unincorporated }}         <!-- Boolean for checkbox logic -->
{{ formatted_date }}            <!-- Auto-formatted legal date -->
{{ vesting_description }}       <!-- Separate vesting field -->
```

---

## 🚨 **Enhanced Template Development Rules**

### **✅ DO THIS**
- ✅ **Work in `/templates` directory**
- ✅ **Use Jinja2 syntax for variables**
- ✅ **Test templates with backend running**
- ✅ **Follow legal document formatting standards**
- ✅ **Include fallback values for missing data**
- ✅ **Validate HTML structure and CSS**

### **❌ NEVER DO THIS**
- ❌ **Put templates in `/frontend` or `/backend`**
- ❌ **Hardcode values in templates**
- ❌ **Break legal formatting requirements**
- ❌ **Change template paths in backend code**
- ❌ **Skip testing with real data**

---

## 📊 **Template Performance**

### **Rendering Performance**
- **Template Load Time**: < 50ms (Jinja2 cached)
- **HTML Generation**: < 100ms (data injection)
- **PDF Generation**: < 2 seconds (WeasyPrint)
- **Total Processing**: < 3 seconds end-to-end

### **Optimization Tips**
- ✅ **Use template inheritance** for common elements
- ✅ **Minimize CSS complexity** for faster PDF rendering
- ✅ **Cache compiled templates** in production
- ✅ **Optimize image assets** if used in templates

---

## 🚨 **Troubleshooting**

### **Template Not Found Error**
```
TemplateNotFound: new_deed_type.html
```
**Solution**: 
1. Ensure template file exists in `/templates/` directory
2. Verify filename matches exactly (case-sensitive)
3. Check template path configuration in backend

### **PDF Generation Fails**
```
WeasyPrint error: CSS parsing failed
```
**Solution**: 
1. Validate CSS syntax in template
2. Ensure proper @page rules and print styles
3. Check for unsupported CSS properties

### **Data Injection Issues**
```
Jinja2 variable not rendering
```
**Solution**: 
1. Check variable names match between API data and template
2. Verify Jinja2 syntax: `{{ variable_name }}`
3. Add fallback values: `{{ variable_name or "default" }}`

### **Template Path Issues**
```
FileNotFoundError: ../templates/grant_deed.html
```
**Solution**:
1. Verify you're running from `/backend` directory
2. Check templates exist in `/templates` directory
3. Confirm relative path `../templates` is correct

### **Render Path Issues**
If "Template not found" on Render:
- Check `render.yaml` rootDir: `backend`
- Verify templates/ deploys (`git add templates/`)
- Test: Render Shell > `ls /opt/render/project/src/templates`

---

## 📚 **Template Development Resources**

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

**🚨 Remember**: Templates are shared resources in the monorepo. Backend accesses them via `../templates` relative path! 🎯 