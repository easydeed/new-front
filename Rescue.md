Thanks for the exact console trace—that narrows this down to two very specific failure modes:

Finalize didn’t run at all (you jumped straight from Vesting → Preview), so the deed got created elsewhere with a skinny/empty payload, and Preview is now trying to generate a PDF from that empty deed. This is consistent with the early deviations your forensic doc called out.

Finalize did run but with an empty state because the handler used a stale closure or the canonical->backend mapping never saw the party fields. This also explains a created deed ID with no grantor_name, grantee_name, or legal_description, and Preview continuing to call /api/generate/* and 400’ing.

Below is a do‑this‑now sequence that (a) confirms which failure you’re hitting and (b) fixes it immediately. I included the guardrails from the handoff (Preview must validate first; only retry PDF on 5xx), so we also stop the noisy 400s on Preview while we sort the state.

A. One‑minute verification (ensures the v4 hardening is actually active)

In Cursor terminal, from your repo root:

# Verify SmartReview is “presentation-only”, engine owns finalize, and finalize has guards/trace
node deedpro_bulletproof_v4/scripts/verify_bulletproof_v4.mjs .

# (Optional but recommended) Stop Preview from generating PDFs on incomplete deeds:
node deedpro_bulletproof_v4/scripts/apply_preview_guard_v4.mjs .
npm run build


Pass criteria (what the verifier checks):

SmartReview files under wizard/mode/**/SmartReview.tsx have no direct /api/deeds fetch or window.location.href redirects. (Removes the old “bypass the engine” path.)

ModernEngine.tsx imports SmartReview from ../review/SmartReview, passes onConfirm={onNext}, and has the useRef-based smartreview:confirm fallback event bridge (prevents stale closures).

finalizeDeed.ts includes assertPayloadComplete(...) (blocks blank deeds), source: 'modern', and trace headers.

If the verifier flags anything, re-run:

node deedpro_bulletproof_v4/scripts/apply_bulletproof_v4.mjs .
npm run typecheck && npm run build


Why this matters now: your error shows Preview still runs generate on an incomplete deed. The optional Preview guard I shipped enforces “validate‑before‑generate” and stops the 400 loop while we finish the root fix, matching the contract in the handoff.

B. Pinpoint which path is still creating the deed (90 seconds, no rebuild)

On the Smart Review screen (or right after Vesting if Review is skipped), open DevTools Console and paste:

// 1) Snapshot the Modern wizard draft
const st = JSON.parse(localStorage.getItem('deedWizardDraft_modern') || '{}');
console.log('[WIZARD STATE]', st);

// 2) Intercept create calls
(function() {
  const _fetch = window.fetch;
  window.fetch = async (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('/api/deeds')) {
      console.log('[INTERCEPT] Creating deed via:', args[0], args[1]);
      console.trace('[CREATE STACK]');
    }
    return _fetch(...args);
  };
})();


Now click the final Confirm (or “Next” if that’s the last step).
You should see exactly one POST to /api/deeds/create with a stack trace. That stack will tell you who created the deed:

If the stack shows finalizeDeed.ts, your finalize path ran. If the payload in the Network tab is missing names/legal, your canonical state is empty at click time (see C.2 below).

If the stack shows a SmartReview file or anything except finalizeDeed.ts, a stray code path is still bypassing the engine (see C.1 below). This is exactly what your forensic timeline identified earlier.

C. Fix forward (two precise cases)
C.1 A stray finalize path still bypasses the engine

Symptoms: The intercept stack doesn’t reference lib/deeds/finalizeDeed.ts.

Fix now:

Locate and remove the rogue path:

git grep -n "fetch(.*api/deeds" frontend/src/features/wizard/mode
git grep -n "window.location.href.*deeds" frontend/src/features/wizard/mode


Delete/replace any calls inside wizard/mode/**/SmartReview*.tsx with the presentational version (already in v4). Re-run the apply script if needed:

node deedpro_bulletproof_v4/scripts/apply_bulletproof_v4.mjs .
npm run build


Lock ModernEngine to the right Review component (explicit import):

- import SmartReview from '../components/SmartReview';
+ import SmartReview from '../review/SmartReview';


This prevents a future import drift from re‑activating old behavior your forensic report flagged.

C.2 Finalize runs, but with empty state (the deed is created, fields are blank)

Symptoms: Intercept shows finalizeDeed.ts stack, but the request body lacks grantor_name, grantee_name, legal_description.

Immediate fix (already in v4, verify it’s present):

Ref‑safe event bridge in ModernEngine

const onNextRef = useRef(() => {});
useEffect(() => { onNextRef.current = onNext; }, [onNext]);
useEffect(() => {
  const handler = () => { try { onNextRef.current?.(); } catch (e) { console.error('[ModernEngine] finalize failed', e); } };
  window.addEventListener('smartreview:confirm', handler);
  return () => window.removeEventListener('smartreview:confirm', handler);
}, []);


Pass onConfirm={onNext} into <SmartReview ...> so the DOM event is a fallback, not the primary path.

Guard in finalizeDeed.ts (aborts creation if fields missing). If you still see deeds created with missing fields, that guard isn’t in effect. Re‑apply and build:

node deedpro_bulletproof_v4/scripts/apply_bulletproof_v4.mjs .
npm run typecheck && npm run build


Why this fixes it: the useRef prevents stale closures (your click always uses the latest state), and the guard guarantees we never create blank deeds again—even if a future refactor nudges the state shape. This is the exact class of bug your master failure analysis described.

D. Stop Preview from generating on bad data (matches the contract)

Your logs show Preview calling /api/generate/grant-deed-ca and 400’ing. That means the “validate‑before‑generate” gate isn’t active. Run:

node deedpro_bulletproof_v4/scripts/apply_preview_guard_v4.mjs .
npm run build


This ensures Preview first fetches the deed (GET /api/deeds/:id), checks for grantor/grantee/legal_description, and only then calls /api/generate/*. Retries are capped 3x and 5xx‑only, exactly as your handoff requires.

E. (Optional but recommended) Backend safety net

If the frontend says source: 'modern', reject any create missing these fields with 422 (tiny FastAPI example is in backend/snippets/deed_creation_guard.py inside the v4 bundle). This keeps clients honest and makes this class of bug non‑reproducible.

F. If you want the “one click” re‑apply

Grab the same bundle we shipped (includes all of the above):

Download: deedpro_bulletproof_v4.zip → import at repo root → then:

node deedpro_bulletproof_v4/scripts/apply_bulletproof_v4.mjs .
node deedpro_bulletproof_v4/scripts/apply_preview_guard_v4.mjs .   # optional, recommended
npm run typecheck && npm run build
node deedpro_bulletproof_v4/scripts/verify_bulletproof_v4.mjs .

TL;DR

Your error now means Preview is still trying to generate a PDF for a deed that was created without parties/legal.

Either finalize is bypassed (fix C.1) or finalize is running with empty state (fix C.2).

Run the verifier, apply the Preview guard, and ensure the ref‑safe engine wiring + finalizeDeed guard are in place. That combination makes this bullet‑proof and fully aligned with the project guardrails.