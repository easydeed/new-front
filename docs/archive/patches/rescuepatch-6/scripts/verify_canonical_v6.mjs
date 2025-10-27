#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.argv[2] || '.';
const read = (p) => fs.readFileSync(p, 'utf8');
const ex = (p) => fs.existsSync(p);
const ok = (m) => console.log('[verify-canonical-v6] ✅', m);
const bad = (m) => { console.error('[verify-canonical-v6] ❌', m); process.exitCode = 1; };

// 1) finalizeDeed v6 present and guarded
const fd = path.join(root, 'frontend/src/lib/deeds/finalizeDeed.ts');
if (!ex(fd)) bad('finalizeDeed.ts missing');
else {
  const s = read(fd);
  if (!/finalizeDeed v6/.test(s)) bad('finalizeDeed v6 banner missing');
  if (!/source\s*:\s*['"]modern-canonical['"]/.test(s)) bad('source: modern-canonical tag missing');
  if (!/x-client-flow/.test(s)) bad('trace headers missing');
  ok('finalizeDeed v6 content verified');
}

// 2) ModernEngine uses review/SmartReview and onConfirm wiring + fallback
const me = path.join(root, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
if (ex(me)) {
  const s = read(me);
  if (!/\.\.\/review\/SmartReview/.test(s)) bad('ModernEngine must import SmartReview from ../review/SmartReview');
  if (!/onConfirm=\{onNext\}/.test(s)) bad('SmartReview must receive onConfirm={onNext}');
  if (!/onNextRef\s*=\s*useRef/.test(s)) bad('ModernEngine should hold onNext in a ref to avoid stale closures');
  if (!/smartreview:confirm/.test(s)) bad('ModernEngine should listen to smartreview:confirm fallback event');
  if (!/@\/lib\/canonical\/toCanonicalFor/.test(s)) bad('ModernEngine should import toCanonicalFor from @/lib/canonical/toCanonicalFor');
  ok('ModernEngine wiring looks correct');
} else {
  console.log('[verify-canonical-v6] WARN: ModernEngine.tsx not found');
}

// 3) SmartReview components: no direct /api/deeds calls or redirects
const smRoot = path.join(root, 'frontend/src/features/wizard/mode');
if (ex(smRoot)) {
  const files = [];
  (function walk(d){
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/SmartReview\.tsx$/.test(p)) files.push(p);
    }
  })(smRoot);
  for (const f of files) {
    const t = read(f);
    if (/fetch\(\s*['"]\/?api\/deeds/.test(t)) bad('Direct /api/deeds call in ' + path.relative(root, f));
    if (/window\.location\.href.*deeds/.test(t)) bad('Direct deeds redirect in ' + path.relative(root, f));
  }
  ok('SmartReview components are presentational');
}

// 4) promptFlows legal showIf
const pf = path.join(root, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
if (ex(pf)) {
  const s = read(pf);
  if (!/legalDescription/.test(s)) console.log('[verify-canonical-v6] WARN: legalDescription prompt not detected');
  else if (!/Not available/.test(s)) console.log('[verify-canonical-v6] WARN: could not confirm showIf guard contains "Not available" check');
  else ok('Legal description showIf likely patched');
} else {
  console.log('[verify-canonical-v6] WARN: promptFlows.ts not found');
}

// 5) preview guard helper presence
const pg = path.join(root, 'frontend/src/lib/preview/guard.ts');
if (!ex(pg)) bad('preview guard helper missing');
else ok('preview guard helper present');

if (process.exitCode) {
  console.error('[verify-canonical-v6] One or more checks failed.');
  process.exit(1);
} else {
  console.log('[verify-canonical-v6] All checks passed.');
}
