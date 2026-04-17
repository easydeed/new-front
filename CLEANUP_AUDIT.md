# CLEANUP_AUDIT

Audit of competing deed-creation architectures and supporting docs in this repo.
No files were deleted, renamed, or modified during this audit.

Architectures referenced below:
- **(a)** DeedBuilder — two-panel "input + live preview" layout rooted at `frontend/src/features/builder/` and `frontend/src/components/builder/**`, reached via `/deed-builder` routes.
- **(b)** Modern 3-step wizard — `WizardHost2` + `DeedTypePropertyStep` → `SmartConfirmScreen` → `SuccessScreen`, reached via `/create-deed-v2`.
- **(c)** Classic 5-step wizard — `features/wizard/mode/WizardHost` + `ModernEngine`, reached via `/create-deed/[docType]`. Internally labeled "Phase 24-C Modern Wizard" after the original Classic engine was removed, but it is still the multi-step wizard you're targeting for removal.

---

## Section 1 — Deed creation UIs

### Routes (app router pages)

| Route / file | Arch | Notes |
|---|---|---|
| [frontend/src/app/deed-builder/page.tsx](frontend/src/app/deed-builder/page.tsx) | (a) | Deed-type picker, links into `/deed-builder/[type]` |
| [frontend/src/app/deed-builder/[type]/page.tsx](frontend/src/app/deed-builder/[type]/page.tsx) | (a) | Mounts `<DeedBuilder deedType={type}>` inside `PartnersProvider` + `SidebarProvider` |
| [frontend/src/app/deed-builder/[type]/success/page.tsx](frontend/src/app/deed-builder/[type]/success/page.tsx) | (a) | Post-generate success screen for DeedBuilder |
| [frontend/src/app/deed-builder/[type]/success/success-content.tsx](frontend/src/app/deed-builder/[type]/success/success-content.tsx) | (a) | Inner content for the success page |
| [frontend/src/app/create-deed-v2/page.tsx](frontend/src/app/create-deed-v2/page.tsx) | (b) | Auth gate + `<WizardHost2 />` |
| [frontend/src/app/create-deed/page.tsx](frontend/src/app/create-deed/page.tsx) | (c) | Deed-type picker for the multi-step wizard. Imports `WIZARD_DRAFT_KEY_MODERN/CLASSIC` from `features/wizard/mode/bridge/persistenceKeys.ts` to clear drafts before routing to `/create-deed/[docType]`. **Flag:** this picker is part of (c) even though visually modern. |
| [frontend/src/app/create-deed/[docType]/page.tsx](frontend/src/app/create-deed/[docType]/page.tsx) | (c) | Mounts `<WizardHost docType={…}>` from `features/wizard/mode/WizardHost` inside `PartnersProvider` |
| [frontend/src/app/create-deed/page-legacy.tsx](frontend/src/app/create-deed/page-legacy.tsx) | (c) | Leftover of the original 5-step custom wizard. Not routed by Next (filename has `-legacy`). Uses `WizardFlowManager` + `DeedPreviewPanel` + `PropertySearch`. |
| [frontend/src/app/create-deed/dynamic-wizard.tsx](frontend/src/app/create-deed/dynamic-wizard.tsx) | (c) | Standalone multi-step component used by the legacy page; not a route. |
| [frontend/src/app/dynamic-wizard.tsx](frontend/src/app/dynamic-wizard.tsx) | (c) | Earlier duplicate; imports `../store` (not present) and `PropertySearchWithTitlePoint`. **Flag:** appears orphaned; likely an older version of the same component — worth confirming before deletion. |

Other routes (dashboard, past-deeds, deeds/[id]/preview, admin, etc.) are not deed-creation UIs and are out of scope.

### Components

#### (a) DeedBuilder

- [frontend/src/features/builder/DeedBuilder.tsx](frontend/src/features/builder/DeedBuilder.tsx) — orchestrator, composes `InputPanel` + `PreviewPanel`, wrapped in `AIAssistProvider`.
- [frontend/src/components/builder/BuilderHeader.tsx](frontend/src/components/builder/BuilderHeader.tsx)
- [frontend/src/components/builder/InputPanel.tsx](frontend/src/components/builder/InputPanel.tsx)
- [frontend/src/components/builder/PreviewPanel.tsx](frontend/src/components/builder/PreviewPanel.tsx)
- [frontend/src/components/builder/InputSection.tsx](frontend/src/components/builder/InputSection.tsx)
- [frontend/src/components/builder/ValidationPanel.tsx](frontend/src/components/builder/ValidationPanel.tsx)
- [frontend/src/components/builder/AISuggestion.tsx](frontend/src/components/builder/AISuggestion.tsx)
- [frontend/src/components/builder/AIToggle.tsx](frontend/src/components/builder/AIToggle.tsx)
- [frontend/src/components/builder/index.ts](frontend/src/components/builder/index.ts)
- [frontend/src/components/builder/sections/GrantorSection.tsx](frontend/src/components/builder/sections/GrantorSection.tsx)
- [frontend/src/components/builder/sections/GranteeSection.tsx](frontend/src/components/builder/sections/GranteeSection.tsx)
- [frontend/src/components/builder/sections/PropertySection.tsx](frontend/src/components/builder/sections/PropertySection.tsx)
- [frontend/src/components/builder/sections/RecordingSection.tsx](frontend/src/components/builder/sections/RecordingSection.tsx)
- [frontend/src/components/builder/sections/TransferTaxSection.tsx](frontend/src/components/builder/sections/TransferTaxSection.tsx)
- [frontend/src/components/builder/sections/VestingSection.tsx](frontend/src/components/builder/sections/VestingSection.tsx)
- [frontend/src/components/builder/sections/index.ts](frontend/src/components/builder/sections/index.ts)

