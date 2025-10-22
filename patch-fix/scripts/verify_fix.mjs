#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.argv[2] || '.';
const read = (p) => fs.readFileSync(p, 'utf8');

function scanSmartReviews() {
  const base = path.join(root, 'frontend/src/features/wizard/mode');
  const files = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (p.endsWith('.tsx') && p.includes('SmartReview')) files.push(p);
    }
  };
  if (!fs.existsSync(base)) {
    console.log('[verify] WARNING: wizard/mode path not found:', base);
    return;
  }
  walk(base);
  for (const f of files) {
    const s = read(f);
    if (/fetch\(.*api\/deeds/.test(s) || /window\.location\.href.*deeds/.test(s)) {
      throw new Error('Forbidden pattern in ' + path.relative(root, f));
    }
  }
  console.log('[verify] SmartReview components clean.');
}

function checkME() {
  const p = path.join(root, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
  if (!fs.existsSync(p)) {
    console.log('[verify] WARNING: ModernEngine.tsx not found.');
    return;
  }
  const s = read(p);
  if (!s.includes('smartreview:confirm')) throw new Error('ModernEngine missing smartreview:confirm listener');
  console.log('[verify] ModernEngine listener present.');
}

function checkFD() {
  const p = path.join(root, 'frontend/src/lib/deeds/finalizeDeed.ts');
  if (!fs.existsSync(p)) {
    console.log('[verify] WARNING: finalizeDeed.ts not found.');
    return;
  }
  const s = read(p);
  if (!/source\s*:\s*['"]modern['"]/.test(s)) throw new Error('finalizeDeed.ts missing source: modern');
  console.log('[verify] finalizeDeed source tag present.');
}

try {
  scanSmartReviews();
  checkME();
  checkFD();
  console.log('[verify] All checks passed.');
} catch (e) {
  console.error('[verify] FAILED:', e.message);
  process.exit(1);
}
