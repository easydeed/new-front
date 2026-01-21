# AI-Powered Document Builder — File Summary

## Overview

This is the complete AI integration for the DeedPro Document Builder. Users get intelligent suggestions that reduce clicks, with a toggle to turn AI on/off.

---

## File Structure

```
ai-builder/
├── contexts/
│   └── AIAssistContext.tsx      # Toggle state management (localStorage)
├── lib/
│   └── ai-helpers.ts            # Pattern matching & validation logic
├── components/builder/
│   ├── AIToggle.tsx             # Toggle button for header
│   ├── AISuggestion.tsx         # Suggestion strip components
│   ├── ValidationPanel.tsx      # Pre-generate validation
│   ├── BuilderHeader.tsx        # Header with AI toggle
│   ├── InputPanel.tsx           # Left panel (updated)
│   └── sections/
│       ├── VestingSection.tsx   # With AI suggestions
│       └── TransferTaxSection.tsx # With auto-exempt
└── features/builder/
    └── DeedBuilder.tsx          # Main component with AIAssistProvider
```

---

## How It Works

### 1. Toggle (AIAssistContext.tsx)

- Stored in `localStorage` as `deedpro_ai_assist_enabled`
- Default: **ON**
- Once off, stays off until user turns it back on
- All AI components check this before rendering

```tsx
const { enabled } = useAIAssist()
if (!enabled) return null
```

### 2. Pattern Matching (ai-helpers.ts)

Client-side logic — no API calls needed:

| Function | What It Does |
|----------|-------------|
| `getVestingSuggestion()` | Detects married couples, trusts, single persons |
| `getTransferTaxSuggestion()` | Detects exemptions (interspousal, trust, etc) |
| `validateDeedData()` | Pre-generate sanity checks |
| `analyzePropertyContext()` | Scans owner name for patterns |

### 3. Suggestion Components (AISuggestion.tsx)

Three variants:

| Component | Use Case |
|-----------|----------|
| `<AISuggestion>` | Dismissible suggestion with action button |
| `<AIApplied>` | Shows explanation for auto-applied choices |
| `<AIHint>` | Subtle inline hint (no dismiss) |

### 4. Validation (ValidationPanel.tsx)

Shows before Generate button:

- **Errors** (red) — Block generation
- **Warnings** (amber) — Warn but allow
- **Info** (blue) — Just FYI

Clicking an issue jumps to that section.

---

## AI Behavior by Section

| Section | AI Behavior | Confidence |
|---------|-------------|------------|
| Property | Context detection (trust/married/entity) | — |
| Grantor | Auto-fill from property owner | High |
| Grantee | Warn if same as grantor | High |
| **Vesting** | Suggest based on grantee names | Medium-High |
| **Transfer Tax** | Auto-exempt for interspousal/trust | High |
| Recording | Remember last used partner | — |
| **Generate** | Validation panel | — |

---

## Confidence Levels

**High Confidence → Auto-apply**
- Interspousal deed → Auto-exempt with R&T 11927
- Transfer to own trust → Auto-exempt with R&T 11930

**Medium Confidence → Suggest (dismissible)**
- Two grantees with same last name → "Possibly married?"
- Grantee contains "trust" → Suggest trustee vesting

**Low Confidence → Hint only**
- Single grantee → "Single grantee — adjust if married"

---

## User Controls

### Toggle in Header

```
┌──────────────────────────────────────────────────────────────┐
│  [←] Exit    Grant Deed              [AI Assist ●───] [Help] │
└──────────────────────────────────────────────────────────────┘
```

- Violet when ON, gray when OFF
- Click to toggle
- Persists in localStorage

### Dismiss Suggestions

Every suggestion has an X button. Dismissed suggestions don't come back for that deed.

---

## What AI Does NOT Do

- ❌ Block the user from proceeding (except real errors)
- ❌ Ask questions before showing the form
- ❌ Require confirmation for every suggestion
- ❌ Override user choices after they've selected
- ❌ Make API calls (all client-side pattern matching)

---

## Installation

1. Copy `ai-builder/` folder contents to your project

2. Ensure you have these existing files (from v0):
   - `components/builder/InputSection.tsx`
   - `components/builder/PreviewPanel.tsx`
   - `components/builder/sections/PropertySection.tsx`
   - `components/builder/sections/GrantorSection.tsx`
   - `components/builder/sections/GranteeSection.tsx`
   - `components/builder/sections/RecordingSection.tsx`

3. Replace these files with the AI-enhanced versions:
   - `components/builder/BuilderHeader.tsx`
   - `components/builder/InputPanel.tsx`
   - `components/builder/sections/VestingSection.tsx`
   - `components/builder/sections/TransferTaxSection.tsx`
   - `features/builder/DeedBuilder.tsx`

4. Add the new files:
   - `contexts/AIAssistContext.tsx`
   - `lib/ai-helpers.ts`
   - `components/builder/AIToggle.tsx`
   - `components/builder/AISuggestion.tsx`
   - `components/builder/ValidationPanel.tsx`

---

## Testing Checklist

- [ ] Toggle remembers state after page refresh
- [ ] Toggle OFF hides all AI suggestions
- [ ] Interspousal deed auto-selects exempt + R&T 11927
- [ ] Two grantees with same last name suggests Community Property
- [ ] Trust in grantee name suggests Trustee vesting
- [ ] Validation shows error for Joint Tenancy with 1 grantee
- [ ] Validation shows warning for missing exemption reason
- [ ] Clicking validation issue jumps to section
- [ ] Generate button disabled when validation errors exist

---

## Future Enhancements

1. **"Ask AI" button** — Contextual chat for edge cases
2. **Learning from usage** — Track which suggestions get applied vs dismissed
3. **More pattern detection** — LLC, trust name extraction, etc.
4. **API-powered suggestions** — For complex cases beyond pattern matching
