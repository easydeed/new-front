# V0 Prompt: DeedPro Wizard Final UI Refinements

**Goal**: Polish the wizard UI to perfection - better spacing, reordered sections, larger text, integrated property search.

---

## 🎯 **REQUIRED CHANGES**

### **1. Main Content Left Padding - REDUCE**
**Current**: Excessive left padding (~200px) pushing content right
**Fix**: Reduce to 20px

```tsx
// OLD (remove this):
<div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-16 py-8 md:py-12">

// NEW (use this):
<div className="max-w-6xl mx-auto px-5 md:px-6 lg:px-8 py-8 md:py-12">
```

**Result**: Content uses full width efficiently with minimal left/right margins.

---

### **2. Section Reordering - "So Far" Below Input**
**Current Order**:
1. Progress Bar
2. MicroSummary ("So Far" section)
3. User Input Section

**New Order**:
1. Progress Bar (top)
2. User Input Section (middle)
3. MicroSummary ("So Far" section - bottom)

**Why**: Users should see their input field prominently, with the summary below for reference.

```tsx
return (
  <div className="min-h-screen bg-white">  {/* ✅ Removed gradient */}
    <StepShell>
      {/* 1. Progress Bar - Always at top */}
      <ProgressBar current={i + 1} total={total} steps={steps} />
      
      {/* 2. User Input Section - Prominent middle */}
      {current ? (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 md:p-10 mb-6">
          {/* Question heading - LARGER TEXT */}
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            {current.title || current.question}
          </h1>
          
          {/* Input field - LARGER TEXT */}
          <input
            className="w-full px-8 py-6 text-xl md:text-2xl rounded-lg border-2 border-slate-300
                      focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20
                      transition-all duration-200 placeholder:text-slate-400 font-medium"
            type="text"
            value={state[current.field] || ''}
            onChange={(e) => onChange(current.field, e.target.value)}
            placeholder={current.placeholder || ''}
          />
          
          {/* Navigation buttons */}
          <div className="flex justify-between gap-4 pt-6 border-t border-slate-200 mt-8">
            {/* Back/Next buttons */}
          </div>
        </div>
      ) : (
        <SmartReview {...} />
      )}
      
      {/* 3. MicroSummary - Below input for reference */}
      <MicroSummary data={summaryData} />
    </StepShell>
  </div>
);
```

---

### **3. Larger Text for User Input**
**Current**: `text-lg` (too small, hard to read while typing)
**New**: `text-xl md:text-2xl` (easy to read, confident UX)

**Apply to**:
- Question heading: `text-4xl md:text-5xl` (up from `text-3xl md:text-4xl`)
- Input field: `text-xl md:text-2xl px-8 py-6` (up from `text-lg px-6 py-4`)
- Placeholder: `text-slate-400` (light gray, not distracting)
- Font weight: `font-medium` (slightly bold for readability)

---

### **4. Remove Gradient Background**
**Current**: `bg-gradient-to-br from-slate-50 via-white to-slate-50`
**New**: `bg-white` (clean, simple)

```tsx
// OLD:
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">

// NEW:
<div className="min-h-screen bg-white">
```

---

### **5. Property Search Integration**
**Problem**: Property search (Step 1) feels isolated, like it's not part of the engine.

**Root Cause**: PropertySearch component is rendered separately from ModernEngine flow.

**Solution**: Wrap PropertySearch in the same card styling as Q&A steps.

```tsx
{/* When rendering PropertySearch component */}
<div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 md:p-10 mb-6">
  <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
    Property Search & Verification
  </h1>
  
  {/* PropertySearch component goes here */}
  <PropertySearchWithTitlePoint {...props} />
</div>
```

**Address Search Bar Width Fix**:
- Currently takes full width (looks awkward)
- Should be contained within the same card as other inputs
- Already wrapped in card above, so width will auto-adjust

---

### **6. Layout Spacing Summary**

```tsx
<div className="min-h-screen bg-white">
  <StepShell>
    {/* Max width: 6xl instead of 5xl for better space usage */}
    <div className="max-w-6xl mx-auto px-5 md:px-6 lg:px-8 py-8 md:py-12">
      
      {/* Progress Bar */}
      <ProgressBar ... />
      
      {/* User Input Card - Prominent */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 md:p-10 mb-6">
        <h1 className="text-4xl md:text-5xl ...">Question</h1>
        <input className="text-xl md:text-2xl px-8 py-6 ..." />
      </div>
      
      {/* MicroSummary - Below for reference */}
      <MicroSummary ... />
      
    </div>
  </StepShell>
</div>
```

---

## 🎨 **VISUAL HIERARCHY (FINAL)**

