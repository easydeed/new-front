# 🧪 Local PDF Template Testing Guide

Quick guide for testing Phase 24-G PDF templates locally without waiting for Render deployments.

---

## Option 1: Quick Test Script (Fastest ⚡)

### Setup (One-time)
```bash
cd backend
python -m pip install jinja2 weasyprint
```

### Run Tests
```bash
cd backend
python test_phase24g_templates.py
```

**Output:**
- ✅ Generates PDFs in temp folder
- ✅ Prints file paths
- ✅ Shows PDF file sizes
- ✅ Reports pass/fail status

**Look for lines like:**
```
✅ PDF generated successfully
   PDF path: C:\Users\...\tmp_xyz.pdf
   PDF size: 24464 bytes
```

**Open the PDF path** in your browser or PDF viewer to see results!

---

## Option 2: Run Full Backend Locally (Complete Testing)

### Setup (One-time)

1. **Install Dependencies**
```bash
cd backend
python -m pip install -r requirements.txt
```

2. **Set Environment Variables**
Create a `.env` file in the project root:
```env
DATABASE_URL=your_database_url_here
JWT_SECRET=your_jwt_secret_here
# Copy other vars from Render if needed
```

3. **Start Backend Server**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Server runs at:** `http://localhost:8000`

### Test PDFs

**Method A: Use API Endpoint**
```bash
# Generate Grant Deed
curl -X POST http://localhost:8000/api/deeds/grant-deed/render \
  -H "Content-Type: application/json" \
  -d @sample_grant_deed.json \
  --output grant_deed.pdf
```

**Method B: Use the Wizard**

1. Start backend: `uvicorn main:app --reload --port 8000`
2. Update frontend `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. Run frontend: `npm run dev`
4. Navigate wizard and generate PDF

---

## Option 3: Quick HTML Preview (No PDF)

If you just want to see the HTML output:

1. **Create test script:** `backend/preview_template.py`
```python
from jinja2 import Environment, FileSystemLoader
import os

template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates')
env = Environment(loader=FileSystemLoader(template_dir))

template = env.get_template("grant_deed_ca/index.jinja2")

# Sample data
html = template.render(
    requested_by="Test Company",
    apn="123-456-789",
    county="LOS ANGELES",
    grantors_text="John Doe",
    grantees_text="Jane Smith",
    legal_description="Sample legal description here",
    execution_date="2025-11-05",
    return_to={"name": "John Doe", "address1": "123 Main St", 
               "city": "Anytown", "state": "CA", "zip": "90210"}
)

# Save to file
with open('preview.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ HTML saved to preview.html")
print("Open in browser to see formatting")
```

2. **Run it:**
```bash
cd backend
python preview_template.py
```

3. **Open `preview.html` in browser** to see the rendered template

---

## Quick Iteration Workflow

**For margin/CSS adjustments:**

1. Edit template file (e.g., `templates/grant_deed_ca/index.jinja2`)
2. Run: `python test_phase24g_templates.py`
3. Open generated PDF
4. Repeat until satisfied
5. Commit and push when done

**No Render deployment needed until final!**

---

## Troubleshooting

### WeasyPrint Installation Issues (Windows)

If `pip install weasyprint` fails:

```bash
# Install GTK3 runtime first
# Download from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
# Then install weasyprint
pip install weasyprint
```

### Missing Dependencies

```bash
pip install fastapi uvicorn psycopg2-binary python-dotenv stripe pydantic jinja2 weasyprint
```

### Template Not Found

Make sure you're running from the correct directory:
```bash
# Should be in project root or backend folder
pwd  # Check current directory
```

---

## What Gets Tested Locally

✅ Template rendering  
✅ CSS styling and layout  
✅ Margins and spacing  
✅ Recording stamp positioning  
✅ Page breaks  
✅ Font rendering  
✅ PDF generation  

❌ Database integration (need local DB or staging)  
❌ Authentication (unless you set up local auth)  

---

## Tips

- **Quick CSS tweaks**: Edit template → run test script → view PDF
- **Test with real data**: Modify test script with actual deed data
- **Compare side-by-side**: Generate before/after PDFs
- **Print preview**: Use browser print preview for page count verification

---

## Need Help?

- Test script: `backend/test_phase24g_templates.py`
- Template files: `templates/grant_deed_ca/index.jinja2`, `templates/quitclaim_deed_ca/index.jinja2`
- Documentation: `docs/backend/PDF_GENERATION_SYSTEM.md`

