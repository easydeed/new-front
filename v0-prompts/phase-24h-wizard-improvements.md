# 🧙‍♂️ Phase 24-H: Grant Deed Wizard UI Improvements

**Created**: November 5, 2025  
**Status**: 🔄 PLANNING - Awaiting V0 Generation  
**Priority**: HIGH - User Experience Enhancement  
**Complexity**: MEDIUM - UI/UX redesign with business logic updates

---

## 📊 **EXECUTIVE SUMMARY**

### **Problem Statement**
The current Grant Deed wizard has usability issues:
1. **Parties Step is Verbose** - Grantor and Grantee are collected separately with excessive spacing
2. **Tax Calculation Missing** - System asks for DTT amount but doesn't calculate it (requires manual input)
3. **Redundant Steps** - 5-step flow has opportunities for consolidation
4. **No Transfer Value Collection** - Can't auto-calculate DTT without knowing property transfer value

### **Proposed Solution**
1. **Consolidate Parties Section** - Combine Grantor + Grantee into single, compact UI component
2. **Enhanced Document Transfer Tax Step** - Replace basic "Tax" step with comprehensive "Document Transfer Tax" section that:
   - Collects transfer value
   - Auto-calculates DTT amount (at $1.10 per $1,000 of value)
   - Shows breakdown and explanation
   - Handles exemptions
3. **Modern UI Components** - Use V0 to design professional, space-efficient form sections

### **Impact**
- ✅ **Faster workflow** - Fewer clicks, consolidated sections
- ✅ **Reduced errors** - Auto-calculation eliminates manual math mistakes
- ✅ **Better UX** - Modern, professional UI with clear visual hierarchy
- ✅ **Educational** - Inline explanations of DTT calculation

---

## 🔍 **CURRENT STATE ANALYSIS**

### **Current Grant Deed Wizard Flow (Classic Wizard)**

```
Step 1: Address
├─ Property Search (SiteX integration)
├─ APN verification
└─ County detection

Step 2: Request Details
├─ Recording requested by
├─ Title company
├─ Escrow number
├─ Title order number
└─ Mail-to address

Step 3: Tax ⚠️ NEEDS IMPROVEMENT
├─ DTT Amount (manual input only) ❌
├─ DTT Basis (full value vs. less liens)
├─ Area type (unincorporated vs. city)
└─ City name (if applicable)

Step 4: Parties ⚠️ NEEDS IMPROVEMENT
├─ Grantors Text (separate field) ❌
├─ Grantees Text (separate field) ❌
├─ County (duplicate from Step 1?) 
└─ Legal Description

Step 5: Preview
└─ Final review before PDF generation
```

### **Current Data Model (from context builder)**

```typescript
// Step 3 - Tax Data (backend/models/grant_deed.py)
step3?: {
  dttAmount?: string;           // Manual input only ❌
  dttBasis?: 'full_value' | 'less_liens';
  areaType?: 'unincorporated' | 'city';
  cityName?: string;
}

// Step 4 - Parties Data
step4?: {
  grantorsText?: string;        // Separate ❌
  granteesText?: string;        // Separate ❌
  county?: string;              // Duplicate from step1
  legalDescription?: string;
}
```

### **Pain Points**

| Issue | Current Behavior | User Impact | Severity |
|-------|-----------------|-------------|----------|
| **No DTT Calculation** | User must manually calculate $1.10 per $1,000 | Error-prone, time-consuming | 🔴 HIGH |
| **Separate Grantor/Grantee** | Two separate text fields, lots of whitespace | Feels slow, repetitive | 🟡 MEDIUM |
| **Missing Transfer Value** | Can't auto-calculate without this critical data point | Workflow blocker | 🔴 HIGH |
| **Redundant County Field** | Asked in Step 1 (property search) and Step 4 (parties) | Confusing, unnecessary | 🟡 MEDIUM |
| **Plain Tax UI** | Simple text input, no context | Not educational, prone to mistakes | 🟡 MEDIUM |

---

## 🎯 **PROPOSED IMPROVEMENTS**

### **Improvement 1: Consolidated Parties Section**

