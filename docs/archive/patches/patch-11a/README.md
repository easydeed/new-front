# Modern Wizard — Foundation v8 (Cursor‑ready)

**What this delivers**
- **Permanent** fix for step‑shrink / navigation breakage: Legal Description is **always visible** (no dynamic filtering).
- **Single finalize path**: normalize SmartReview import and `finalizeDeed` import so all flows go through the **same** canonical function.
- **Partners route works in prod**: forces `nodejs` runtime and dynamic rendering to avoid Edge 404s.
- **Keeps previous wins**: PrefillCombo propagation, regular `<input>` focus/blur for Legal, diagnostics toggle.
- **Invariants**: lightweight runtime guard to surface step count/index issues early during QA.

## Apply (inside Cursor)
```bash
git checkout -b fix/modern-wizard-foundation-v8

# Import this folder to repo root (drag/drop or “Import files”)
node deedpro_modern_wizard_foundation_v8/scripts/apply_modern_wizard_foundation_v8.mjs .

# Optional: run a real build as part of verify
BUILD_CHECK=1 node deedpro_modern_wizard_foundation_v8/scripts/verify_modern_wizard_foundation_v8.mjs .

git add -A
git commit -m "chore: Modern Wizard Foundation v8 — stable steps, unified finalize path, partners nodejs route"
git push -u origin fix/modern-wizard-foundation-v8
```

## Why this is the *foundational* fix
- **Dynamic step filtering breaks navigation.** Making Legal always visible stabilizes the array length and step indices permanently. (We keep the data‑quality rule in Preview.) 
- **One finalize path.** We remove ambiguity by normalizing the SmartReview import and the `finalizeDeed` import so the Engine controls finalization every time.
- **Production‑safe partners route.** We switch the runtime to `nodejs` and mark the route dynamic so Vercel won’t drop it or cache it incorrectly.

## Included files
- `frontend/src/lib/wizard/invariants.ts` — step stability guard (logs only when `NEXT_PUBLIC_DIAG=1`).
- `frontend/src/lib/wizard/legalShowIf.ts` — **always** returns `true`.
- `scripts/apply_modern_wizard_foundation_v8.mjs` — idempotent patcher with backups.
- `scripts/verify_modern_wizard_foundation_v8.mjs` — static checks (+ optional build).
- `files/frontend/src/app/api/partners/selectlist/route.ts` — nodejs runtime fallback if your route is missing.

## 3‑minute smoke
1) **Legal stays visible** – Fill legal with 12+ chars → Next → Back → Legal still present.
2) **Steps order** – Grantor → Grantee → Legal → Requested By → Vesting (5/5 stable).
3) **Finalize path** – Click Confirm → console shows `[finalizeDeed v6]` logs (unified path).
4) **Partners route** – Network: `/api/partners/selectlist` → 200 OK (no 404).

## Notes
- This package does **not** touch Classic. 
- It’s additive and safe to roll back via `.bak.v8` files.
- For maximum visibility while testing, set `NEXT_PUBLIC_DIAG=1` in `.env.local`.

## Next (optional hardening)
- Add Playwright e2e for “type only” vs “dropdown select” vs “back/forward” flows.
- Add Preview‑side assertions for completeness (already in place) and emit friendly remediations.
- Consolidate any duplicate `finalizeDeed` files left in your repo (verify script warns about non‑canonical imports).
