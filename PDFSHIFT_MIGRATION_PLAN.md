# PDFShift Migration Plan
> **From WeasyPrint to PDFShift** — Better CSS support, Chrome rendering

---

## Why PDFShift?

| Feature | WeasyPrint | PDFShift |
|---------|------------|----------|
| CSS Grid | ❌ Limited | ✅ Full support |
| Flexbox | ⚠️ Partial | ✅ Full support |
| Web Fonts | ⚠️ Complex setup | ✅ Google Fonts URL |
| Rendering Engine | Cairo | Chrome Headless |
| Setup | Local binary | API call |
| Cost | Free | $0.10/PDF (first 250 free/month) |

**Bottom line:** PDFShift renders exactly like Chrome DevTools print preview.

---

## Current State

Per `CODEBASE_REFERENCE.md`:

```
PDF Engine Status:
| Engine     | Status        | Used In                                    |
|------------|---------------|-------------------------------------------|
| WeasyPrint | **Primary**   | main.py (line 2799+), api/generate_deed.py |
| PDFShift   | **Available** | pdf_engine.py, services/pdfshift_service.py |
```

The PDFShift service **already exists** — we just need to wire it up.

---

## Implementation Steps

### Step 1: Verify Environment Variable

Check that `PDFSHIFT_API_KEY` is set in Render:

```bash
# In Render dashboard → Environment
PDFSHIFT_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
```

If not set, get a key from https://pdfshift.io/

---

### Step 2: Review Existing PDFShift Service

Location: `backend/services/pdfshift_service.py`

Expected structure:

```python
# backend/services/pdfshift_service.py

import httpx
import os
import base64

PDFSHIFT_API_KEY = os.getenv("PDFSHIFT_API_KEY")
PDFSHIFT_URL = "https://api.pdfshift.io/v3/convert/pdf"

async def convert_html_to_pdf(html: str, options: dict = None) -> bytes:
    """
    Convert HTML string to PDF using PDFShift API.
    
    Args:
        html: The HTML content to convert
        options: PDFShift options (landscape, format, margin, etc.)
    
    Returns:
        PDF bytes
    """
    if not PDFSHIFT_API_KEY:
        raise ValueError("PDFSHIFT_API_KEY not configured")
    
    payload = {
        "source": html,
        "format": "Letter",
        "margin": "0",
        **(options or {})
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            PDFSHIFT_URL,
            auth=("api", PDFSHIFT_API_KEY),
            json=payload,
            timeout=30.0
        )
        response.raise_for_status()
        return response.content
```

---

### Step 3: Update pdf_engine.py

Location: `backend/pdf_engine.py`

Add PDFShift as primary with WeasyPrint fallback:

```python
# backend/pdf_engine.py

import os
from services.pdfshift_service import convert_html_to_pdf as pdfshift_convert

# Feature flag for gradual rollout
USE_PDFSHIFT = os.getenv("USE_PDFSHIFT", "true").lower() == "true"

async def render_html_to_pdf(html: str, options: dict = None) -> bytes:
    """
    Render HTML to PDF using configured engine.
    
    Primary: PDFShift (if enabled and configured)
    Fallback: WeasyPrint
    """
    
    if USE_PDFSHIFT and os.getenv("PDFSHIFT_API_KEY"):
        try:
            return await pdfshift_convert(html, options)
        except Exception as e:
            print(f"PDFShift failed, falling back to WeasyPrint: {e}")
            # Fall through to WeasyPrint
    
    # WeasyPrint fallback
    from weasyprint import HTML
    return HTML(string=html).write_pdf()
```

---

### Step 4: Update Generation Routes

Location: `backend/main.py` (around line 2799+)

Find the deed generation endpoints and update to use the new engine:

```python
# Before (WeasyPrint direct)
from weasyprint import HTML

@app.post("/api/generate/grant-deed-ca")
async def generate_grant_deed(data: DeedData, user_id: int = Depends(get_current_user_id)):
    template = env.get_template("grant_deed_ca/index.jinja2")
    html = template.render(**data.dict())
    pdf_bytes = HTML(string=html).write_pdf()  # ← OLD
    return Response(content=pdf_bytes, media_type="application/pdf")


# After (pdf_engine with fallback)
from pdf_engine import render_html_to_pdf

@app.post("/api/generate/grant-deed-ca")
async def generate_grant_deed(data: DeedData, user_id: int = Depends(get_current_user_id)):
    template = env.get_template("grant_deed_ca/index.jinja2")
    html = template.render(**data.dict())
    pdf_bytes = await render_html_to_pdf(html)  # ← NEW (async)
    return Response(content=pdf_bytes, media_type="application/pdf")
```