#### (b) Modern 3-step wizard

- [frontend/src/features/wizard/WizardHost2.tsx](frontend/src/features/wizard/WizardHost2.tsx) — 3-step orchestrator.
- [frontend/src/features/wizard/components/DeedTypePropertyStep.tsx](frontend/src/features/wizard/components/DeedTypePropertyStep.tsx)
- [frontend/src/features/wizard/components/SmartConfirmScreen.tsx](frontend/src/features/wizard/components/SmartConfirmScreen.tsx)
- [frontend/src/features/wizard/components/SuccessScreen.tsx](frontend/src/features/wizard/components/SuccessScreen.tsx)
- [frontend/src/features/wizard/components/PreviewTitle.tsx](frontend/src/features/wizard/components/PreviewTitle.tsx)
- [frontend/src/features/wizard/components/index.ts](frontend/src/features/wizard/components/index.ts)
- [frontend/src/features/wizard/finalize/FinalizePanel.tsx](frontend/src/features/wizard/finalize/FinalizePanel.tsx) — **Flag:** orphaned, no importers found; was likely built for the (b) host but never wired in.
- [frontend/src/features/wizard/finalize/useFinalizeDeed.ts](frontend/src/features/wizard/finalize/useFinalizeDeed.ts) — only imported by `FinalizePanel.tsx` above.

#### (c) Classic / "Modern" 5-step wizard (the `features/wizard/mode/**` tree)

Host / shell:
- [frontend/src/features/wizard/mode/WizardHost.tsx](frontend/src/features/wizard/mode/WizardHost.tsx)
- [frontend/src/features/wizard/mode/WizardModeBoundary.tsx](frontend/src/features/wizard/mode/WizardModeBoundary.tsx)
- [frontend/src/features/wizard/mode/HydrationGate.tsx](frontend/src/features/wizard/mode/HydrationGate.tsx)
- [frontend/src/features/wizard/mode/ModeContext.tsx](frontend/src/features/wizard/mode/ModeContext.tsx)
- [frontend/src/features/wizard/mode/layout/WizardFrame.tsx](frontend/src/features/wizard/mode/layout/WizardFrame.tsx)
- [frontend/src/features/wizard/mode/layout/wizard-frame.css](frontend/src/features/wizard/mode/layout/wizard-frame.css)
- [frontend/src/features/wizard/mode/layout/ask-layout.css](frontend/src/features/wizard/mode/layout/ask-layout.css)
- [frontend/src/features/wizard/mode/hoc/ModeCookieSync.tsx](frontend/src/features/wizard/mode/hoc/ModeCookieSync.tsx)

Engine + step UI:
- [frontend/src/features/wizard/mode/engines/ModernEngine.tsx](frontend/src/features/wizard/mode/engines/ModernEngine.tsx)
- [frontend/src/features/wizard/mode/engines/ModernEngine.tsx.phase24d-backup](frontend/src/features/wizard/mode/engines/ModernEngine.tsx.phase24d-backup) — **Flag:** `.backup`, not compiled but present.
- [frontend/src/features/wizard/mode/engines/steps/StepShell.tsx](frontend/src/features/wizard/mode/engines/steps/StepShell.tsx)
- [frontend/src/features/wizard/mode/engines/steps/MicroSummary.tsx](frontend/src/features/wizard/mode/engines/steps/MicroSummary.tsx)

Bridge / persistence:
- [frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx](frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx)
- [frontend/src/features/wizard/mode/bridge/useWizardStoreBridge.ts](frontend/src/features/wizard/mode/bridge/useWizardStoreBridge.ts)
- [frontend/src/features/wizard/mode/bridge/finalizeDeed.ts](frontend/src/features/wizard/mode/bridge/finalizeDeed.ts)
- [frontend/src/features/wizard/mode/bridge/debugLogs.ts](frontend/src/features/wizard/mode/bridge/debugLogs.ts)
- [frontend/src/features/wizard/mode/bridge/persistenceKeys.ts](frontend/src/features/wizard/mode/bridge/persistenceKeys.ts) — **Flag:** leaks outside (c); imported by the `/create-deed` picker and by `features/wizard/state.ts`.

Inline step components (mostly duplicated under `components/` vs `engines/steps/`):
- [frontend/src/features/wizard/mode/components/ProgressBar.tsx](frontend/src/features/wizard/mode/components/ProgressBar.tsx) (+ `ProgressBar.tsx.backup`)
- [frontend/src/features/wizard/mode/components/MicroSummary.tsx](frontend/src/features/wizard/mode/components/MicroSummary.tsx) (+ `MicroSummary.tsx.backup`)
- [frontend/src/features/wizard/mode/components/StepShell.tsx](frontend/src/features/wizard/mode/components/StepShell.tsx)
- [frontend/src/features/wizard/mode/components/PropertyStepBridge.tsx](frontend/src/features/wizard/mode/components/PropertyStepBridge.tsx) — **Flag:** duplicate of the one under `mode/bridge/`.
- [frontend/src/features/wizard/mode/components/PrefillCombo.tsx](frontend/src/features/wizard/mode/components/PrefillCombo.tsx)
- [frontend/src/features/wizard/mode/components/ConsolidatedPartiesSection.tsx](frontend/src/features/wizard/mode/components/ConsolidatedPartiesSection.tsx)
- [frontend/src/features/wizard/mode/components/DeedTypeBadge.tsx](frontend/src/features/wizard/mode/components/DeedTypeBadge.tsx)
- [frontend/src/features/wizard/mode/components/DocumentTransferTaxCalculator.tsx](frontend/src/features/wizard/mode/components/DocumentTransferTaxCalculator.tsx)
- [frontend/src/features/wizard/mode/components/controls/SmartSelectInput.tsx](frontend/src/features/wizard/mode/components/controls/SmartSelectInput.tsx)