#### **Before (Step 4 - Current)**
```
┌────────────────────────────────────────────┐
│  Who is transferring title (Grantor)?     │
│  ┌──────────────────────────────────────┐ │
│  │ John Smith                           │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  Who is receiving title (Grantee)?        │
│  ┌──────────────────────────────────────┐ │
│  │ Jane Doe                             │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

#### **After (Step 4 - Proposed)**
```
┌────────────────────────────────────────────────────────┐
│  PARTIES TO THE TRANSFER                               │
│  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ FROM (Grantor)   │  │ TO (Grantee)              │  │
│  │ ┌──────────────┐ │  │ ┌───────────────────────┐ │  │
│  │ │ John Smith   │ │  │ │ Jane Doe              │ │  │
│  │ └──────────────┘ │  │ └───────────────────────┘ │  │
│  │ [SiteX prefill]  │  │ Manual entry              │  │
│  └──────────────────┘  └───────────────────────────┘  │
│                                                        │
│  Vesting (how title will be held)                     │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Sole and Separate Property                       │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

**Key Features:**
- ✅ Side-by-side layout (responsive: stacks on mobile)
- ✅ Clear visual hierarchy with labels
- ✅ Prefill indicator for Grantor (SiteX data)
- ✅ Integrated vesting field
- ✅ 50% less vertical space

---

### **Improvement 2: Enhanced Document Transfer Tax Step**

#### **Before (Step 3 - Current)**
```
┌────────────────────────────────────────────┐
│  Transfer Tax Amount                       │
│  ┌──────────────────────────────────────┐ │
│  │ $________________                    │ │  ❌ Manual calculation
│  └──────────────────────────────────────┘ │
│                                            │
│  [x] Computed on full value of property   │
│  [ ] Computed on value less liens         │
└────────────────────────────────────────────┘
```

#### **After (Step 3 - Proposed)**
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 DOCUMENTARY TRANSFER TAX CALCULATION                        │
│                                                                  │
│  What is the property transfer value?                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ $  500,000                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  💡 This is the purchase price or fair market value             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ CALCULATION BREAKDOWN                                   │   │
│  │                                                         │   │
│  │  Transfer Value:        $500,000                       │   │
│  │  Rate:                  $1.10 per $1,000              │   │
│  │  ───────────────────────────────────────────────────  │   │
│  │  Documentary Transfer Tax:  $550.00                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Tax computation basis:                                         │
│  ● Computed on full value of property conveyed                 │
│  ○ Computed on value less liens                                │
│                                                                  │
│  Property location:                                             │
│  ● Unincorporated area                                          │
│  ○ City of: [________________]                                  │
│  💡 Some cities charge additional transfer tax                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️ EXEMPTION (if applicable)                            │   │
│  │ [ ] This transfer is exempt from DTT                    │   │
│  │     Reason: [__________________________________]        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- ✅ **Transfer value input** - Primary data point
- ✅ **Auto-calculation** - Real-time DTT calculation ($1.10 per $1,000)
- ✅ **Visual breakdown** - Shows math in clear panel
- ✅ **Educational tooltips** - Explains what each field means
- ✅ **Exemption handling** - Optional checkbox with reason field
- ✅ **City tax awareness** - Notes potential additional charges
- ✅ **Radio buttons** - Clearer UX than checkboxes for single-selection

---

## 🧮 **DTT CALCULATION LOGIC**

### **California Documentary Transfer Tax Formula**

```
DTT Amount = (Transfer Value ÷ 1000) × $1.10
```

**Example Calculations:**

| Transfer Value | Calculation | DTT Amount |
|----------------|-------------|------------|
| $100,000 | (100,000 ÷ 1,000) × $1.10 | **$110.00** |
| $500,000 | (500,000 ÷ 1,000) × $1.10 | **$550.00** |
| $1,000,000 | (1,000,000 ÷ 1,000) × $1.10 | **$1,100.00** |
| $1,500,000 | (1,500,000 ÷ 1,000) × $1.10 | **$1,650.00** |

### **Implementation Notes**

1. **Rounding**: Round to 2 decimal places (cents)
2. **Minimum**: California has no minimum DTT
3. **City Taxes**: Some cities add their own transfer tax (e.g., San Francisco adds $25-$30 per $1,000)
4. **Exemptions**: Common exemptions include:
   - Gifts to family members
   - Transfers between spouses
   - Transfers to/from partnerships/LLCs with same owners
   - Court-ordered transfers

### **React State Logic**