**Note:** The function is now `async` — update route decorator if needed.

---

### Step 5: Update All Deed Generation Endpoints

Find and update each endpoint:

| Endpoint | File Location |
|----------|---------------|
| `/api/generate/grant-deed-ca` | `main.py` or `api/generate_deed.py` |
| `/api/generate/quitclaim-deed-ca` | Same |
| `/api/generate/interspousal-transfer-ca` | Same |
| `/api/generate/warranty-deed-ca` | Same |
| `/api/generate/tax-deed-ca` | Same |

---

### Step 6: PDFShift-Specific Options

PDFShift supports additional options:

```python
options = {
    "format": "Letter",           # Paper size
    "margin": "0.5in",            # Or {"top": "0.5in", "bottom": "0.5in", ...}
    "landscape": False,
    "printBackground": True,      # Include background colors/images
    "preferCSSPageSize": True,    # Use @page CSS rules
    "displayHeaderFooter": False,
    "scale": 1,
}
```

For deeds, recommended options:

```python
DEED_PDF_OPTIONS = {
    "format": "Letter",
    "margin": "0",                # Templates handle their own margins
    "printBackground": True,
    "preferCSSPageSize": True,
}
```

---

### Step 7: Test Each Deed Type

Create a test script:

```python
# backend/test_pdfshift.py

import asyncio
from jinja2 import Environment, FileSystemLoader
from pdf_engine import render_html_to_pdf

env = Environment(loader=FileSystemLoader("templates"))

async def test_grant_deed():
    template = env.get_template("grant_deed_ca/index.jinja2")
    html = template.render(
        grantors_text="JOHN SMITH",
        grantees_text="JANE SMITH",
        county="Los Angeles",
        apn="1234-567-890",
        legal_description="Lot 1, Block 2, Tract 12345",
        # ... other required vars
    )
    
    pdf_bytes = await render_html_to_pdf(html)
    
    with open("test_grant_deed.pdf", "wb") as f:
        f.write(pdf_bytes)
    
    print(f"Generated PDF: {len(pdf_bytes)} bytes")

if __name__ == "__main__":
    asyncio.run(test_grant_deed())
```

Run:
```bash
cd backend
python test_pdfshift.py
# Check test_grant_deed.pdf
```

---

### Step 8: Gradual Rollout

Use environment variable for safe rollout:

```bash
# Render Environment Variables

# Phase 1: Test with feature flag OFF (WeasyPrint)
USE_PDFSHIFT=false

# Phase 2: Enable PDFShift
USE_PDFSHIFT=true

# Phase 3: Remove WeasyPrint (optional, after stability confirmed)
```

---

## Template Adjustments for PDFShift

PDFShift uses Chrome, so you can use modern CSS:

### CSS Grid (now works!)
```css
.header-grid {
    display: grid;
    grid-template-columns: 3.5in 1fr;
    gap: 0.25in;
}
```

### Flexbox (fully supported)
```css
.notary-signature-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}
```

### Google Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville&display=swap" rel="stylesheet">
<style>
    body { font-family: 'Libre Baskerville', serif; }
</style>
```

### Page Breaks
```css
.notary-page {
    page-break-before: always;
}

@media print {
    .no-break {
        page-break-inside: avoid;
    }
}
```

---

## Cost Estimation

PDFShift pricing: $9/month for 500 PDFs, then $0.01/PDF

| Monthly Volume | Cost |
|----------------|------|
| 250 | Free |
| 500 | $9 |
| 1,000 | $9 + $5 = $14 |
| 5,000 | $9 + $45 = $54 |
| 10,000 | $9 + $95 = $104 |

At scale, consider self-hosted Puppeteer/Playwright.

---

## Rollback Plan

If PDFShift causes issues:

```bash
# In Render Environment
USE_PDFSHIFT=false
```

The `pdf_engine.py` will automatically fall back to WeasyPrint.

---

## Checklist

| Task | Status |
|------|--------|
| Verify PDFSHIFT_API_KEY in Render | ⚪ |
| Review existing pdfshift_service.py | ⚪ |
| Update pdf_engine.py with fallback | ⚪ |
| Update grant-deed-ca endpoint | ⚪ |
| Update quitclaim-deed-ca endpoint | ⚪ |
| Update interspousal-transfer-ca endpoint | ⚪ |
| Update warranty-deed-ca endpoint | ⚪ |
| Update tax-deed-ca endpoint | ⚪ |
| Test each deed type | ⚪ |
| Enable USE_PDFSHIFT=true | ⚪ |
| Monitor for errors | ⚪ |