Review / prompts / validation / utils:
- [frontend/src/features/wizard/mode/prompts/promptFlows.ts](frontend/src/features/wizard/mode/prompts/promptFlows.ts)
- [frontend/src/features/wizard/mode/review/SmartReview.tsx](frontend/src/features/wizard/mode/review/SmartReview.tsx) (+ `SmartReview.tsx.backup`)
- [frontend/src/features/wizard/mode/review/smartReviewTemplates.ts](frontend/src/features/wizard/mode/review/smartReviewTemplates.ts)
- [frontend/src/features/wizard/mode/finalize/finalizeBridge.ts](frontend/src/features/wizard/mode/finalize/finalizeBridge.ts)
- [frontend/src/features/wizard/mode/validation/usePromptValidation.ts](frontend/src/features/wizard/mode/validation/usePromptValidation.ts)
- [frontend/src/features/wizard/mode/validation/validators.ts](frontend/src/features/wizard/mode/validation/validators.ts)
- [frontend/src/features/wizard/mode/utils/docType.ts](frontend/src/features/wizard/mode/utils/docType.ts) — also used by the `/create-deed/[docType]/page.tsx` route.
- [frontend/src/features/wizard/mode/utils/withMode.ts](frontend/src/features/wizard/mode/utils/withMode.ts)

Earlier legacy classic 5-step wizard (pre-Phase-24, pre-`mode/`):
- [frontend/src/components/WizardFlowManager.tsx](frontend/src/components/WizardFlowManager.tsx) — used only by `create-deed/page-legacy.tsx`.
- [frontend/src/app/create-deed/page-legacy.tsx](frontend/src/app/create-deed/page-legacy.tsx)
- [frontend/src/app/create-deed/dynamic-wizard.tsx](frontend/src/app/create-deed/dynamic-wizard.tsx) — only referenced by `__tests__/dynamic-wizard.test.tsx`.
- [frontend/src/app/create-deed/__tests__/dynamic-wizard.test.tsx](frontend/src/app/create-deed/__tests__/dynamic-wizard.test.tsx)
- [frontend/src/app/dynamic-wizard.tsx](frontend/src/app/dynamic-wizard.tsx) — imports `../store` which does not exist; **Flag:** dead.
- [frontend/src/styles/wizardModern.css](frontend/src/styles/wizardModern.css) and [frontend/src/styles/modern-wizard.css](frontend/src/styles/modern-wizard.css) — both globally imported in [frontend/src/app/layout.tsx:7-8](frontend/src/app/layout.tsx). Target (c).

### Hooks, services, and helpers

Shared between (b) and (c) — **flag as ambiguous; check before deleting**:
- [frontend/src/features/wizard/adapters/grantDeedAdapter.ts](frontend/src/features/wizard/adapters/grantDeedAdapter.ts)
- [frontend/src/features/wizard/adapters/interspousalAdapter.ts](frontend/src/features/wizard/adapters/interspousalAdapter.ts)
- [frontend/src/features/wizard/adapters/quitclaimAdapter.ts](frontend/src/features/wizard/adapters/quitclaimAdapter.ts)
- [frontend/src/features/wizard/adapters/warrantyAdapter.ts](frontend/src/features/wizard/adapters/warrantyAdapter.ts)
- [frontend/src/features/wizard/adapters/taxDeedAdapter.ts](frontend/src/features/wizard/adapters/taxDeedAdapter.ts)
- [frontend/src/features/wizard/adapters/index.ts](frontend/src/features/wizard/adapters/index.ts)
- [frontend/src/features/wizard/validation/adapters.ts](frontend/src/features/wizard/validation/adapters.ts)
- [frontend/src/features/wizard/validation/grantDeed.ts](frontend/src/features/wizard/validation/grantDeed.ts)
- [frontend/src/features/wizard/validation/zodSchemas.ts](frontend/src/features/wizard/validation/zodSchemas.ts)
- [frontend/src/features/wizard/validation/useValidation.ts](frontend/src/features/wizard/validation/useValidation.ts)
- [frontend/src/features/wizard/validation/index.ts](frontend/src/features/wizard/validation/index.ts)
- [frontend/src/features/wizard/services/deeds.ts](frontend/src/features/wizard/services/deeds.ts) — **Flag:** no importers; likely (b)-era and dead.
- [frontend/src/features/wizard/services/propertyPrefill.ts](frontend/src/features/wizard/services/propertyPrefill.ts) — used by `PropertySearchWithTitlePoint` (non-wizard component), so (a) indirectly depends on it.
- [frontend/src/features/wizard/services/recentProperties.ts](frontend/src/features/wizard/services/recentProperties.ts) — used by `RecentPropertiesDropdown`.
- [frontend/src/features/wizard/state.ts](frontend/src/features/wizard/state.ts) — **Flag:** imports the (c) persistence key; no other importers.
- [frontend/src/features/wizard/types.ts](frontend/src/features/wizard/types.ts) — **Flag:** no importers found.
- [frontend/src/features/wizard/flows.ts](frontend/src/features/wizard/flows.ts) — **Flag:** superseded by `mode/prompts/promptFlows.ts`; no importers.
- [frontend/src/features/wizard/lib/featureFlags.ts](frontend/src/features/wizard/lib/featureFlags.ts) — **Flag:** no importers.
- [frontend/src/features/wizard/context/buildContext.ts](frontend/src/features/wizard/context/buildContext.ts) — **Flag:** no importers.
- [frontend/src/features/wizard/context/docEndpoints.ts](frontend/src/features/wizard/context/docEndpoints.ts) — **Flag:** no importers.
- [frontend/src/lib/wizard/invariants.ts](frontend/src/lib/wizard/invariants.ts) — used by (c)'s `ModernEngine`.
- [frontend/src/lib/wizard/legalShowIf.ts](frontend/src/lib/wizard/legalShowIf.ts) — used by (c)'s `promptFlows`.

