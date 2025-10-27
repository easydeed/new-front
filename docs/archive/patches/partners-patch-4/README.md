# Partners‑Patch‑3 Hotfix v7.3 (Cursor‑ready)

**Why this exists**  
Your Phase‑16 root‑cause shows two concrete issues:
1) `legalDescription` uses a regular `<input>` (type: `'text'`), so the PrefillCombo onFocus/onBlur logic never ran. Result: `__editing_legal` was never set and the step could disappear. This hotfix attaches the same focus/blur handlers to the regular input. fileciteturn0file0
2) `/api/partners/selectlist` 404 in production. Likely a Vercel function/runtime mismatch; we switch the route to **`nodejs`** runtime and mark it dynamic. fileciteturn0file0

It complements the v7.1/v7.2 stability packages without changing Classic or the Canonical V6 data flow.

---

## Apply (in Cursor)

```bash
git checkout -b fix/partners-patch3-hotfix-v7-3

# Import this folder to repo root (drag/drop or “Import files”)
node deedpro_partners_patch3_hotfix_v7_3/scripts/apply_partnerspatch3_hotfix_v7_3.mjs .

# Optional: run a real build as part of verification
BUILD_CHECK=1 node deedpro_partners_patch3_hotfix_v7_3/scripts/verify_partnerspatch3_hotfix_v7_3.mjs .
# or without build:
node deedpro_partners_patch3_hotfix_v7_3/scripts/verify_partnerspatch3_hotfix_v7_3.mjs .

git add -A
git commit -m "fix: v7.3 — legalDescription focus/blur on regular input; partners selectlist nodejs runtime"
git push -u origin fix/partners-patch3-hotfix-v7-3
```

---

## What the scripts do

### ModernEngine.tsx
- Scans for the **regular** `<input className="modern-input" ... onChange={(e) => onChange(current.field, e.target.value)} />` in the else‑branch.
- Injects **only if missing**:
  ```tsx
  onFocus={() => { if (current.field === "legalDescription") setState(s => ({ ...s, __editing_legal: true })); }}
  onBlur={() => { if (current.field === "legalDescription") setTimeout(() => setState(s => ({ ...s, __editing_legal: false })), 200); }}
  ```
- Leaves PrefillCombo code untouched (already fixed previously).  
  *(Root‑cause doc confirms legalDescription is `type: 'text'` and must be handled here.)* fileciteturn0file0

### /api/partners/selectlist/route.ts
- Forces `export const runtime = 'nodejs'` (and adds `export const dynamic = 'force-dynamic'`) to avoid 404s on Edge.
- If the file is missing, a safe minimal route is written.
- Partners headers (`Authorization`, `x-organization-id`) remain forwarded as in earlier patches.

---

## Quick smoke tests (2–3 minutes)

1) **Legal Description**
   - Load Modern wizard; if it pre‑fills “Not available”, start typing.
   - The step **stays visible while typing** and hides only after a sufficiently complete entry.
   - This wiring makes the temporal state solution actually work for the regular input path. fileciteturn0file0

2) **Partners dropdown**
   - Open DevTools → Network.
   - Navigate to “Requested By” step.
   - Check `/api/partners/selectlist` → **200 OK** with JSON (no 404).
   - If it still 404s, confirm Vercel finished deploying and that the route exists in Functions; switching to `nodejs` addresses the known cause. fileciteturn0file0

3) **Typed values → PDF (regression check)**
   - Type “Jane Smith – ABC Title” in Requested By (do not select).
   - Finish flow → Preview → PDF should show “Requested By: …”.  
     This remains covered by the previously deployed PrefillCombo propagation fix. fileciteturn0file3 fileciteturn0file4 fileciteturn0file5

---

## Why this aligns with our docs

- The breakage was exactly what your **Phase‑16 Root Cause Analysis** calls out: our patch only touched PrefillCombo, while `legalDescription` renders as a plain input. This hotfix wires the same editing semantics into that path. fileciteturn0file0
- The partners 404 is consistent with the **production diagnostics**: route present, code correct, but runtime/edge quirk likely causing a missing function. Switching to `nodejs` is the fastest safe fix. fileciteturn0file2

---

## Rollback

The apply script creates `.bak.v7_3` backups next to each modified file. To revert:

```bash
mv frontend/src/features/wizard/mode/engines/ModernEngine.tsx.bak.v7_3        frontend/src/features/wizard/mode/engines/ModernEngine.tsx
mv frontend/src/app/api/partners/selectlist/route.ts.bak.v7_3        frontend/src/app/api/partners/selectlist/route.ts
```

---

## Notes

- This hotfix is intentionally **minimal and surgical** — it does not change Classic, Canonical V6, or other Modern logic.
- If your repo variant stores the route at a different path, adjust the scripts’ paths accordingly and re‑run.