```typescript
// Real-time calculation hook
function useTransferTaxCalculation(transferValue: number | null) {
  const [dttAmount, setDttAmount] = useState<number>(0);
  
  useEffect(() => {
    if (transferValue && transferValue > 0) {
      const calculated = (transferValue / 1000) * 1.10;
      setDttAmount(Number(calculated.toFixed(2)));
    } else {
      setDttAmount(0);
    }
  }, [transferValue]);
  
  return dttAmount;
}

// Usage in component
const transferValue = parseFloat(formData.transferValue) || 0;
const dttAmount = useTransferTaxCalculation(transferValue);
```

---

## 📐 **TECHNICAL SPECIFICATIONS**

### **New Data Model**

```typescript
// Step 3 - Enhanced Tax Data
step3?: {
  transferValue: number;                    // NEW: Primary input ✅
  dttAmount: number;                        // AUTO-CALCULATED ✅
  dttBasis: 'full_value' | 'less_liens';   // Radio buttons
  areaType: 'unincorporated' | 'city';     // Radio buttons
  cityName?: string;                        // Conditional on areaType
  isExempt: boolean;                        // NEW: Exemption flag ✅
  exemptionReason?: string;                 // NEW: Required if isExempt ✅
}

// Step 4 - Consolidated Parties Data
step4?: {
  grantorName: string;                      // RENAMED from grantorsText
  granteeName: string;                      // RENAMED from granteesText
  vesting?: string;                         // Moved from separate field
  legalDescription: string;                 // Kept (or prefilled from SiteX)
  // county removed (already in step1)
}
```

### **Backend Changes Required**

**File**: `backend/models/grant_deed.py`

```python
class GrantDeedContext(BaseDeedContext):
    """Grant Deed specific context"""
    
    # DTT fields (updated)
    transfer_value: Optional[float] = None           # NEW ✅
    dtt: Optional[Dict[str, Optional[str]]] = {
        'amount': None,                              # Auto-calculated
        'basis': None,                               # 'full' or 'less_liens'
        'city': None,
        'is_exempt': False,                          # NEW ✅
        'exemption_reason': None                     # NEW ✅
    }
    
    # Parties (field names unchanged for backend compatibility)
    grantors_text: Optional[str] = None
    grantees_text: Optional[str] = None
    vesting: Optional[str] = None
    
    @validator('dtt', pre=True, always=True)
    def auto_calculate_dtt(cls, v, values):
        """Auto-calculate DTT if transfer_value is provided"""
        if v and values.get('transfer_value'):
            transfer_val = values['transfer_value']
            if not v.get('amount') and not v.get('is_exempt'):
                # Calculate: $1.10 per $1,000
                calculated = round((transfer_val / 1000) * 1.10, 2)
                v['amount'] = str(calculated)
        return v
```

### **Frontend Files to Modify**

| File | Purpose | Changes |
|------|---------|---------|
| `frontend/src/features/wizard/flows.ts` | Step definitions | Update step 3 and 4 IDs |
| `frontend/src/features/wizard/context/buildContext.ts` | Data mapping | Update tax and parties fields |
| `frontend/src/features/wizard/validation/zodSchemas.ts` | Validation rules | Add transferValue, isExempt validation |
| `frontend/src/features/wizard/types.ts` | TypeScript types | Update Step3 and Step4 types |

### **New V0 Components Needed**

1. **`ConsolidatedPartiesSection.tsx`**
   - Side-by-side Grantor/Grantee inputs
   - Responsive layout (stacks on mobile)
   - Prefill indicators
   - Integrated vesting field

2. **`DocumentTransferTaxCalculator.tsx`**
   - Transfer value input
   - Real-time calculation display
   - Breakdown panel with visual hierarchy
   - Radio button groups (basis, area type)
   - Conditional city name input
   - Exemption checkbox with reason textarea

---

## 🎨 **V0 PROMPT (DETAILED)**

### **Component 1: Consolidated Parties Section**

