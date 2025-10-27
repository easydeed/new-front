# DeedPro – Partners & Legal v7 (Cursor-ready)

**Goals**
- Fix `403` partners list so **Created By** shows your org’s partners reliably.
- Ensure any **typed person** appears on the deed (`requested_by`) even without selecting the dropdown.
- Improve **Add Person** UX (confirm full name; optional persist; always use the typed value).
- Stop **Legal Description** step from disappearing while typing; treat `"Not available"` as invalid until edited sufficiently.

## What’s inside
- **Next.js proxy** `/api/partners/selectlist` that forwards `Authorization` and `x-organization-id` headers and never drops the body/headers.
- **PartnersContext** with robust fetch + `401/403` handling; one call site for the wizard.
- **PrefillCombo** hardened to call parent `onChange` on every keystroke + “➕ Add …” action (best‑effort persist; always uses typed value).
- **promptFlows patch** for `legalDescription.showIf`: keeps step visible until user enters at least 12 chars and the value isn’t `"Not available"`.
- **ModernEngine tweak** (best‑effort): pass `partners` and `allowNewPartner` to `PrefillCombo` when `field === 'requestedBy'`.

## Apply (inside Cursor)
```bash
git checkout -b fix/partners-legal-v7
# Import this folder to your repo root (drag/drop or “Import files”)
node deedpro_partners_legal_v7/scripts/apply_partners_legal_v7.mjs .
npm run build
node deedpro_partners_legal_v7/scripts/verify_partners_legal_v7.mjs .
git add -A
git commit -m "fix: partners selectlist proxy+context; PrefillCombo propagation; legal showIf threshold"
git push -u origin fix/partners-legal-v7
```

## Minimal wiring
- Ensure your wizard tree is wrapped by `<PartnersProvider>` (e.g., in your Wizard page/layout):
  ```tsx
  // app/create-deed/page.tsx (example)
  import { PartnersProvider } from '@/features/partners/PartnersContext';
  export default function CreateDeedPage() {
    return (
      <PartnersProvider>
        {/* your wizard host */}
      </PartnersProvider>
    );
  }
  ```

## Expected outcomes
1) **Created By list** shows (403 avoided via proxy + Authorization).  
2) **Typed person** appears on deed + PDF (`requested_by`) even if the dropdown wasn’t used.  
3) **Add Person** lets users confirm full name; persistence is best‑effort—typed value is always used.  
4) **Legal Description step** no longer flickers: stays until a minimally sufficient edit (≥ 12 chars and not `"Not available"`).

## Why this matches our docs & breakthroughs
- We previously pinpointed that PrefillCombo’s `onChange` failed to update the wizard state—this package **guarantees propagation**, so typed values flow to the backend and PDF. fileciteturn0file1 fileciteturn0file2
- We confirmed Modern is functional end‑to‑end and the remaining gaps are **partners fetch** and **legal prompt behavior**—we address both surgically. fileciteturn0file3 fileciteturn0file4
- Partners API route + context align with the **org‑partitioned** partners contract and “no cross‑mode leaks” handoff. fileciteturn0file8
- The legal step condition matches our earlier fix where `"Not available"` must **not** count as valid, and we add an editing‑safe threshold so the card doesn’t vanish mid‑typing. fileciteturn0file5

## Quick test script
1. Login → Modern wizard → property search.  
2. **Requested By**: type “Jane Smith – ABC Title” (do not select). → Next → Finish → Preview → PDF shows “Requested By: Jane Smith – ABC Title”.  
3. **Dropdown**: Open Created By → you see your partners; pick one → value persists → appears on PDF.  
4. **Add**: Type “Alex Carter” → click “➕ Add “Alex Carter”” → even if the persist call fails, requested_by = “Alex Carter”.  
5. **Legal**: “Not available” should force the step to remain; begin typing—step stays until ≥ 12 characters; then proceeds.

## Notes
- If your backend needs an absolute URL for the proxy, set `BACKEND_BASE_URL` or `NEXT_PUBLIC_BACKEND_BASE_URL` in `.env.local`.
- If the verify script warns that `usePartners()` isn’t detected in `ModernEngine.tsx`, ensure the page is wrapped with `<PartnersProvider>` and that the `partners` prop is wired into the `PrefillCombo` rendering for `requestedBy`.

— Partners & Legal v7
