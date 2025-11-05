# Grant Deed Structure & Section Targeting Guide

## 🏗️ **Page 1 Anatomy**

### **TOP SECTION (Lines 338-368)** ← YOUR TARGET AREA
```
┌─────────────────────────────────────────────┬──────────────┐
│ RECORDING REQUESTED BY:                     │   RECORDER   │
│   Company Name                              │   STAMP      │
│                                              │   AREA       │
│ MAIL TAX STATEMENTS AND                     │   3" × 3"    │
│ WHEN RECORDED MAIL TO:                      │              │
│   Name                                       │              │
│   Address Line 1                            │              │
│   Address Line 2                            │              │
│   City, State ZIP                           │              │
└─────────────────────────────────────────────┴──────────────┘
```
**CSS Classes**: 
- `.header-section` (overall container)
- `.recording-info` (left content)
- `.mail-to-section` (mailing address block)
- `.recording-stamp-area` (right box)

**Current spacing:**
- header-section: `margin-bottom: 10px`
- recording-info: `margin-bottom: 8px`, `line-height: 1.2`
- mail-to-section: `margin-top: 10px`

---

### **PROPERTY IDENTIFIERS (Lines 370-384)**
```
Order No.: _________________________
Escrow No.: ________________________
APN: _______________________________
```
**CSS Class**: `.property-identifiers`
**Current**: `margin: 20px 0`

---

### **TITLE (Line 387)**
```
           GRANT DEED
```
**CSS Class**: `.deed-title`
**Current**: `font-size: 18pt`, `margin: 30px 0 25px 0`

---

### **TAX SECTION (Lines 390-405)**
```
THE UNDERSIGNED GRANTOR(S) DECLARE(S):
DOCUMENTARY TRANSFER TAX IS $_______
☐ Computed on full value...
☐ Computed on full value less liens...
☐ Unincorporated area ☐ City of _______
```
**CSS Class**: `.tax-section`
**Current**: `margin: 20px 0`

---

### **MAIN LEGAL CONTENT (Lines 408-444)**
```
For valuable consideration, receipt...

[GRANTOR NAME]

hereby grant(s) to

[GRANTEE NAME]

the following described real property...
```
**CSS Classes**: `.main-content`, `.legal-language`, `.party-section`

---

### **LEGAL DESCRIPTION (Lines 434-444)**
```
┌─────────────────────────────────────┐
│ Legal Description:                  │
│ LOT 1, BLOCK 2...                  │
└─────────────────────────────────────┘
```
**CSS Class**: `.legal-description-section`
**Current**: `margin: 12px 0`, `padding: 10px`

---

### **SIGNATURE BLOCK (Lines 447-461)**
```
Dated: _____________, 20___

_________________________________
Grantor Signature
```
**CSS Classes**: `.signature-section`, `.signature-block`

---

## 🎯 **Strategic Spacing Adjustments**

### **Problem Areas (Taking up too much space):**

1. **Header Section (TOP OF PAGE 1)**
   - Recording info block is verbose
   - Mail-to section has extra vertical spacing
   - **Solution**: Reduce internal padding, tighten line breaks

2. **Property Identifiers**
   - Three rows with generous spacing
   - **Solution**: Make more compact, reduce margins

3. **Title Section**
   - Large margins around "GRANT DEED" title
   - **Solution**: Reduce top/bottom margins

4. **Tax Section**
   - Checkbox lines have default spacing
   - **Solution**: Tighten vertical rhythm

---

## 🔧 **Precision Targeting Syntax**

### **Option A: Inline Styles (Quick Override)**
```html
<p style="margin-bottom: 2px;">Text here</p>
```

### **Option B: CSS Classes (Systematic)**
```css
.header-section {
  margin-bottom: 8px;  /* Control section spacing */
}

.recording-info p {
  margin-bottom: 2px;  /* Control paragraph spacing */
}
```

### **Option C: Nested Targeting**
```css
.header-section .mail-to-section {
  margin-top: 5px;  /* Specific sub-section control */
}
```

---

## 📊 **Space Budget (Approximate)**

**Current Page 1 Space Allocation:**
- Header section: ~2.5 inches
- Property IDs: ~0.8 inches
- Title: ~0.7 inches
- Tax section: ~1.0 inch
- Legal content: ~3.0 inches
- Legal description: ~1.5 inches
- Signatures: ~1.5 inches
- **Total**: ~11 inches (fits on 1 page with 1" margins)

**Goal**: Keep all above ↑ on Page 1, push Notary to Page 2

---

## 💡 **Quick Wins for Top Section**

1. **Reduce header-section margin**: 10px → **5px**
2. **Tighten recording-info paragraphs**: 3px → **2px**
3. **Compress mail-to-section**: 8px → **4px** top margin
4. **Inline address spacing**: Remove extra line breaks
5. **Property identifiers**: 20px → **12px** margin

**Estimated space saved**: ~0.5 inches (enough to keep signatures on page 1!)