Hook for (a):
- `useBuilderMode` (referenced by `DeedBuilder.tsx` from `@/hooks/useBuilderMode`) — (a)-only.

Shared property-search components used by all three (not deed-creation-UI-specific but worth noting):
- [frontend/src/components/PropertySearchWithTitlePoint.tsx](frontend/src/components/PropertySearchWithTitlePoint.tsx)
- [frontend/src/components/PropertySearch.tsx](frontend/src/components/PropertySearch.tsx)
- [frontend/src/components/PropertySearchComponent.tsx](frontend/src/components/PropertySearchComponent.tsx)
- [frontend/src/components/RecentPropertiesDropdown.tsx](frontend/src/components/RecentPropertiesDropdown.tsx)

---

## Section 2 — Cross-references for (b) and (c)

Only importers inside `frontend/src/**` are listed. An "(none)" entry means no importer was found — candidate for isolated deletion, but confirm dynamic/lazy imports and the `.backup` files separately.

### (b) — Modern 3-step wizard

```
frontend/src/features/wizard/WizardHost2.tsx
  - frontend/src/app/create-deed-v2/page.tsx

frontend/src/features/wizard/components/DeedTypePropertyStep.tsx
  - frontend/src/features/wizard/WizardHost2.tsx
  - frontend/src/features/wizard/components/index.ts (barrel)

frontend/src/features/wizard/components/SmartConfirmScreen.tsx
  - frontend/src/features/wizard/WizardHost2.tsx
  - frontend/src/features/wizard/components/index.ts (barrel)

frontend/src/features/wizard/components/SuccessScreen.tsx
  - frontend/src/features/wizard/WizardHost2.tsx
  - frontend/src/features/wizard/components/index.ts (barrel)

frontend/src/features/wizard/components/PreviewTitle.tsx
  - (none)

frontend/src/features/wizard/components/index.ts
  - (none)

frontend/src/features/wizard/finalize/FinalizePanel.tsx
  - (none)

frontend/src/features/wizard/finalize/useFinalizeDeed.ts
  - frontend/src/features/wizard/finalize/FinalizePanel.tsx
```

### (c) — `features/wizard/mode/**` multi-step wizard

```
frontend/src/features/wizard/mode/WizardHost.tsx
  - frontend/src/app/create-deed/[docType]/page.tsx

frontend/src/features/wizard/mode/ModeContext.tsx
  - frontend/src/features/wizard/mode/WizardHost.tsx
  - frontend/src/features/wizard/mode/bridge/useWizardStoreBridge.ts
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx
  - frontend/src/features/wizard/mode/layout/WizardFrame.tsx
  - frontend/src/features/wizard/mode/hoc/ModeCookieSync.tsx

frontend/src/features/wizard/mode/WizardModeBoundary.tsx
  - frontend/src/features/wizard/mode/WizardHost.tsx

frontend/src/features/wizard/mode/HydrationGate.tsx
  - frontend/src/features/wizard/mode/WizardHost.tsx

frontend/src/features/wizard/mode/layout/WizardFrame.tsx
  - frontend/src/features/wizard/mode/WizardHost.tsx

frontend/src/features/wizard/mode/layout/wizard-frame.css
  - frontend/src/features/wizard/mode/layout/WizardFrame.tsx (co-located CSS)

frontend/src/features/wizard/mode/layout/ask-layout.css
  - (none found — confirm via Next.js CSS module conventions)

frontend/src/features/wizard/mode/hoc/ModeCookieSync.tsx
  - frontend/src/features/wizard/mode/layout/WizardFrame.tsx

frontend/src/features/wizard/mode/engines/ModernEngine.tsx
  - frontend/src/features/wizard/mode/WizardHost.tsx

frontend/src/features/wizard/mode/engines/ModernEngine.tsx.phase24d-backup
  - (none — not a real module, backup file)

frontend/src/features/wizard/mode/engines/steps/StepShell.tsx
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/engines/steps/MicroSummary.tsx
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx
  - frontend/src/features/wizard/mode/WizardHost.tsx

frontend/src/features/wizard/mode/bridge/useWizardStoreBridge.ts
  - frontend/src/features/wizard/mode/bridge/PropertyStepBridge.tsx
  - frontend/src/features/wizard/mode/components/PropertyStepBridge.tsx
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/bridge/finalizeDeed.ts
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/bridge/debugLogs.ts
  - (none)

frontend/src/features/wizard/mode/bridge/persistenceKeys.ts
  - frontend/src/features/wizard/state.ts
  - frontend/src/app/create-deed/page.tsx
  - frontend/src/app/create-deed/[docType]/page.tsx
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/components/ProgressBar.tsx
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/components/ProgressBar.tsx.backup
  - (none — backup file)

frontend/src/features/wizard/mode/components/MicroSummary.tsx
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/components/MicroSummary.tsx.backup
  - (none — backup file)

frontend/src/features/wizard/mode/components/StepShell.tsx
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/components/PropertyStepBridge.tsx
  - (none — duplicate of mode/bridge/PropertyStepBridge.tsx)

frontend/src/features/wizard/mode/components/PrefillCombo.tsx
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/components/ConsolidatedPartiesSection.tsx
  - frontend/src/features/wizard/mode/prompts/promptFlows.ts

frontend/src/features/wizard/mode/components/DeedTypeBadge.tsx
  - frontend/src/features/wizard/mode/layout/WizardFrame.tsx

frontend/src/features/wizard/mode/components/DocumentTransferTaxCalculator.tsx
  - frontend/src/features/wizard/mode/prompts/promptFlows.ts

frontend/src/features/wizard/mode/components/controls/SmartSelectInput.tsx
  - (none)

frontend/src/features/wizard/mode/prompts/promptFlows.ts
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/review/SmartReview.tsx
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/features/wizard/mode/review/SmartReview.tsx.backup
  - (none — backup file)

frontend/src/features/wizard/mode/review/smartReviewTemplates.ts
  - (none)

frontend/src/features/wizard/mode/finalize/finalizeBridge.ts
  - (none)

frontend/src/features/wizard/mode/validation/usePromptValidation.ts
  - (none)

frontend/src/features/wizard/mode/validation/validators.ts
  - (none)

frontend/src/features/wizard/mode/utils/docType.ts
  - frontend/src/app/create-deed/[docType]/page.tsx

frontend/src/features/wizard/mode/utils/withMode.ts
  - (none)

frontend/src/lib/wizard/invariants.ts
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx

frontend/src/lib/wizard/legalShowIf.ts
  - frontend/src/features/wizard/mode/prompts/promptFlows.ts

frontend/src/styles/wizardModern.css
  - frontend/src/app/layout.tsx

frontend/src/styles/modern-wizard.css
  - frontend/src/app/layout.tsx

frontend/src/components/WizardFlowManager.tsx
  - frontend/src/app/create-deed/page-legacy.tsx

frontend/src/app/create-deed/page.tsx   (deed-type picker; ties to (c))
  - (Next.js route; no code importers)

frontend/src/app/create-deed/[docType]/page.tsx
  - (Next.js route)

frontend/src/app/create-deed/dynamic-wizard.tsx
  - frontend/src/app/create-deed/__tests__/dynamic-wizard.test.tsx

frontend/src/app/dynamic-wizard.tsx
  - (none — references a non-existent `../store`; dead)

frontend/src/app/create-deed/page-legacy.tsx
  - (none — `-legacy` suffix means Next.js doesn't route it)
```

