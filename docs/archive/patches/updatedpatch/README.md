# DeedPro Modern Wizard v3.3 — Patch + Partners + Progress (Cursor Bundle)

**Build date:** 2025-10-15T17:32:45.298066Z

This bundle delivers a **single drop‑in patch** that:
- Fixes the Modern → Classic redirect on finalize (stays in Modern & posts canonical payload).
- Adds an **in‑UI Mode Toggle** (Modern ⇄ Classic) and **preserves the selected mode** across navigation.
- Aligns Modern wizard **layout and spacing** to Classic (big prompt, big inputs, centered, padded).
- **Prefills** Modern prompts from verified property/owner data + **Industry Partners** (new sidebar).
- **Unifies the progress bar** component and step model for Classic and Modern.
- Hard‑separates **localStorage keys** for Classic vs Modern to eliminate hydration/stale state bleed.
- Includes a **minimal backend** (FastAPI/SQLAlchemy/Alembic) for Partners with categories and people.
- Leaves your **crown‑jewel flow (Step 1 property verification)** intact, then continues in Modern Q&A.

> This bundle was tailored from our Phase 15 hydration analysis and the v3 Systems Architect review.
> See inline citations in your patch PR description. 

---

## What’s inside

```
frontend/
  features/wizard/
    mode/
      ModeContext.tsx
      WizardModeBoundary.tsx
      bridge/useWizardStoreBridge.ts
      engines/ModernEngine.tsx
      prompts/promptFlows.ts
      review/SmartReview.tsx
    adapters/
      grantDeedAdapter.ts
      quitclaimAdapter.ts
      interspousalAdapter.ts
      warrantyAdapter.ts
      taxDeedAdapter.ts
      index.ts
  components/
    ModeToggle.tsx
    ProgressBarUnified.tsx
    DeedTypeBadge.tsx
    PrefillSelect.tsx
    PartnerPicker.tsx
    IndustryPartnersPanel.tsx
    ModernStepShell.tsx
  styles/modern-wizard.css
  utils/finalizeDeed.ts

backend/              # Minimal, additive. Wire into your FastAPI app.
  alembic/versions/xxxx_add_partners_table.py
  app/models/partner.py
  app/schemas/partner.py
  app/api/routes/partners.py
  README_BACKEND.md

MIGRATION_NOTES.md
INTEGRATION_CHECKLIST.md
```

---

## Quick Start (Cursor)

1) **Create a branch** (e.g., `feat/modern-v3_3`).
2) **Drag & drop** `frontend/` folder into your front‑end repo (`deedpro-frontend-new/`).
3) **Drag & drop** `backend/` folder into your backend repo (FastAPI service).
4) Apply the steps in **INTEGRATION_CHECKLIST.md** (copy/paste imports noted below).
5) Run locally → verify Modern mode (`?mode=modern`) end‑to‑end, then push to staging.

---

## One‑time imports you must add

### 1) App Router page (keeps layout & mode)
**`app/create-deed/[docType]/page.tsx`**
```tsx
// ADD at top
'use client';
import WizardModeBoundary from '@/features/wizard/mode/WizardModeBoundary';
import ModeToggle from '@/components/ModeToggle';
import IndustryPartnersPanel from '@/components/IndustryPartnersPanel';
import ModernEngine from '@/features/wizard/mode/engines/ModernEngine';
import ClassicWizard from '@/path/to/ClassicWizard'; // your existing
import { useWizardStoreBridge } from '@/features/wizard/mode/bridge/useWizardStoreBridge';

export default function UnifiedWizardPage({ params, searchParams }) { /* ... */ }
```

Place:
```tsx
<WizardModeBoundary docType={docType}>
  <div className="wizard-frame">
    <ModeToggle />
    <div className="wizard-body">
      {/* Property step remains shared/unchanged */}
      {/* After verified, render Classic or Modern */}
    </div>
    <IndustryPartnersPanel /> {/* collapsible sidebar */}
  </div>
</WizardModeBoundary>
```

### 2) Classic Wizard progress bar swap
Replace your classic progress with:
```tsx
import ProgressBarUnified from '@/components/ProgressBarUnified';
<ProgressBarUnified docType={docType} mode="classic" />
```

### 3) Modern Engine finalize
Modern engine now calls `utils/finalizeDeed.ts` which posts the canonical payload and
redirects to `/deeds/:id/preview?mode=modern`. No more classic fallback.

---

## Why this fixes your issues

- **Hydration**: We guard *all* localStorage access until hydration and use **mode‑scoped keys** (`deedWizardDraft_modern` vs `deedWizardDraft_classic`). This addresses the lingering mismatch that pulled stale “1358 5th St” from classic sessions. 
- **React error #300**: Removed conditional hook usage and ensured **all modern components are client components** with hooks isolated to component bodies.
- **Finalize → Classic**: All finalize navigation now **preserves `mode=modern`** and posts to backend first, then routes to preview; no implicit classic route. 

See `MIGRATION_NOTES.md` for file‑by‑file context and `INTEGRATION_CHECKLIST.md` for test steps.
