# Template Perfection — Cursor Implementation Guide
> **Goal:** Best-looking deed templates in the industry

---

## 📋 Summary of Changes

### 1. Add Escrow Number Field (All Templates)
### 2. Perfect Margins (CA Compliant)
### 3. Add QR Code Footer
### 4. Polish Typography
### 5. Update All 5 Deed Types

---

## 🔧 Backend Changes

### Step 1: Add `escrow_no` to Deed Generation

**File:** `backend/main.py` (and/or `backend/api/generate_deed.py`)

Find all deed generation endpoints and add `escrow_no` parameter:

```python
# Add to request model
class DeedGenerateRequest(BaseModel):
    # ... existing fields ...
    title_order_no: Optional[str] = None
    escrow_no: Optional[str] = None  # ADD THIS
    
# Pass to template
template_data = {
    # ... existing fields ...
    'title_order_no': request.title_order_no,
    'escrow_no': request.escrow_no,  # ADD THIS
}
```

### Step 2: Generate QR Code for Each Deed

**Add to deed generation flow:**

```python
import qrcode
import base64
from io import BytesIO

def generate_verification_qr(document_id: str) -> str:
    """Generate QR code as base64 data URL"""
    verification_url = f"https://deedpro.com/verify/{document_id}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    base64_img = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{base64_img}"

# In deed generation:
document_id = generate_document_id()  # e.g., "DOC-2026-A7X9K"
qr_code_data_url = generate_verification_qr(document_id)

template_data = {
    # ... existing fields ...
    'document_id': document_id,
    'qr_code_data_url': qr_code_data_url,
}
```

### Step 3: Install QR Code Library (if not already)

```bash
pip install qrcode[pil] --break-system-packages
```

Add to `requirements.txt`:
```
qrcode[pil]>=7.4
```

---

## 🎨 Frontend Changes

### Step 4: Add Escrow Number to Deed Builder

**File:** `frontend/src/components/builder/sections/RecordingSection.tsx` (or similar)

Add escrow number input field:

```tsx
// Add to form state
const [escrowNo, setEscrowNo] = useState('')

// Add input field (near Title Order Number)
<div className="form-group">
  <label>Title Order Number</label>
  <input
    type="text"
    value={titleOrderNo}
    onChange={(e) => setTitleOrderNo(e.target.value)}
    placeholder="TC-2026-12345"
  />
</div>

<div className="form-group">
  <label>Escrow Number</label>
  <input
    type="text"
    value={escrowNo}
    onChange={(e) => setEscrowNo(e.target.value)}
    placeholder="ESC-789456"
  />
</div>
```

### Step 5: Pass to API

Update the deed generation API call to include `escrow_no`:

```typescript
const response = await fetch('/api/generate/grant-deed-ca', {
  method: 'POST',
  body: JSON.stringify({
    // ... existing fields ...
    title_order_no: titleOrderNo,
    escrow_no: escrowNo,  // ADD THIS
  }),
})
```

---

## 📄 Template Changes

### Step 6: Update Grant Deed Template

**File:** `templates/grant_deed_ca/index.jinja2`

Replace the entire file with the new v2 template (provided in `templates/grant_deed_ca_v2.jinja2`).

**Key changes:**
1. New margins: `margin: 0.5in 0.5in 0.75in 1in`
2. Larger recorder box: `2.5in` height
3. Reference section with APN, Title Order, AND Escrow
4. QR code footer section
5. Better typography

### Step 7: Update Quitclaim Deed Template

**File:** `templates/quitclaim_deed_ca/index.jinja2`

Apply the same changes:

1. **Update @page margins:**
```css
@page {
    size: letter;
    margin: 0.5in 0.5in 0.75in 1in;
}
```

2. **Update recorder box height:**
```css
.recorder-space {
    /* ... */
    height: 2.5in;  /* was 2in */
}
```

