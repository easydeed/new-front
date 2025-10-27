#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || '.';
const base = path.join(__dirname, '..');

function cp(srcRel, dstRel) {
  const src = path.join(base, srcRel);
  const dst = path.join(root, dstRel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log('[apply-backend-hotfix] wrote', path.relative(process.cwd(), dst));
}

// Copy files (adjust paths to your monorepo layout)
cp('files/frontend/src/app/api/deeds/create/route.ts', 'frontend/src/app/api/deeds/create/route.ts');
cp('files/backend/schemas/deeds.py', 'backend/schemas/deeds.py');
cp('files/backend/routers/deeds.py', 'backend/routers/deeds.py');
cp('files/backend/services/deeds.py', 'backend/services/deeds.py');

console.log('[apply-backend-hotfix] Complete. Now run build/tests and restart backend.');