### Shared between (b) and (c) — check both before deleting

```
frontend/src/features/wizard/adapters/index.ts
  - frontend/src/features/wizard/mode/engines/ModernEngine.tsx  [path: (c)]

frontend/src/features/wizard/adapters/grantDeedAdapter.ts
  - frontend/src/features/wizard/adapters/index.ts

frontend/src/features/wizard/adapters/interspousalAdapter.ts
  - frontend/src/features/wizard/adapters/index.ts

frontend/src/features/wizard/adapters/quitclaimAdapter.ts
  - frontend/src/features/wizard/adapters/index.ts

frontend/src/features/wizard/adapters/warrantyAdapter.ts
  - frontend/src/features/wizard/adapters/index.ts

frontend/src/features/wizard/adapters/taxDeedAdapter.ts
  - frontend/src/features/wizard/adapters/index.ts

frontend/src/features/wizard/validation/adapters.ts
  - frontend/src/features/wizard/validation/useValidation.ts

frontend/src/features/wizard/validation/grantDeed.ts
  - frontend/src/features/wizard/validation/zodSchemas.ts

frontend/src/features/wizard/validation/zodSchemas.ts
  - frontend/src/features/wizard/validation/useValidation.ts

frontend/src/features/wizard/validation/useValidation.ts
  - (none — hook is orphaned; safe only if no deed-creation UI calls it)

frontend/src/features/wizard/validation/index.ts
  - (none — barrel)

frontend/src/features/wizard/services/deeds.ts
  - (none)

frontend/src/features/wizard/services/propertyPrefill.ts
  - frontend/src/components/PropertySearchWithTitlePoint.tsx

frontend/src/features/wizard/services/recentProperties.ts
  - frontend/src/components/RecentPropertiesDropdown.tsx
  - frontend/src/features/wizard/services/propertyPrefill.ts

frontend/src/features/wizard/state.ts
  - (none; imports the (c) persistence keys)

frontend/src/features/wizard/types.ts
  - (none)

frontend/src/features/wizard/flows.ts
  - (none; superseded by mode/prompts/promptFlows.ts)

frontend/src/features/wizard/lib/featureFlags.ts
  - (none)

frontend/src/features/wizard/context/buildContext.ts
  - (none)

frontend/src/features/wizard/context/docEndpoints.ts
  - (none)
```

Caveats for Section 2:
- Results are static-import-grep. Dynamic imports (`await import(...)`), `next/dynamic`, or string-templated paths are not covered.
- Backup files (`.backup`, `.phase24d-backup`) aren't compiled but still exist on disk.
- `persistenceKeys.ts` is the one piece of (c) that leaks into otherwise-neutral routing code ([create-deed/page.tsx](frontend/src/app/create-deed/page.tsx)); if (c) is removed, move or inline those two constants.
- `RecentPropertiesDropdown.tsx` and `PropertySearchWithTitlePoint.tsx` pull from `features/wizard/services/*`; those services need to survive even after the wizards die, or be relocated out of `features/wizard/`.

---

## Section 3 — Docs inventory

115 `.md` files found. Abbreviations: **(i)** active DeedBuilder spec · **(ii)** spec for wizards being killed · **(iii)** system-level (admin/partners/sharing/billing/API/notary/etc.) · **(iv)** historical/archive · **(v)** can't tell.

### Repo root