3. **Add escrow to reference line:**
```html
<div class="reference-section">
    <div class="reference-row">
        <div class="reference-primary">
            {% if apn %}
            <span class="ref-label">APN:</span>
            <span class="ref-value monospace">{{ apn }}</span>
            {% endif %}
        </div>
        
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

4. **Add QR footer before closing `</div>` of `.deed-page`:**
```html
{% if document_id %}
<footer class="deed-footer">
    <div class="verification-row">
        <div class="qr-code">
            {% if qr_code_data_url %}
            <img src="{{ qr_code_data_url }}" alt="Verification QR Code" />
            {% endif %}
        </div>
        <div class="verification-text">
            <div class="verify-label">Verify this document:</div>
            <div class="verify-url">deedpro.com/verify/{{ document_id }}</div>
            <div class="verify-meta">
                Generated by <span class="deedpro-brand">DeedPro</span> • {{ now().strftime('%B %d, %Y') }}
            </div>
        </div>
    </div>
</footer>
{% endif %}
```

5. **Add footer CSS:**
```css
.deed-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding-top: 0.1in;
    border-top: 0.5pt solid #ccc;
}

.verification-row {
    display: flex;
    align-items: center;
    gap: 0.15in;
}

.qr-code {
    width: 0.7in;
    height: 0.7in;
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
    margin-top: 2px;
}

.deedpro-brand {
    color: #7C4DFF;
    font-weight: bold;
}
```

### Step 8: Update Interspousal Transfer Deed

**File:** `templates/interspousal_transfer_ca/index.jinja2`

Same changes as Quitclaim. Note: This deed type is DTT exempt, so the DTT section shows "EXEMPT" instead of amount.

### Step 9: Update Warranty Deed

**File:** `templates/warranty_deed_ca/index.jinja2`

Same changes as Grant Deed (has full DTT section).

### Step 10: Update Tax Deed

**File:** `templates/tax_deed_ca/index.jinja2`

Same changes, but note:
- Tax deeds are always DTT exempt
- Uses government attestation instead of notary
- Add QR footer after attestation section

---

## ✅ Testing Checklist

After implementation:

- [ ] Generate Grant Deed with all fields filled
- [ ] Verify APN, Title Order, AND Escrow all display
- [ ] Verify QR code appears in footer
- [ ] Scan QR code — goes to verification URL
- [ ] Print to PDF — verify margins are correct
- [ ] Recorder space is exactly 3.5" × 2.5"
- [ ] Left margin is 1" (for binding)
- [ ] Test each deed type:
  - [ ] Grant Deed
  - [ ] Quitclaim Deed
  - [ ] Interspousal Transfer Deed
  - [ ] Warranty Deed
  - [ ] Tax Deed

---

## 📊 Before/After Summary

| Element | Before | After |
|---------|--------|-------|
| **Escrow Number** | ❌ Missing | ✅ In reference section |
| **Left Margin** | 0.75in | 1in (binding) |
| **Right Margin** | 0.625in | 0.5in |
| **Bottom Margin** | 0.625in | 0.75in (QR space) |
| **Recorder Box** | 2in tall | 2.5in tall |
| **QR Code** | ❌ None | ✅ Footer with URL |
| **Branding** | None | "Generated by DeedPro" |
| **Typography** | Basic | Professional hierarchy |

---

## 🎯 Files to Modify

```
Backend:
- backend/main.py (add escrow_no, qr generation)
- backend/requirements.txt (add qrcode)

Frontend:
- frontend/src/components/builder/sections/RecordingSection.tsx
- frontend/src/types/builder.ts (add escrow_no to types)

Templates:
- templates/grant_deed_ca/index.jinja2
- templates/quitclaim_deed_ca/index.jinja2
- templates/interspousal_transfer_ca/index.jinja2
- templates/warranty_deed_ca/index.jinja2
- templates/tax_deed_ca/index.jinja2
```

---

## 💡 Tips

1. **Test incrementally** — Update Grant Deed first, test, then do others
2. **Use the reference template** — `grant_deed_ca_v2.jinja2` has all CSS
3. **QR code is optional** — Only show if `document_id` exists
4. **Margins matter** — County recorders are strict about this

---

*Goal: When an EO downloads a DeedPro deed, they should think "This is the most professional deed template I've ever seen."*
