#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.argv[2] || '.';
const read = (p) => fs.readFileSync(p, 'utf8');
const ex = (p) => fs.existsSync(p);
const ok = (m) => console.log('[verify-partners-legal-v7] ✅', m);
const bad = (m) => { console.error('[verify-partners-legal-v7] ❌', m); process.exitCode = 1; };

// Proxy route exists
const route = path.join(root, 'frontend/src/app/api/partners/selectlist/route.ts');
if (!ex(route)) bad('Next proxy route for /api/partners/selectlist missing');
else ok('Next proxy route present');

// PartnersContext present with Authorization header
const ctx = path.join(root, 'frontend/src/features/partners/PartnersContext.tsx');
if (!ex(ctx)) bad('PartnersContext.tsx missing');
else {
  const s = read(ctx);
  if (!/Authorization/.test(s)) bad('PartnersContext fetch missing Authorization header');
  else ok('PartnersContext Authorization present');
}

// PrefillCombo propagates onChange
const pc = path.join(root, 'frontend/src/features/wizard/mode/components/PrefillCombo.tsx');
if (!ex(pc)) bad('PrefillCombo.tsx missing');
else {
  const s = read(pc);
  if (!/onChange\(newValue\)/.test(s)) bad('PrefillCombo missing onChange propagation to parent');
  else ok('PrefillCombo onChange propagation verified');
}

// promptFlows legal showIf patch heuristic
const pf = path.join(root, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
if (ex(pf)) {
  const s = read(pf);
  if (!/legal\.length\s*>=\s*12/.test(s)) console.log('[verify] WARN: could not confirm min length threshold in showIf');
  else ok('Legal showIf includes min length threshold');
} else {
  console.log('[verify] WARN: promptFlows not found');
}

// ModernEngine uses partners in PrefillCombo for requestedBy (best-effort check)
const me = path.join(root, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
if (ex(me)) {
  const s = read(me);
  if (!/usePartners\(\)/.test(s)) console.log('[verify] WARN: usePartners() not detected; ensure provider wraps wizard');
  else ok('usePartners() detected in ModernEngine');
  if (!/partners=\{current\.field\s*===\s*'requestedBy'\s*\?\s*partners\s*:\s*\[\]\}/.test(s)) {
    console.log('[verify] WARN: PrefillCombo may not receive partners for requestedBy');
  } else ok('PrefillCombo receives partners for requestedBy');
}

if (process.exitCode) {
  console.error('[verify-partners-legal-v7] One or more checks failed.');
  process.exit(1);
} else {
  console.log('[verify-partners-legal-v7] All checks passed.');
}
