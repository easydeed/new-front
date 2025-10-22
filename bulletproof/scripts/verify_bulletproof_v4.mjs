#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.argv[2] || '.';
const read = p => fs.readFileSync(p, 'utf8');
const exists = p => fs.existsSync(p);

function ok(msg){ console.log('[verify-v4] ✅', msg); }
function bad(msg){ console.error('[verify-v4] ❌', msg); process.exitCode = 1; }

// 1) SmartReview: no direct deed calls or redirects
const smRoot = path.join(root, 'frontend/src/features/wizard/mode');
if (exists(smRoot)) {
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
    const s = read(f);
    if (/fetch\(\s*['"]\/?api\/deeds/.test(s)) bad('Direct /api/deeds call in ' + path.relative(root, f));
    if (/window\.location\.href.*deeds/.test(s)) bad('Direct deeds redirect in ' + path.relative(root, f));
  }
  ok('SmartReview components are presentational');
} else {
  console.log('[verify-v4] WARN: wizard/mode path not found');
}

// 2) ModernEngine: import path + onConfirm + ref-safe event
const mePath = path.join(root, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
if (exists(mePath)) {
  const s = read(mePath);
  if (!/from\s+['"]\.\.\/review\/SmartReview['"]/.test(s)) bad('ModernEngine should import SmartReview from ../review/SmartReview');
  if (!/<SmartReview[\s\S]*onConfirm=\{onNext\}/.test(s)) bad('ModernEngine should pass onConfirm={onNext} to SmartReview');
  if (!/onNextRef\s*=\s*useRef/.test(s)) bad('ModernEngine should hold onNext in a ref to avoid stale closures');
  if (!/smartreview:confirm/.test(s)) bad('ModernEngine should listen to smartreview:confirm fallback event');
  ok('ModernEngine wiring looks correct');
} else {
  console.log('[verify-v4] WARN: ModernEngine.tsx not found');
}

// 3) finalizeDeed: guard + tag + trace headers
const fdPath = path.join(root, 'frontend/src/lib/deeds/finalizeDeed.ts');
if (exists(fdPath)) {
  const s = read(fdPath);
  if (!/function\s+assertPayloadComplete/.test(s)) bad('finalizeDeed.ts missing assertPayloadComplete guard');
  if (!/source\s*:\s*['"]modern['"]/.test(s)) bad('finalizeDeed.ts missing source: modern');
  if (!/x-client-flow/.test(s)) bad('finalizeDeed.ts missing trace headers');
  ok('finalizeDeed has guard, source tag, and trace headers');
} else {
  console.log('[verify-v4] WARN: finalizeDeed.ts not found');
}

// 4) Re-export consolidation
const svc = path.join(root, 'frontend/src/services/finalizeDeed.ts');
const brg = path.join(root, 'frontend/src/features/wizard/mode/bridge/finalizeDeed.ts');
if (exists(svc) && exists(brg)) {
  const a = read(svc), b = read(brg);
  if (!/from ['"]@\/lib\/deeds\/finalizeDeed['"]/.test(a+b)) bad('Re-exports should point to @/lib/deeds/finalizeDeed');
  else ok('finalizeDeed re-exports consolidated');
} else {
  console.log('[verify-v4] WARN: could not find one of the re-export files');
}

if (process.exitCode) {
  console.error('[verify-v4] One or more checks failed.');
  process.exit(1);
} else {
  console.log('[verify-v4] All checks passed.');
}
