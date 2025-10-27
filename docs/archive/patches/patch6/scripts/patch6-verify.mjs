// scripts/patch6-verify.mjs
// Quick checks to help ensure the patch was applied correctly.
// Run: node scripts/patch6-verify.mjs
import fs from 'node:fs';

const required = [
  'frontend/src/features/wizard/validation/zodSchemas.ts',
  'frontend/src/features/wizard/validation/adapters.ts',
  'frontend/src/features/wizard/validation/useValidation.ts',
  'frontend/src/features/wizard/validation/index.ts',
  'frontend/src/features/wizard/mode/review/SmartReview.tsx',
  'frontend/src/app/deeds/[id]/preview/page.tsx',
];

let ok = true;
for (const f of required) {
  if (!fs.existsSync(f)) {
    console.error('Missing:', f);
    ok = false;
  }
}

if (ok) {
  console.log('Patch 6 — Modern Validation Gate seems correctly installed. Don’t forget: npm i zod');
  process.exit(0);
} else {
  console.error('One or more files are missing. Please re-apply the patch.');
  process.exit(1);
}
