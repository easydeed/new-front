import fs from 'fs';
import path from 'path';
const root = process.argv[2] || '.';
const ex = (p) => fs.existsSync(p);
const read = (p) => fs.readFileSync(p, 'utf8');
const ok = (m) => console.log('[verify-stability-diag-v7.1] ✅', m);
const bad = (m) => { console.error('[verify-stability-diag-v7.1] ❌', m); process.exitCode = 1; };

const legal = path.join(root, 'frontend/src/lib/wizard/legalShowIf.ts');
if (!ex(legal)) bad('legalShowIf.ts missing'); else ok('legalShowIf helper present');

const pf = path.join(root, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
if (ex(pf)) {
  const s = read(pf);
  if (!/shouldShowLegal\(state\)/.test(s)) bad('promptFlows did not reference shouldShowLegal(state)');
  else ok('promptFlows uses shouldShowLegal(state)');
} else {
  console.log('[verify] WARN: promptFlows.ts not found');
}

const pc = path.join(root, 'frontend/src/features/wizard/mode/components/PrefillCombo.tsx');
if (!ex(pc)) bad('PrefillCombo.tsx missing');
else {
  const s = read(pc);
  if (!/onChange\(newValue\)/.test(s)) bad('PrefillCombo missing onChange propagation');
  if (!/onBlur=\{\(\)/.test(s)) console.log('[verify] WARN: PrefillCombo missing onBlur safety (could be fine)');
  else ok('PrefillCombo onChange + onBlur present');
}

const ctx = path.join(root, 'frontend/src/features/partners/PartnersContext.tsx');
if (!ex(ctx)) bad('PartnersContext.tsx missing');
else {
  const s = read(ctx);
  if (!/Authorization/.test(s)) bad('PartnersContext missing Authorization header');
  else ok('PartnersContext includes Authorization header');
}

const route = path.join(root, 'frontend/src/app/api/partners/selectlist/route.ts');
if (!ex(route)) bad('Next.js partners proxy route missing'); else ok('Next.js partners proxy present');

const me = path.join(root, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
if (ex(me)) {
  const s = read(me);
  if (!/usePartners\(\)/.test(s)) console.log('[verify] WARN: ModernEngine does not call usePartners()');
  if (!/__editing_legal/.test(s)) bad('ModernEngine missing __editing_legal editing state wiring');
  else ok('ModernEngine wiring for legal editing present');
} else {
  console.log('[verify] WARN: ModernEngine.tsx not found');
}

if (process.exitCode) {
  console.error('[verify-stability-diag-v7.1] One or more checks failed.');
  process.exit(1);
} else {
  console.log('[verify-stability-diag-v7.1] All checks passed.');
}
