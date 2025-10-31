# MASTER V0 PROMPT — Wizard (UI‑Only, Phase 24‑B/C)

**Target:** Vercel V0
**Goal:** Redesign the **visual layer only** for our deed creation wizard (both Modern & Classic surfaces). **ABSOLUTELY NO LOGIC CHANGES.**

## 0) Hard Rules (do not break)
- **DO NOT** touch SiteX calls, canonical adapters, `finalizeDeed`, or PDF generation paths.
- **DO NOT** rename props, functions, or localStorage keys.
- **DO NOT** change form validation rules or event handlers.
- You may change markup, layout, spacing, visuals, and motion.

### Critical Data/State (read‑only for you)
- SiteX hydration (address → APN, County, Legal Description, Current Owner)
- localStorage draft (modern/classic keys)
- Partners dropdown data
- Canonical adapters → `/api/deeds/create`

## 1) Component Targets (create *-V0 variants only)
You will return *visual* replacements that accept the **exact same props** as our current components:

1. **PropertySearchV0.tsx** — purely presentational wrapper over our existing `PropertySearchWithTitlePoint` logic.
2. **WizardStepCardV0.tsx** — container for each step (cards, headings, controls).
3. **SmartReviewV0.tsx** — read‑only summary of all collected data with “Edit” buttons.
4. **ProgressIndicatorV0.tsx** — stepper/progress for Classic wizard.

## 2) Props Contracts (do not add/remove/rename)
```ts
// Property Search
export interface PropertySearchProps {
  value: string
  loading: boolean
  error?: string
  onChange: (s: string) => void
  onVerify: () => void         // triggers address verification → SiteX
  suggestions: { label: string; value: string }[]
  onSelectSuggestion: (v: string) => void
}

// Step Card shell
export interface WizardStepCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

// SmartReview (simplified)
export interface SmartReviewProps {
  data: Record<string, any>     // already normalized
  onEdit: (section: string) => void
  onConfirm: () => void         // leads to finalizeDeed
}

// Progress (Classic)
export interface ProgressIndicatorProps {
  steps: { key: string; label: string }[]
  activeKey: string
}
```

## 3) Visual Language & Tokens (fixed colors, your composition)
```
--surface:  #F9F9F9
--ink:      #1F2B37
--accent-1: #7C4DFF
--accent-2: #4F76F6
--success:  #10B981
--error:    #EF4444
```
- Light, calm, low‑contrast; smooth transitions between steps.
- Accessible focus states and labels; generous spacing; readable type scale.

## 4) What to deliver
- **Four .tsx components** listed above, using Tailwind.
- **No external state or API calls** inside these components.
- Provide skeleton/loading and error styling patterns we can reuse.

## 5) Motion
- Micro‑interactions on focus/hover; graceful step transitions.
- Respect `prefers-reduced-motion`.

## 6) Output format
Return each component as a separate .tsx file with the exact prop interfaces shown above. Avoid global CSS.