| Path | Summary | Class |
|---|---|---|
| [README.md](README.md) | Project overview + quick-start for DeedPro platform | (iii) |
| [START_HERE.md](START_HERE.md) | 30-minute onboarding for new contributors | (iii) |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Current phase status; mostly completion notes | (iv) |
| [CODEBASE_REFERENCE.md](CODEBASE_REFERENCE.md) | Single source of truth for repo structure | (iii) |
| [BREAKTHROUGHS.md](BREAKTHROUGHS.md) | Lessons learned from phases 16-20 | (iv) |
| [CURSOR_CODEBASE_DISCOVERY.md](CURSOR_CODEBASE_DISCOVERY.md) | Pre-implementation discovery checklist | (iii) |
| [CURSOR_DEEDPRO_DOCUMENT_BUILDER.md](CURSOR_DEEDPRO_DOCUMENT_BUILDER.md) | Two-panel document builder implementation guide | (i) |
| [DEEDPRO_API_SPECIFICATION.md](DEEDPRO_API_SPECIFICATION.md) | Public partner-facing deed API spec | (iii) |
| [DEEDPRO_REALITY_CHECK.md](DEEDPRO_REALITY_CHECK.md) | Mixed bug/UX notes; AI-philosophy framing | (v) |
| [ADMIN_FEATURES_AUDIT.md](ADMIN_FEATURES_AUDIT.md) | Admin panel audit | (iii) |
| [ADMIN_OVERHAUL_PLAN.md](ADMIN_OVERHAUL_PLAN.md) | Admin panel redesign plan (6 tabs) | (iii) |
| [NOTARY_INTEGRATION_GUIDE.md](NOTARY_INTEGRATION_GUIDE.md) | Adding notary ack page to deed templates | (iii) |
| [QR_VERIFICATION_SYSTEM.md](QR_VERIFICATION_SYSTEM.md) | Deed authenticity via QR + short doc IDs | (iii) |
| [DeedPro_Project_Plan.md](DeedPro_Project_Plan.md) | Executive 5-phase project vision | (iv) |
| [CURSOR_WIZARD_IMPLEMENTATION.md](CURSOR_WIZARD_IMPLEMENTATION.md) | 5→3-step wizard with SmartConfirm flow | (ii) |
| [PHASE_24E_COMPLETE_SUMMARY.md](PHASE_24E_COMPLETE_SUMMARY.md) | Phase 24-E V0 dashboard integration recap | (iv) |
| [PHASE_24F_COMPLETE_SUMMARY.md](PHASE_24F_COMPLETE_SUMMARY.md) | Phase 24-F wizard UI refinements | (iv) |
| [PHASE_24G_COMPLETE_SUMMARY.md](PHASE_24G_COMPLETE_SUMMARY.md) | Phase 24-G PDF template redesign | (iv) |
| [GOOGLE_MAPS_SETUP.md](GOOGLE_MAPS_SETUP.md) | Google Places autocomplete setup | (iii) |
| [TOOLKIT_EXTRACTION.md](TOOLKIT_EXTRACTION.md) | Reusable patterns / toolkit catalog | (iii) |
| [CURSOR_PARTNERS_CLEANUP.md](CURSOR_PARTNERS_CLEANUP.md) | Industry partners cleanup plan | (iii) |
| [CURSOR_SHARING_ENHANCEMENT.md](CURSOR_SHARING_ENHANCEMENT.md) | Deed sharing + approval workflow | (iii) |
| [PROPERTY_SECTION_FLOW.md](PROPERTY_SECTION_FLOW.md) | PropertySection state diagram | (i) |
| [SITEX_DATA_MAPPING.md](SITEX_DATA_MAPPING.md) | SiteX retrieval + field mapping | (iii) |
| [TRANSFER_TAX_AI_INTEGRATION.md](TRANSFER_TAX_AI_INTEGRATION.md) | TransferTaxSectionAI auto-detect | (i) |
| [CURSOR_TEMPLATE_MIGRATION.md](CURSOR_TEMPLATE_MIGRATION.md) | Migration to new deed templates | (iii) |
| [CURSOR_UI_POLISH.md](CURSOR_UI_POLISH.md) | Design system / brand unification | (v) |
| [CURSOR_V0_INTEGRATION_GUIDE.md](CURSOR_V0_INTEGRATION_GUIDE.md) | V0 doc-builder integration guide | (i) |
| [CURSOR_WIZARD_AI_INTEGRATION.md](CURSOR_WIZARD_AI_INTEGRATION.md) | Wizard + AI property/field guidance | (ii) |
| [PDFSHIFT_MIGRATION_PLAN.md](PDFSHIFT_MIGRATION_PLAN.md) | WeasyPrint → PDFShift migration | (iii) |

### backend/

| Path | Summary | Class |
|---|---|---|
| [backend/EXTERNAL_API_README.md](backend/EXTERNAL_API_README.md) | Enterprise API for SoftPro 360 / Qualia | (iii) |
| [backend/GRANT_DEED_STRUCTURE.md](backend/GRANT_DEED_STRUCTURE.md) | Grant deed PDF section targeting | (iii) |
| [backend/PRODUCTION_ISSUES_REPORT.md](backend/PRODUCTION_ISSUES_REPORT.md) | Prod DB + Stripe issues | (iii) |
| [backend/README_DEPLOY.md](backend/README_DEPLOY.md) | Render redeploy trigger stub | (v) |
| [backend/TITLEPOINT_INTEGRATION_GUIDE.md](backend/TITLEPOINT_INTEGRATION_GUIDE.md) | TitlePoint SOAP integration | (iii) |
| [backend/migrations/DEPLOY_001.md](backend/migrations/DEPLOY_001.md) | Phase 11 DB migration notes | (iv) |

### docs/