```
I need a React component for a legal document wizard step that collects information about parties in a property transfer.

CONTEXT:
- This is for a Grant Deed (California real estate transfer document)
- Replacing a verbose 2-field vertical layout with compact side-by-side design
- Must work in a Next.js 14+ app with Tailwind CSS v3
- Users are real estate professionals who value efficiency

COMPONENT NAME: ConsolidatedPartiesSection

VISUAL LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  Parties to the Transfer                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐ │
│  │ FROM (Grantor) *              │  │ TO (Grantee) *          │ │
│  │ ┌──────────────────────────┐ │  │ ┌───────────────────────┐│ │
│  │ │ John Smith               │ │  │ │ Jane Doe              ││ │
│  │ └──────────────────────────┘ │  │ └───────────────────────┘│ │
│  │ 🔵 Prefilled from records    │  │                         │ │
│  └──────────────────────────────┘  └─────────────────────────┘ │
│                                                                  │
│  Vesting (How will title be held?)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Sole and Separate Property                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  💡 Common options: "Sole and Separate", "Joint Tenants",      │
│     "Community Property", "Tenants in Common"                   │
│                                                                  │
│  Legal Description *                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Lot 12, Block 3, Tract 5678, as per map recorded in    │   │
│  │ Book 89, Page 45, Official Records of Los Angeles...   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  🔵 Prefilled from county records                              │
└─────────────────────────────────────────────────────────────────┘

REQUIREMENTS:

1. LAYOUT & RESPONSIVE:
   - Desktop (>768px): Side-by-side 2-column grid for Grantor/Grantee
   - Mobile (<768px): Stack vertically
   - Clean spacing, modern card-based design
   - Use Tailwind's grid system

2. FIELDS:
   a) Grantor (FROM) - Text input
      - Label: "FROM (Grantor) *"
      - Required field
      - Prefill indicator if data exists (blue badge: "🔵 Prefilled from records")
      - Placeholder: "e.g., John Smith and Mary Smith, husband and wife"
   
   b) Grantee (TO) - Text input
      - Label: "TO (Grantee) *"
      - Required field
      - Placeholder: "e.g., Jane Doe, a single woman"
   
   c) Vesting - Text input
      - Label: "Vesting (How will title be held?)"
      - Optional
      - Placeholder: "e.g., Sole and Separate Property"
      - Info tooltip with examples
   
   d) Legal Description - Textarea
      - Label: "Legal Description *"
      - Required field
      - 4 rows minimum
      - Prefill indicator if data exists
      - Placeholder: "Lot, Block, Tract information..."

3. STYLING:
   - Professional, legal document aesthetic
   - Blue accent color (#2563eb)
   - Required fields marked with red asterisk (*)
   - Subtle borders, clean shadows
   - Clear visual hierarchy

4. PROPS INTERFACE:
   ```typescript
   interface ConsolidatedPartiesSectionProps {
     grantorName: string;
     granteeName: string;
     vesting: string;
     legalDescription: string;
     onChange: (field: string, value: string) => void;
     errors?: {
       grantorName?: string;
       granteeName?: string;
       legalDescription?: string;
     };
     prefilled?: {
       grantorName?: boolean;
       legalDescription?: boolean;
     };
   }
   ```

5. BEHAVIOR:
   - Real-time onChange updates (no debouncing needed)
   - Show validation errors below each field (red text)
   - Prefill badges only show when prefilled prop is true
   - Tooltip for vesting field with common examples

6. ACCESSIBILITY:
   - All inputs have associated labels
   - Required fields have aria-required="true"
   - Error messages have aria-live="polite"
   - Keyboard navigation works smoothly

7. TECH STACK:
   - React 18+
   - TypeScript
   - Tailwind CSS v3
   - No external UI libraries (build from scratch)
   - Use Lucide React for icons (Info icon for tooltip)

Please generate the complete component code.
```

---

### **Component 2: Document Transfer Tax Calculator**

