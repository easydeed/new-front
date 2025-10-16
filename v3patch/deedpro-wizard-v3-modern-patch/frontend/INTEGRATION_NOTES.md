
# Frontend Integration Notes

1) Import the modern styles once (e.g., in `_app.tsx` or root layout):
```tsx
import '@/styles/wizard-modern.css';
```

2) If your `WizardHost` decides the engine, ensure it **does not** redirect to classic on modern finalize:
- Remove any hard-coded `window.location.href = '/create-deed/finalize'` in modern paths.
- Modern now calls `finalizeDeed()` which POSTs to your backend and then navigates to `/deeds/:id/preview?mode=modern`.

3) Progress bar
- Use `<ProgressMinimal step={i} total={total} />` in both engines for a consistent look.

4) Deed type badge and toggle
- Place `<DeedTypeBadge docType={docType} />` near the title.
- Place `<WizardModeToggle docType={docType} />` in the wizard chrome.

5) Hydration safety
- Modern storage key: `deedWizardDraft_modern_v2`
- Classic storage key remains unchanged.
- The bridge prevents any localStorage read/write until the client is hydrated.