| Path | Summary | Class |
|---|---|---|
| [docs/DOCS_INDEX.md](docs/DOCS_INDEX.md) | Docs index / reading order | (iii) |
| [docs/README.md](docs/README.md) | 2025 reset docs hub | (iii) |
| [docs/ONBOARDING_NEW_AGENTS.md](docs/ONBOARDING_NEW_AGENTS.md) | Agent onboarding (30 min) | (iii) |
| [docs/V0_INTEGRATION_LESSONS_LEARNED.md](docs/V0_INTEGRATION_LESSONS_LEARNED.md) | CSS cascade + route-group lessons | (iv) |
| [docs/backend/ROUTES.md](docs/backend/ROUTES.md) | FastAPI routes reference | (iii) |
| [docs/backend/PDF_GENERATION_SYSTEM.md](docs/backend/PDF_GENERATION_SYSTEM.md) | Jinja2/WeasyPrint PDF pipeline | (iii) |
| [docs/resilience/DEGRADED_SERVICES_PLAYBOOK.md](docs/resilience/DEGRADED_SERVICES_PLAYBOOK.md) | Degradation playbooks (Places, TitlePoint, AI, PDF) | (iii) |
| [docs/titlepoint-failproof-guide.md](docs/titlepoint-failproof-guide.md) | Fail-proof TitlePoint integration | (iii) |
| [docs/wizard/ARCHITECTURE.md](docs/wizard/ARCHITECTURE.md) | Wizard architecture (modern + classic) | (ii) |
| [docs/wizard/ADDING_NEW_DEED_TYPES.md](docs/wizard/ADDING_NEW_DEED_TYPES.md) | Checklist for adding deed types | (iii) |
| [docs/wizard/AI_USAGE_SPECIFICATION.md](docs/wizard/AI_USAGE_SPECIFICATION.md) | AI spec for wizard Step 2 | (ii) |
| [docs/wizard/SITEX_FIELD_MAPPING.md](docs/wizard/SITEX_FIELD_MAPPING.md) | SiteX → deed field mapping | (iii) |
| [docs/wizard/Step-1-Proposal/ARCHITECTURAL_ANALYSIS.md](docs/wizard/Step-1-Proposal/ARCHITECTURAL_ANALYSIS.md) | SiteX migration architectural analysis | (iv) |

### docs/archive/phase24/ (all historical)

All classified **(iv)** historical/archive:

- [docs/archive/phase24/PHASE_24A_COMPLETE_SUMMARY.md](docs/archive/phase24/PHASE_24A_COMPLETE_SUMMARY.md) — V0 landing completion
- [docs/archive/phase24/PHASE_24A_CSS_ISOLATION_FORENSIC_REPORT.md](docs/archive/phase24/PHASE_24A_CSS_ISOLATION_FORENSIC_REPORT.md) — CSS isolation forensics
- [docs/archive/phase24/PHASE_24A_SUMMARY.md](docs/archive/phase24/PHASE_24A_SUMMARY.md) — Phase 24-A summary variant
- [docs/archive/phase24/PHASE_24B_ANALYSIS_BRUTAL_DEEP_DIVE.md](docs/archive/phase24/PHASE_24B_ANALYSIS_BRUTAL_DEEP_DIVE.md)
- [docs/archive/phase24/PHASE_24B_BRUTAL_ANALYSIS.md](docs/archive/phase24/PHASE_24B_BRUTAL_ANALYSIS.md)
- [docs/archive/phase24/PHASE_24B_UPDATED_SYSTEMS_ARCHITECT_REVIEW.md](docs/archive/phase24/PHASE_24B_UPDATED_SYSTEMS_ARCHITECT_REVIEW.md)
- [docs/archive/phase24/PHASE_24C_COMPLETE_SUMMARY.md](docs/archive/phase24/PHASE_24C_COMPLETE_SUMMARY.md) — Modern-wizard-only cutover
- [docs/archive/phase24/PHASE_24C_PLAN_BRUTAL_REVIEW.md](docs/archive/phase24/PHASE_24C_PLAN_BRUTAL_REVIEW.md)
- [docs/archive/phase24/PHASE_24C_PREP_BASELINE.md](docs/archive/phase24/PHASE_24C_PREP_BASELINE.md)
- [docs/archive/phase24/PHASE_24C_RETHINK_BRUTAL_REVIEW.md](docs/archive/phase24/PHASE_24C_RETHINK_BRUTAL_REVIEW.md)
- [docs/archive/phase24/PHASE_24C_STEP7_DELETION_PLAN.md](docs/archive/phase24/PHASE_24C_STEP7_DELETION_PLAN.md)
- [docs/archive/phase24/PHASE_24C_STEP7_STATUS.md](docs/archive/phase24/PHASE_24C_STEP7_STATUS.md)
- [docs/archive/phase24/PHASE_24C_STEP9_DEPLOYMENT_GUIDE.md](docs/archive/phase24/PHASE_24C_STEP9_DEPLOYMENT_GUIDE.md)
- [docs/archive/phase24/PHASE_24C_SUMMARY.md](docs/archive/phase24/PHASE_24C_SUMMARY.md)
- [docs/archive/phase24/PHASE_24C_WIZARD_BRUTAL_ANALYSIS.md](docs/archive/phase24/PHASE_24C_WIZARD_BRUTAL_ANALYSIS.md)
- [docs/archive/phase24/PHASE_24D_FINAL_SUMMARY.md](docs/archive/phase24/PHASE_24D_FINAL_SUMMARY.md) — 5 wizard components w/ V0 UI
- [docs/archive/phase24/PHASE_24D_IMPLEMENTATION_GUIDE.md](docs/archive/phase24/PHASE_24D_IMPLEMENTATION_GUIDE.md)
- [docs/archive/phase24/PHASE_24D_MICROSUMMARY_ANALYSIS.md](docs/archive/phase24/PHASE_24D_MICROSUMMARY_ANALYSIS.md)
- [docs/archive/phase24/PHASE_24D_MICROSUMMARY_INTEGRATION_COMPLETE.md](docs/archive/phase24/PHASE_24D_MICROSUMMARY_INTEGRATION_COMPLETE.md)
- [docs/archive/phase24/PHASE_24D_OPTION_B_COMPLETE.md](docs/archive/phase24/PHASE_24D_OPTION_B_COMPLETE.md)
- [docs/archive/phase24/PHASE_24D_PLAN_REVIEW.md](docs/archive/phase24/PHASE_24D_PLAN_REVIEW.md)
- [docs/archive/phase24/PHASE_24D_PROGRESSBAR_INTEGRATION_COMPLETE.md](docs/archive/phase24/PHASE_24D_PROGRESSBAR_INTEGRATION_COMPLETE.md)
- [docs/archive/phase24/PHASE_24D_PROGRESSBAR_TEST_RESULTS.md](docs/archive/phase24/PHASE_24D_PROGRESSBAR_TEST_RESULTS.md)
- [docs/archive/phase24/PHASE_24D_PROPERTYSEARCH_ANALYSIS.md](docs/archive/phase24/PHASE_24D_PROPERTYSEARCH_ANALYSIS.md)
- [docs/archive/phase24/PHASE_24D_PROPERTYSEARCH_DISCOVERY.md](docs/archive/phase24/PHASE_24D_PROPERTYSEARCH_DISCOVERY.md)
- [docs/archive/phase24/PHASE_24D_PROPERTYSEARCH_INTEGRATION_COMPLETE.md](docs/archive/phase24/PHASE_24D_PROPERTYSEARCH_INTEGRATION_COMPLETE.md)
- [docs/archive/phase24/PHASE_24D_PROPERTYSEARCH_INTEGRATION_PLAN.md](docs/archive/phase24/PHASE_24D_PROPERTYSEARCH_INTEGRATION_PLAN.md)
- [docs/archive/phase24/PHASE_24D_SMARTREVIEW_ANALYSIS.md](docs/archive/phase24/PHASE_24D_SMARTREVIEW_ANALYSIS.md)
- [docs/archive/phase24/PHASE_24D_SMARTREVIEW_INTEGRATION_COMPLETE.md](docs/archive/phase24/PHASE_24D_SMARTREVIEW_INTEGRATION_COMPLETE.md)
- [docs/archive/phase24/PHASE_24D_STEPCARD_ANALYSIS.md](docs/archive/phase24/PHASE_24D_STEPCARD_ANALYSIS.md)
- [docs/archive/phase24/PHASE_24D_SUMMARY.md](docs/archive/phase24/PHASE_24D_SUMMARY.md)
- [docs/archive/phase24/PHASE_24D_V0_PROGRESSBAR_ANALYSIS.md](docs/archive/phase24/PHASE_24D_V0_PROGRESSBAR_ANALYSIS.md)
- [docs/archive/phase24/PHASE_24D_V0_PROMPTS_COMPLETE.md](docs/archive/phase24/PHASE_24D_V0_PROMPTS_COMPLETE.md)
- [docs/archive/phase24/PHASE_24D_V0_REDESIGN_PLAN.md](docs/archive/phase24/PHASE_24D_V0_REDESIGN_PLAN.md)
- [docs/archive/phase24/PHASE_24_COMPLETE_FORENSIC_ANALYSIS.md](docs/archive/phase24/PHASE_24_COMPLETE_FORENSIC_ANALYSIS.md)
- [docs/archive/phase24/PHASE_24_CROSSROADS_ARCHITECT_REVIEW.md](docs/archive/phase24/PHASE_24_CROSSROADS_ARCHITECT_REVIEW.md)
- [docs/archive/phase24/PHASE_24_V0_UI_FACELIFT_PLAN.md](docs/archive/phase24/PHASE_24_V0_UI_FACELIFT_PLAN.md)

