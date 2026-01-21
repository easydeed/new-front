# Transfer Tax AI Integration Guide
> **Plug and Play** — Drop-in replacement for existing TransferTaxSection

---

## Overview

The `TransferTaxSectionAI` component replaces the current Transfer Tax section with a conversational AI-guided flow that:

- **Auto-detects exemptions** (interspousal, trust transfers, government entities)
- **Calculates tax with city rates** (LA, SF, Oakland, Berkeley, etc.)
- **Explains WHY** in plain English
- **Falls back gracefully** when AI Assist is off

---

## File Locations

| What | Where |
|------|-------|
| **New Component** | `frontend/src/components/builder/sections/TransferTaxSectionAI.tsx` |
| **Existing Component** | `frontend/src/components/builder/sections/TransferTaxSection.tsx` |
| **Parent Component** | `frontend/src/components/builder/InputPanel.tsx` |
| **Types** | `frontend/src/types/builder.ts` |
| **AI Context** | `frontend/src/contexts/AIAssistContext.tsx` |

---

## Step 1: Backup Existing Component

```bash
cd frontend/src/components/builder/sections
cp TransferTaxSection.tsx TransferTaxSection.tsx.backup
```

---

## Step 2: Verify Types Match

The component expects `DTTData` from `types/builder.ts`. Verify it matches:

```typescript
// frontend/src/types/builder.ts
export interface DTTData {
  isExempt: boolean;
  exemptReason: string;      // e.g., "R&T 11927"
  transferValue: string;     // e.g., "500,000"
  calculatedAmount: string;  // e.g., "550.00"
  basis: 'full_value' | 'less_liens';
  areaType: 'city' | 'unincorporated';
  cityName?: string;
}
```

If your existing type differs, update the component or the type to match.

---

## Step 3: Verify AIAssistContext Exists

The component imports `useAIAssist` from the context. Verify it exists:

```typescript
// frontend/src/contexts/AIAssistContext.tsx
export function useAIAssist() {
  const context = useContext(AIAssistContext);
  if (!context) {
    throw new Error('useAIAssist must be used within AIAssistProvider');
  }
  return context;
}

// Returns: { enabled: boolean, toggle: () => void }
```

---

## Step 4: Check InputPanel Props

The `TransferTaxSectionAI` component needs these props:

```typescript
interface TransferTaxSectionProps {
  value: DTTData | null;
  onChange: (dtt: DTTData) => void;
  city?: string;       // From property data
  county?: string;     // From property data
  deedType: string;    // Current deed type
  grantor: string;     // Grantor name(s)
  grantee: string;     // Grantee name(s)
}
```

In `InputPanel.tsx`, ensure you're passing all required props:

```tsx
// frontend/src/components/builder/InputPanel.tsx

<TransferTaxSection
  value={state.dtt}
  onChange={(dtt) => updateState({ dtt })}
  city={state.property?.city}           // ← ADD if missing
  county={state.property?.county}       // ← ADD if missing
  deedType={state.deedType}             // ← ADD if missing
  grantor={state.grantor}               // ← ADD if missing
  grantee={state.grantee}               // ← ADD if missing
/>
```

---

## Step 5: Replace the Component

Copy the full `TransferTaxSectionAI.tsx` content (from project files) into:

```
frontend/src/components/builder/sections/TransferTaxSection.tsx
```

Or rename and update imports:

```bash
# Option A: Replace in place
cp TransferTaxSectionAI.tsx TransferTaxSection.tsx

# Option B: Keep both, update import
# In InputPanel.tsx:
import { TransferTaxSectionAI as TransferTaxSection } from './sections/TransferTaxSectionAI';
```

---

## Step 6: Test the Flow

### Test 1: Interspousal Auto-Exempt
1. Select "Interspousal Transfer" deed type
2. Open Transfer Tax section
3. **Expected:** Shows "Interspousal transfer deeds are exempt under R&T 11927"
4. Click "Yes, mark as exempt"
5. **Expected:** Shows green "Exempt from Transfer Tax" badge

### Test 2: Trust Transfer Detection
1. Select "Grant Deed"
2. Enter Grantor: `JOHN SMITH`
3. Enter Grantee: `THE JOHN SMITH FAMILY TRUST`
4. Open Transfer Tax section
5. **Expected:** Shows "This appears to be a transfer to the grantor's own revocable trust"

### Test 3: Tax Calculation (Los Angeles)
1. Select "Grant Deed"
2. Search property in Los Angeles
3. Open Transfer Tax section
4. Click "Calculate transfer tax"
5. Enter value: `750,000`
6. Select "Yes, in Los Angeles"
7. **Expected:** Shows County ($825) + LA ($3,375) = $4,200 total

### Test 4: AI Assist Off
1. Toggle AI Assist OFF in header
2. Open Transfer Tax section
3. **Expected:** Shows "AI Assist is off. Enable it for guided transfer tax calculation."

---

## City Tax Rates Included

The component includes rates for:

| City | Rate | Notes |
|------|------|-------|
| Los Angeles | $4.50/1000 | + Measure ULA for $5M+ |
| San Francisco | $6.80/1000 | Tiered rates |
| Oakland | $15.00/1000 | Tiered rates |
| Berkeley | $15.00/1000 | |
| Santa Monica | $3.00/1000 | |
| Culver City | $4.50/1000 | |
| San Jose | $3.30/1000 | |
| Sacramento | $2.75/1000 | |
| Pasadena | $2.20/1000 | |
| Pomona | $2.20/1000 | |
| Redondo Beach | $2.20/1000 | |
| Long Beach | $1.10/1000 | |
| Riverside | $1.10/1000 | |

County rate is always $1.10/1000 (California standard).

---

## Exemption Codes Included

| Code | Auto-Detect Trigger |
|------|---------------------|
| R&T 11911 | Grantor = Grantee (same name) |
| R&T 11922 | Grantee contains "CITY OF", "COUNTY OF", "STATE OF" |
| R&T 11927 | Deed type = interspousal-transfer |
| R&T 11930 | Grantee contains "TRUST" + grantor name |
| R&T 11930.1 | Similar to 11927 for domestic partners |

Manual selection available for all codes.

---

## Troubleshooting

### "useAIAssist must be used within AIAssistProvider"
The DeedBuilder must be wrapped in `AIAssistProvider`. Check `features/builder/DeedBuilder.tsx`:

```tsx
export function DeedBuilder({ deedType }: Props) {
  return (
    <AIAssistProvider>
      <BuilderContent deedType={deedType} />
    </AIAssistProvider>
  );
}
```

### City not detected
City detection uses fuzzy matching on the property city. If a city isn't being detected:

1. Check that `state.property?.city` is being passed
2. Add the city to `CITY_TAX_RATES` in the component

### Tax calculation seems wrong
The component calculates:
- County tax: `(value - liens) / 1000 * 1.10`
- City tax: `(value - liens) / 1000 * cityRate`

For tiered cities (LA, SF, Oakland), the highest applicable tier rate is used.

---

## Layout Preservation

The component is designed to fit within your existing InputSection accordion:

- Uses the same spacing (`space-y-4`)
- Uses your brand colors (`bg-primary`, `text-primary`)
- Uses violet for AI features (`bg-violet-50`, `text-violet-600`)
- Uses emerald for success states (`bg-emerald-50`, `text-emerald-600`)
- Rounded corners match your design (`rounded-lg`, `rounded-xl`)

**No layout changes required** — it's a drop-in replacement.

---

## Files Reference

| File | In Project Files |
|------|------------------|
| `TransferTaxSectionAI.tsx` | ✅ Yes - full component ready |
| Integration changes | This guide |