```
I need a React component for calculating California Documentary Transfer Tax (DTT) in a real estate deed wizard.

CONTEXT:
- Part of Grant Deed creation flow for California properties
- Replaces simple manual input with auto-calculating smart form
- Used by real estate agents, title companies, and escrow officers
- Must be educational (explain calculations) and error-proof

COMPONENT NAME: DocumentTransferTaxCalculator

CALIFORNIA DTT LAW:
- Rate: $1.10 per $1,000 of property value
- Calculation: (Transfer Value ÷ 1,000) × $1.10
- Example: $500,000 property = $550.00 tax
- Optional exemptions for certain transfers
- Some cities add additional tax (mentioned, not calculated here)

VISUAL LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  📊 Documentary Transfer Tax Calculation                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Property Transfer Value *                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ $ 500,000                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│  💡 Enter the purchase price or fair market value               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ╔═══════════════════════════════════════════════════╗   │   │
│  │ ║ CALCULATION BREAKDOWN                             ║   │   │
│  │ ╚═══════════════════════════════════════════════════╝   │   │
│  │                                                         │   │
│  │  Transfer Value:             $500,000.00               │   │
│  │  California DTT Rate:        $1.10 per $1,000         │   │
│  │  ─────────────────────────────────────────────────────│   │
│  │  Documentary Transfer Tax:   $550.00                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Tax Computation Basis *                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Computed on full value of property conveyed          │   │
│  │ ○ Computed on value less liens remaining               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Property Location *                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Unincorporated area                                   │   │
│  │ ○ City of: [San Francisco            ▼]                │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ Some cities charge additional local transfer tax            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚠️  EXEMPTION (if applicable)                           │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ ☐ This transfer is exempt from DTT                  │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │ If exempt, please provide reason:                       │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ Gift to family member, no consideration             │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │ 💡 Common exemptions: family gifts, spousal transfers, │   │
│  │    partnership changes with same ownership              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

REQUIREMENTS:

1. CALCULATION LOGIC:
   - Real-time calculation as user types transfer value
   - Formula: (transferValue / 1000) * 1.10
   - Round to 2 decimal places (cents)
   - Format with commas (e.g., $1,234.56)
   - If exempt checkbox is checked, show $0.00 but still show calculation

2. FIELDS:

   a) Transfer Value Input
      - Type: Currency input ($)
      - Required
      - Format: Adds commas automatically (500000 → $500,000)
      - Validates: Must be positive number
      - Min: $1
      - Placeholder: "$500,000"
   
   b) Calculation Breakdown Panel
      - Appears immediately when transfer value > 0
      - Shows: Transfer Value, Rate, Calculated Tax
      - Visually distinct (bordered box, light background)
      - Animated entrance (fade in)
   
   c) Tax Computation Basis
      - Radio buttons (only one selectable)
      - Options: "Full value" (default), "Less liens"
      - Required
   
   d) Property Location
      - Radio buttons: "Unincorporated" (default), "City"
      - If "City" selected, show text input for city name
      - City input required if "City" radio selected
      - Info message about potential additional city tax
   
   e) Exemption Section
      - Checkbox: "This transfer is exempt from DTT"
      - If checked, show textarea for exemption reason
      - Exemption reason required if checkbox checked
      - When exempt, calculation panel shows strike-through
      - Warning icon (⚠️) for visual emphasis

3. STYLING:
   - Professional legal document aesthetic
   - Blue primary color (#2563eb)
   - Green accent for calculation panel (#10b981)
   - Yellow/amber for exemption section (#f59e0b)
   - Clear visual hierarchy (emoji icons for sections)
   - Smooth animations for conditional fields
   - Responsive (stacks on mobile <768px)

4. PROPS INTERFACE:
   ```typescript
   interface DocumentTransferTaxCalculatorProps {
     transferValue: number | null;
     dttBasis: 'full_value' | 'less_liens';
     areaType: 'unincorporated' | 'city';
     cityName: string;
     isExempt: boolean;
     exemptionReason: string;
     onChange: (field: string, value: any) => void;
     errors?: {
       transferValue?: string;
       dttBasis?: string;
       areaType?: string;
       cityName?: string;
       exemptionReason?: string;
     };
   }
   ```

5. COMPUTED VALUE:
   - Component computes DTT amount internally
   - Triggers onChange('dttAmount', calculatedValue) automatically
   - Format as number (don't store as string)

6. BEHAVIOR:
   - Transfer value input accepts only numbers and decimal point
   - Auto-formats with dollar sign and commas
   - Calculation updates in real-time (debounce 300ms optional)
   - City name input only visible when "City" radio selected
   - Exemption reason only visible when exempt checkbox checked
   - Show validation errors below respective fields

7. ACCESSIBILITY:
   - All inputs properly labeled
   - Radio buttons in fieldsets with legends
   - Aria-live region for calculated tax amount
   - Keyboard navigation works perfectly
   - Screen reader friendly

8. TECH STACK:
   - React 18+
   - TypeScript
   - Tailwind CSS v3
   - Lucide React for icons
   - No external form libraries (vanilla React)

9. EDGE CASES:
   - Handle empty/null transfer value gracefully
   - Handle non-numeric input (show error)
   - Handle very large numbers (up to $999,999,999)
   - Show $0.00 if transfer value is 0 or negative

10. INLINE HELP:
    - Info icon tooltips for "Transfer Value" and "City tax"
    - Examples in placeholders
    - Light text for explanatory notes

Please generate the complete component code with all functionality, styling, and TypeScript types.
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: V0 Component Generation** (User Task)
- [ ] Generate `ConsolidatedPartiesSection.tsx` in V0
- [ ] Generate `DocumentTransferTaxCalculator.tsx` in V0
- [ ] Review and iterate on designs
- [ ] Export final code from V0

### **Phase 2: Integration** (AI Task)
- [ ] Create `frontend/src/features/wizard/steps/ConsolidatedPartiesSection.tsx`
- [ ] Create `frontend/src/features/wizard/steps/DocumentTransferTaxCalculator.tsx`
- [ ] Update `flows.ts` with new step IDs
- [ ] Update `types.ts` with new TypeScript interfaces
- [ ] Update `buildContext.ts` adapter for new data structure
- [ ] Update `zodSchemas.ts` validation rules
- [ ] Add DTT calculation hook `useTransferTaxCalculation.ts`

### **Phase 3: Backend Updates** (AI Task)
- [ ] Update `backend/models/grant_deed.py` with new fields
- [ ] Add `transfer_value` field
- [ ] Add DTT auto-calculation validator
- [ ] Add exemption fields (`is_exempt`, `exemption_reason`)
- [ ] Update PDF template to use calculated DTT
- [ ] Test backend validation

### **Phase 4: Testing** (AI + User)
- [ ] Test DTT calculation with various values
- [ ] Test exemption flow
- [ ] Test prefill behavior (SiteX data)
- [ ] Test responsive layouts (mobile/desktop)
- [ ] Test validation error states
- [ ] Test full wizard flow end-to-end
- [ ] Generate sample PDF with new data

### **Phase 5: Documentation** (AI Task)
- [ ] Update `ARCHITECTURE.md` with new step descriptions
- [ ] Update `PROJECT_STATUS.md` with Phase 24-H completion
- [ ] Create user guide for new DTT calculator
- [ ] Document exemption codes and use cases

---

## 🎯 **SUCCESS METRICS**

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Wizard Completion Time** | ~5 minutes | ~3 minutes | User testing |
| **DTT Calculation Errors** | High (manual) | Zero | Error logs |
| **User Satisfaction** | Unknown | 9/10 | Post-launch survey |
| **Steps in Flow** | 5 steps | 5 steps (same) | UI audit |
| **Clicks to Complete** | ~25 clicks | ~15 clicks | Analytics |

---

## 🚨 **RISKS & MITIGATION**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **V0 generates incompatible code** | Medium | Medium | Manual code review, TypeScript checks |
| **DTT calculation formula incorrect** | Low | High | Cross-reference CA Revenue Code, add unit tests |
| **Breaking changes to existing data** | Low | High | Backward compatibility layer, migration script |
| **Mobile layout issues** | Medium | Low | Responsive testing, Tailwind breakpoints |
| **Performance impact (calculations)** | Low | Low | Debounce, React.memo optimization |

---

## 📚 **APPENDIX**

### **A. California DTT Legal References**

- **California Revenue and Taxation Code § 11911-11935**
- Standard rate: $0.55 per $500 (equivalent to $1.10 per $1,000)
- County recorders collect and remit to state

### **B. City-Specific Additional Taxes (Examples)**

| City | Rate | Notes |
|------|------|-------|
| San Francisco | $25-$30 per $1,000 | Varies by property type |
| Oakland | $15 per $1,000 | On transfers >$300,000 |
| Berkeley | $15 per $1,000 | Residential properties |
| Los Angeles | None | Only county tax applies |

### **C. Common DTT Exemptions**

1. **Gifts** - No monetary consideration (e.g., parent to child)
2. **Interspousal Transfers** - Divorce, separation, or estate planning
3. **Partnership Changes** - Same beneficial ownership
4. **Transfers to secure debt** - Mortgages, deeds of trust
5. **Government entities** - To/from public agencies

### **D. Existing Component Patterns**

Refer to these existing wizard components for style consistency:
- `frontend/src/features/wizard/mode/components/StepShell.tsx` - Wrapper pattern
- `frontend/src/features/wizard/mode/components/PrefillCombo.tsx` - Prefill UI pattern
- `frontend/src/features/wizard/mode/review/SmartReview.tsx` - Summary display pattern

---

**END OF PHASE 24-H ANALYSIS**

*Next Step: Generate components in V0, then proceed with implementation checklist.*