### fixtemp/

| Path | Summary | Class |
|---|---|---|
| [fixtemp/CURSOR_TEMPLATE_IMPLEMENTATION.md](fixtemp/CURSOR_TEMPLATE_IMPLEMENTATION.md) | Escrow no. + QR footer templates | (iii) |
| [fixtemp/DEEDPRO_REALITY_CHECK.md](fixtemp/DEEDPRO_REALITY_CHECK.md) | Duplicate reality-check doc | (v) |
| [fixtemp/DEEDPRO_TEMPLATE_PERFECTION.md](fixtemp/DEEDPRO_TEMPLATE_PERFECTION.md) | Template polish / margins | (iii) |

### frontend/, AiTools/, v0-prompts/

| Path | Summary | Class |
|---|---|---|
| [frontend/README.md](frontend/README.md) | Next.js boilerplate README | (v) |
| [AiTools/README.md](AiTools/README.md) | AI integration for DeedBuilder (toggle + suggestions) | (i) |
| [v0-prompts/README.md](v0-prompts/README.md) | V0 prompts + procedures overview | (v) |
| [v0-prompts/V0_UPDATE_PROCEDURE_CHECKLIST.md](v0-prompts/V0_UPDATE_PROCEDURE_CHECKLIST.md) | V0 update checklist | (iv) |
| [v0-prompts/landing-page-master-prompt-v1.md](v0-prompts/landing-page-master-prompt-v1.md) | Master V0 prompt for landing page | (iv) |
| [v0-prompts/phase-24e-dashboard-pages-redesign.md](v0-prompts/phase-24e-dashboard-pages-redesign.md) | V0 prompt: dashboard redesign | (iv) |
| [v0-prompts/phase-24f-wizard-final-refinements.md](v0-prompts/phase-24f-wizard-final-refinements.md) | V0 prompt: wizard final refinements | (iv) |
| [v0-prompts/deed-selection-page-prompt.md](v0-prompts/deed-selection-page-prompt.md) | V0 prompt: deed selection page | (iv) |

### Summary counts

- (i) DeedBuilder active spec: **5**
- (ii) Wizard-being-killed spec: **4**
- (iii) System-level: **52**
- (iv) Historical/archive: **52**
- (v) Can't tell: **2–4** (depends on whether you count duplicates)
- **Total: 115 .md files**
