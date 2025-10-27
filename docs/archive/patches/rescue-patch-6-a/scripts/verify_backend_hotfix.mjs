#!/usr/bin/env node
// Verifies presence of critical fixes.
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || '.';

function ok(msg){ console.log('[verify-backend-hotfix] ✅', msg); }
function bad(msg){ console.error('[verify-backend-hotfix] ❌', msg); process.exitCode = 1; }

// Frontend proxy check
const route = path.join(root, 'frontend/src/app/api/deeds/create/route.ts');
if (fs.existsSync(route)) {
  const s = fs.readFileSync(route, 'utf8');
  if (!s.includes('await req.json()')) bad('Proxy should read body with await req.json()');
  if (!s.includes("body: JSON.stringify(payload)")) bad('Proxy must forward JSON.stringify(payload), not req.body');
  ok('Frontend proxy route looks correct');
} else {
  console.log('[verify-backend-hotfix] WARN: proxy route not found (monorepo structure may differ)');
}

// Backend schema check
const schema = path.join(root, 'backend/schemas/deeds.py');
if (fs.existsSync(schema)) {
  const s = fs.readFileSync(schema, 'utf8');
  if (!/class\s+DeedCreate/.test(s)) bad('DeedCreate schema missing');
  if (!/min_length=1/.test(s)) bad('DeedCreate should enforce non-empty strings');
  ok('DeedCreate schema has non-empty validations');
} else {
  console.log('[verify-backend-hotfix] WARN: backend schema not found');
}

// Backend router check
const router = path.join(root, 'backend/routers/deeds.py');
if (fs.existsSync(router)) {
  const s = fs.readFileSync(router, 'utf8');
  if (!/async\s+def\s+create_deed_endpoint/.test(s)) bad('create_deed_endpoint not found');
  if (!/payload: DeedCreate/.test(s)) bad('Endpoint should type payload as DeedCreate');
  ok('Backend router typed endpoint detected');
} else {
  console.log('[verify-backend-hotfix] WARN: backend router not found');
}

// Backend service check
const svc = path.join(root, 'backend/services/deeds.py');
if (fs.existsSync(svc)) {
  const s = fs.readFileSync(svc, 'utf8');
  if (!/def\s+create_deed\(db, deed_data\)/.test(s)) bad('create_deed service not found');
  if (!/Missing required field:/.test(s)) bad('create_deed should guard missing fields');
  ok('Backend service guard present');
} else {
  console.log('[verify-backend-hotfix] WARN: backend service file not found');
}

if (process.exitCode) {
  console.error('[verify-backend-hotfix] One or more checks failed.');
  process.exit(1);
} else {
  console.log('[verify-backend-hotfix] All checks passed.');
}