```
┌─────────────────────────────────────────────────────────┐
│  min-h-screen bg-white (no gradient)                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │ StepShell (max-w-6xl, minimal padding)            │  │
│  │                                                    │  │
│  │ ┌─────────────────────────────────────────────┐   │  │
│  │ │ PROGRESS BAR                                │   │  │
│  │ │ Step 1 of 5 • 20% Complete                  │   │  │
│  │ │ ● ──── ○ ──── ○ ──── ○ ──── ○              │   │  │
│  │ └─────────────────────────────────────────────┘   │  │
│  │                                                    │  │
│  │ ┌─────────────────────────────────────────────┐   │  │
│  │ │ USER INPUT SECTION (prominent, large text)  │   │  │
│  │ │                                             │   │  │
│  │ │ What is the grantor's name?                 │   │  │
│  │ │ (text-4xl md:text-5xl)                      │   │  │
│  │ │                                             │   │  │
│  │ │ ┌─────────────────────────────────────┐     │   │  │
│  │ │ │ John Smith                          │     │   │  │
│  │ │ │ (text-xl md:text-2xl, px-8 py-6)    │     │   │  │
│  │ │ └─────────────────────────────────────┘     │   │  │
│  │ │                                             │   │  │
│  │ │ ────────────────────────────────────────    │   │  │
│  │ │ [Back]                        [Next →]      │   │  │
│  │ └─────────────────────────────────────────────┘   │  │
│  │                                                    │  │
│  │ ┌─────────────────────────────────────────────┐   │  │
│  │ │ SO FAR SECTION (reference, below input)     │   │  │
│  │ │ Deed Type: Grant Deed                       │   │  │
│  │ │ Property: 123 Main St                       │   │  │
│  │ │ Grantor: John Smith ✓                       │   │  │
│  │ └─────────────────────────────────────────────┘   │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📐 **SPACING GUIDELINES**

| Element | Padding | Margin | Font Size |
|---------|---------|--------|-----------|
| StepShell | `px-5 md:px-6 lg:px-8` | - | - |
| Progress Bar | `p-6 md:p-8` | `mb-6` | - |
| User Input Card | `p-8 md:p-10` | `mb-6` | - |
| Question Heading | - | `mb-4` | `text-4xl md:text-5xl` |
| Input Field | `px-8 py-6` | - | `text-xl md:text-2xl` |
| Navigation Buttons | `pt-6` | `mt-8` | - |
| MicroSummary | `p-6` | `mt-6` | - |

---

## 🔧 **PROPERTY SEARCH SPECIFIC FIX**

**Issue**: Address search bar takes entire width, feels disconnected.

**Solution**: PropertySearch component should be wrapped in the same card container:

```tsx
{/* In PropertyStepBridge or wherever PropertySearch is rendered */}
<div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 md:p-10 mb-6">
  <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
    Property Search & Verification
  </h1>
  
  <p className="text-lg text-slate-600 mb-8">
    Enter the property address to begin your deed creation
  </p>
  
  {/* PropertySearch component - will inherit card width */}
  <PropertySearchWithTitlePoint
    onPropertyFound={...}
    onVerified={...}
  />
</div>
```

---

## 🎯 **V0 GENERATION PROMPT**

Copy this exact prompt to V0:

---

### **V0 Prompt:**

Refine a multi-step wizard UI with these exact requirements:

**Layout Changes:**
1. Container: `max-w-6xl mx-auto px-5 md:px-6 lg:px-8` (minimal side padding)
2. Background: `bg-white` (no gradients)
3. Section order: Progress Bar → User Input → Summary (reordered)

**User Input Section (Make Prominent):**
1. Question heading: `text-4xl md:text-5xl font-bold text-slate-800 mb-4`
2. Input field: `text-xl md:text-2xl px-8 py-6 font-medium`
3. Card: `bg-white rounded-2xl shadow-md border border-slate-200 p-8 md:p-10 mb-6`
4. Placeholder: `text-slate-400` (light, non-distracting)

**Component Order:**
```tsx
<div className="min-h-screen bg-white">
  <StepShell>
    <ProgressBar />  {/* Top */}
    <UserInputCard />  {/* Middle - Prominent */}
    <MicroSummary />  {/* Bottom - Reference */}
  </StepShell>
</div>
```

**Typography Scale:**
- Headings: `text-4xl md:text-5xl` (larger than before)
- Inputs: `text-xl md:text-2xl` (easy to read while typing)
- Labels: `text-base md:text-lg`
- Summary: `text-sm md:text-base`

**Spacing:**
- Card padding: `p-8 md:p-10`
- Input padding: `px-8 py-6` (generous)
- Margins: `mb-6` between sections
- Navigation: `pt-6 mt-8` (separated with border)

**Style Requirements:**
- Clean white background (no gradients)
- Consistent card styling (rounded-2xl, shadow-md)
- Purple accent: `#7C4DFF` for buttons/highlights
- Slate colors: `slate-800` text, `slate-200` borders
- Focus states: purple ring with shadow

Generate only the layout structure and styling. Preserve all props interfaces and component logic.

---

## 📄 **PREVIEW PAGE FIX**

**Issue**: Elements appear under the actual PDF preview (cluttering the view).

**Solution**: Remove or hide elements below PDF.

```tsx
{/* In preview page component */}
<div className="max-w-6xl mx-auto px-6 py-8">
  {/* PDF Preview - Centered, prominent */}
  <div className="bg-white rounded-lg shadow-lg p-6">
    <iframe src={pdfUrl} className="w-full h-[800px] rounded" />
  </div>
  
  {/* Action buttons below PDF */}
  <div className="flex justify-center gap-4 mt-6">
    <button>Download</button>
    <button>Share</button>
  </div>
  
  {/* ❌ REMOVE: Extra elements that clutter */}
  {/* No additional cards, text, or sections below PDF */}
</div>
```

---

## ✅ **SUCCESS CRITERIA**

After implementing:
- [ ] Left padding minimal (20px equivalent)
- [ ] "So Far" section below user input
- [ ] Input text large and easy to read (`text-xl md:text-2xl`)
- [ ] Property search integrated into engine (same card style)
- [ ] Address bar contained within card width
- [ ] No gradient on main background
- [ ] Preview page clean (PDF + buttons only)
- [ ] Consistent spacing throughout
- [ ] Professional, modern aesthetic

---

## 🚀 **READY FOR V0!**

This prompt gives V0 everything needed to bring the wizard UI to perfection. The changes are surgical, focused, and will make a dramatic improvement in usability and aesthetics.

**Next Steps:**
1. Copy the "V0 Prompt" section above
2. Paste into V0
3. Review generated code
4. I'll integrate with existing business logic
5. Deploy and test!

Let me know when you have the V0 output! 🎯

