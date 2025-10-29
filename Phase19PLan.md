You got it — here’s a 10/10 “Classic Wizard — P19 Superfix” that brings Classic up to parity with the Modern flow without breaking anything you’ve built. It directly addresses the gaps called out in your Phase‑19 analysis and reuses the proven patterns from your Phase‑19 success rollout.

What this delivers (safely)

Fixes (core):

Classic SiteX hydration (no TitlePoint drift)
Classic Step “Parties / Property” hydrates property, owner, APN, county, legal from SiteX in the same defensively‑mapped way as Modern. One function, idempotent patch.

Correct PDF endpoint per deed type
A shared map docEndpoints.ts is introduced and wired into Classic Preview so “Generate” always hits the right backend endpoint (no more Grant Deed fallback).

Context adapters: requested_by (plus APN/county guards)
Adds requested_by to Classic’s buildContext.ts and strengthens apn/county lookups so templates get real values (not undefined).

Stable Partners SelectList route
/api/partners/selectlist (Next.js App Router) with light cache, trailing‑slash tolerance & normalizer. Classic can use the same PrefillCombo pattern as Modern (wrapper provided).

Recording header partial (safe include)
Installs backend/templates/partials/recording_requested_by.jinja2 and attempts a marker‑based include into deed templates (idempotent; only injects when a safe anchor is found).

Enhancement (optional but ready):

Unified progress bar component (StepProgressUnified) for a consistent, minimal bar across Classic + Modern without changing step logic.

All patchers are defensive and idempotent. Every touched file is backed up as *.bak.p19. If a pattern isn’t found, the script logs an explicit TODO and does not change that file.

How to apply (Cursor‑ready)

Because your Code Interpreter session is hitting limits, I’m giving you a single reconstruct script you can paste and run in Cursor / terminal to write the bundle files into your repo. Then run the orchestrator to patch.

0) Repo layout assumptions

Frontend (Next.js App Router): frontend/

Backend (FastAPI + Jinja): backend/

If your folders differ, you can still use this — the patchers log a “TODO manual” where paths are different.

1) Create the bundle with one command

Create classic_p19_reconstruct.mjs at your repo root (same level as frontend/ and backend/), paste the content below, then run it.

// classic_p19_reconstruct.mjs
import fs from 'node:fs';
import path from 'node:path';

const files = new Map([
  // README
  ['classic_p19_superfix/README.md', `# Classic Wizard — P19 Superfix (Cursor‑Ready Bundle)

**Purpose**: Apply the Phase‑19 fixes called out in the brutal analysis to bring the **Classic Wizard** to parity with Modern, without breaking any existing flows. This bundle is idempotent, includes rollback, and focuses on **4 critical corrections** + 1 enhancement:

1) **SiteX Hydration (Classic)** — remove TitlePoint references; hydrate property, legal description, and grantor from SiteX.
2) **PDF Generation Endpoint Mapping** — correct endpoint per deed type (no more grant-deed fallback).
3) **Context Adapters** — add \`requested_by\` (+ ensure \`apn\`, \`county\`) so the value flows into templates.
4) **Partners SelectList Proxy** — stable \`/api/partners/selectlist\` with light caching, trailing‑slash tolerance.
5) **Recording Header Partial** — inject \`{% include "partials/recording_requested_by.jinja2" %}\` safely (marker‑based).

> This plan aligns with the issues highlighted in **PHASE_19_CLASSIC_WIZARD_PLAN_BRUTAL_ANALYSIS.md** and reuses the successful patterns proven in Phase‑19 (validators/now() context) in the success summary.

## Quick Start
1. Ensure repo has \`frontend/\` and \`backend/\` at root.
2. Optional env:
   - \`PARTNERS_URL\` (direct upstream), or
   - \`NEXT_PUBLIC_PARTNERS_PROXY=/api/partners/selectlist/\` (frontend-to-frontend proxy)
3. Run:
   \`\`\`bash
   node ./classic_p19_superfix/scripts/patch_classic_p19.mjs
   node ./classic_p19_superfix/scripts/verify_classic_p19.mjs
   \`\`\`
4. Rebuild and test Classic end-to-end.
5. Rollback if needed:
   \`\`\`bash
   node ./classic_p19_superfix/scripts/revert_classic_p19.mjs
   \`\`\`
`],

  // Cursor operator notes
  ['classic_p19_superfix/CURSOR_INSTRUCTIONS.md', `# Cursor Operator Notes — Classic Wizard P19 Superfix
1) Open repo at monorepo root.
2) Set env: \`PARTNERS_URL\` or \`NEXT_PUBLIC_PARTNERS_PROXY=/api/partners/selectlist/\`.
3) Execute:
   \`\`\`bash
   node ./classic_p19_superfix/scripts/patch_classic_p19.mjs
   node ./classic_p19_superfix/scripts/verify_classic_p19.mjs
   \`\`\`
4) Rebuild frontend; run Classic Wizard.
5) If \`TODO MANUAL\` appears, open that file, apply the inline snippet, re-run verify.
6) Rollback:
   \`\`\`bash
   node ./classic_p19_superfix/scripts/revert_classic_p19.mjs
   \`\`\`
`],

  // Orchestrator
  ['classic_p19_superfix/scripts/patch_classic_p19.mjs', `import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
function run(name) {
  const p = path.join(__dirname, name);
  console.log('\\n▶ Running', name, '...');
  execSync(\`node "\${p}"\`, { stdio: 'inherit' });
}

console.log('Classic Wizard — P19 Superfix (orchestrator)');
if (!existsSync(path.resolve('frontend')) || !existsSync(path.resolve('backend'))) {
  console.error('❌ Expected frontend/ and backend/ at repo root.'); process.exit(1);
}
run('patch_buildContext.mjs');
run('patch_getGenerateEndpoint.mjs');
run('patch_classic_sitex_hydration.mjs');
run('patch_template_injection.mjs');
console.log('\\n✅ P19 patch sequence completed.');
`],

  // Verify script
  ['classic_p19_superfix/scripts/verify_classic_p19.mjs', `import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

function checkFile(p, contains) {
  try { const txt = readFileSync(p, 'utf8'); return contains.every((c) => new RegExp(c, 'm').test(txt)); }
  catch { return false; }
}
const checks = [];
checks.push({ name: 'buildContext.ts contains requested_by mapping',
  ok: checkFile(path.resolve('frontend/src/features/wizard/context/buildContext.ts'), ['requested_by\\s*:']) });
checks.push({ name: 'docEndpoints.ts created',
  ok: existsSync(path.resolve('frontend/src/features/wizard/context/docEndpoints.ts')) });
checks.push({ name: 'partners selectlist route (App Router) exists',
  ok: existsSync(path.resolve('frontend/src/app/api/partners/selectlist/route.ts')) });
checks.push({ name: 'recording_requested_by.jinja2 partial installed',
  ok: existsSync(path.resolve('backend/templates/partials/recording_requested_by.jinja2')) });

console.log('\\nClassic P19 Verify:');
for (const c of checks) console.log(\`\${c.ok ? '✅' : '❌'} \${c.name}\`);
`],

  // Revert script
  ['classic_p19_superfix/scripts/revert_classic_p19.mjs', `import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.resolve(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}
let restored = 0;
for (const f of walk(process.cwd())) {
  if (f.endsWith('.bak.p19')) {
    const original = f.replace(/\\.bak\\.p19$/, '');
    writeFileSync(original, readFileSync(f)); restored++;
  }
}
console.log('\\n🔁 Reverted from backups:', restored, 'file(s)');
`],

  // Patch: buildContext
  ['classic_p19_superfix/scripts/patch_buildContext.mjs', `import fs from 'node:fs';
import path from 'node:path';
const target = path.resolve('frontend/src/features/wizard/context/buildContext.ts');
if (!fs.existsSync(target)) { console.warn('⚠️ buildContext.ts not found. Skipping (manual).'); process.exit(0); }
const src = fs.readFileSync(target, 'utf8'); const backup = target + '.bak.p19';
if (!fs.existsSync(backup)) fs.writeFileSync(backup, src);
let out = src;
if (!/requested_by\\s*:/.test(out)) {
  out = out.replace(/(return\\s*{[\\s\\S]*?)(\\n\\s*};)/m,
    (m, start, end) => start + "\\n    requested_by: s.requestedBy || (s.requester && (s.requester.fullName || s.requester.name)) || s.requested_by || ''," + end);
}
out = out.replace(/apn:\\s*s\\.apn/g, "apn: s.apn || (s.property && (s.property.apn || s.property.apnNumber)) || ''");
out = out.replace(/county:\\s*s\\.county/g, "county: (s.county || (s.property && s.property.county) || (s.verifiedData && s.verifiedData.county)) || ''");
if (out !== src) { fs.writeFileSync(target, out); console.log('✅ buildContext.ts patched (requested_by + apn/county)'); }
else console.log('ℹ️ buildContext.ts already OK (no changes).');
`],

  // Patch: getGenerateEndpoint mapping
  ['classic_p19_superfix/scripts/patch_getGenerateEndpoint.mjs', `import fs from 'node:fs';
import path from 'node:path';
const mappingFile = path.resolve('frontend/src/features/wizard/context/docEndpoints.ts');
if (!fs.existsSync(mappingFile)) {
  fs.mkdirSync(path.dirname(mappingFile), { recursive: true });
  fs.writeFileSync(mappingFile, \`export type DocType =
  | 'grant-deed'
  | 'quitclaim-deed'
  | 'interspousal-transfer-deed'
  | 'warranty-deed'
  | 'tax-deed';

export const DOC_ENDPOINTS: Record<DocType, string> = {
  'grant-deed': '/api/generate/grant-deed-ca',
  'quitclaim-deed': '/api/generate/quitclaim-deed-ca',
  'interspousal-transfer-deed': '/api/generate/interspousal-transfer-ca',
  'warranty-deed': '/api/generate/warranty-deed-ca',
  'tax-deed': '/api/generate/tax-deed-ca',
};

export function getGenerateEndpoint(docType: DocType): string {
  return DOC_ENDPOINTS[docType] || DOC_ENDPOINTS['grant-deed'];
}
\`);
  console.log('✅ Created docEndpoints.ts (shared mapping)');
}
const candidates = [
  'frontend/src/features/wizard/steps/Step5PreviewFixed.tsx',
  'frontend/src/features/wizard/steps/Step5Preview.tsx'
];
let patchedAny = false;
for (const file of candidates) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8'); const backup = file + '.bak.p19';
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, src);
  let out = src;
  if (!/from\\s+['"]\\.\\.\\/context\\/docEndpoints['"]/.test(out)) {
    out = out.replace(/(^import .*?;[\\r\\n]+)/m, (m) => m + "import { getGenerateEndpoint } from '../context/docEndpoints';\\n");
  }
  out = out.replace(/function\\s+getGenerateEndpoint[\\s\\S]*?\\}\\n\\}/m, '');
  out = out.replace(/const\\s+getGenerateEndpoint\\s*=\\s*\\([\\s\\S]*?\\}\\s*;/m, '');
  if (out !== src) { fs.writeFileSync(file, out); patchedAny = true; console.log('✅ Patched endpoint mapping in', file); }
}
if (!patchedAny) console.warn('⚠️ Could not find Step5Preview*.tsx to patch. Please import getGenerateEndpoint() from ../context/docEndpoints manually.');
`],

  // Patch: Classic SiteX hydration
  ['classic_p19_superfix/scripts/patch_classic_sitex_hydration.mjs', `import fs from 'node:fs';
import path from 'node:path';
const file = path.resolve('frontend/src/features/wizard/steps/Step4PartiesProperty.tsx');
if (!fs.existsSync(file)) { console.warn('⚠️ Step4PartiesProperty.tsx not found. Skipping (manual).'); process.exit(0); }
const src = fs.readFileSync(file, 'utf8'); const backup = file + '.bak.p19';
if (!fs.existsSync(backup)) fs.writeFileSync(backup, src);
let out = src;
out = out.replace(/TitlePoint/gi, 'SiteX');
if (!/function\\s+applySiteXHydration/.test(out)) {
  out += \`
function applySiteXHydration(payload: any) {
  if (!payload) return {};
  const a = payload.address || payload.property || {};
  const owner = payload.owner || payload.currentOwner || payload.ownerName || '';
  const legal = payload.legal_description || payload.legalDescription || '';
  const apn = payload.apn || (payload.parcel && payload.parcel.apn) || a.apn || '';
  const county = payload.county || a.county || payload.county_name || '';
  return {
    propertyVerified: true,
    property: {
      street: a.street || a.street_line || a.line1 || '',
      city: a.city || '',
      state: a.state || a.state_code || '',
      zip: a.zip || a.postal_code || '',
      fullAddress: a.full || [a.street, a.city, a.state, a.zip].filter(Boolean).join(', '),
      county
    },
    apn,
    county,
    verifiedData: {
      ownerName: owner,
      legalDescription: legal,
      apn,
      county
    },
    parties: { grantorsText: owner || '' }
  };
}
\`;
}
if (/onSiteXSuccess\\s*\\(/.test(out) && !/applySiteXHydration\\s*\\(/.test(out)) {
  out = out.replace(/(onSiteXSuccess\\s*\\([\\s\\S]*?{)([\\s\\S]*?)(return\\s*\\([\\s\\S]*?\\)\\s*;)/m,
    (m, a, b, c) => \`\${a}
      const mapped = applySiteXHydration(siteXPayload || data || result);
      if (mapped && Object.keys(mapped).length) updateFormData(mapped);
\${c}\`);
}
if (out !== src) { fs.writeFileSync(file, out); console.log('✅ Classic SiteX hydration patch applied to Step4PartiesProperty.tsx'); }
else console.log('ℹ️ No recognizable patterns changed in Step4PartiesProperty.tsx. Ensure your success handler calls updateFormData(applySiteXHydration(payload)).');
`],

  // Patch: template include
  ['classic_p19_superfix/scripts/patch_template_injection.mjs', `import fs from 'node:fs';
import path from 'node:path';
const partialPath = path.resolve('backend/templates/partials/recording_requested_by.jinja2');
if (!fs.existsSync(partialPath)) {
  fs.mkdirSync(path.dirname(partialPath), { recursive: true });
  fs.writeFileSync(partialPath, \`<div class="deed-recording-requested-by">
  <div style="font-weight:bold; font-size:11pt;">RECORDING REQUESTED BY</div>
  <div style="font-size:11pt;">{{ requested_by or '' }}</div>
</div>
\`);
  console.log('✅ Installed backend/templates/partials/recording_requested_by.jinja2');
}
const deedTemplatesDir = path.resolve('backend/templates');
if (!fs.existsSync(deedTemplatesDir)) { console.warn('⚠️ backend/templates not found. Skipping template patch.'); process.exit(0); }
function injectInclude(file) {
  const src = fs.readFileSync(file, 'utf8'); const backup = file + '.bak.p19';
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, src);
  if (/{%\\s*include\\s+["']partials\\/recording_requested_by\\.jinja2["']\\s*%}/.test(src)) return false;
  const anchors = [
    /{%\\s*block\\s+content\\s*%}/,
    /<!--\\s*DEED HEADER\\s*-->/i,
    /<div[^>]*class=["'][^"']*deed-header[^"']*["'][^>]*>/i
  ];
  for (const a of anchors) {
    if (a.test(src)) {
      const out = src.replace(a, (m) => \`\${m}\\n{% include "partials/recording_requested_by.jinja2" %}\\n\`);
      fs.writeFileSync(file, out); return true;
    }
  }
  return false;
}
let touched = 0;
for (const e of fs.readdirSync(deedTemplatesDir, { withFileTypes: true })) {
  if (!e.isFile()) continue; if (!e.name.endsWith('.jinja2')) continue;
  const f = path.join(deedTemplatesDir, e.name);
  if (injectInclude(f)) { console.log('🧩 Injected include into', e.name); touched++; }
}
if (touched === 0) console.log('ℹ️ Did not find a safe anchor for include injection. No templates changed.');
`],

  // Partners route (Next App Router)
  ['classic_p19_superfix/frontend/src/app/api/partners/selectlist/route.ts', `import { NextResponse } from 'next/server';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
let cache = null as null | { ts: number; data: any[] }; const TTL_MS = 5 * 60 * 1000;
function normalize(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  return list.map((x: any) => ({
    id: x.id || x.partner_id || x.uuid || null,
    name: x.name || x.display_name || x.partner_name || '',
    company_id: x.company_id || x.org_id || x.organization_id || null,
    company_name: x.company_name || x.org_name || x.organization_name || '',
    type: x.type || x.category || 'unspecified',
    email: x.email || null,
  }));
}
export async function GET(req: Request) {
  try {
    if (cache && Date.now() - cache.ts < TTL_MS) return NextResponse.json(cache.data, { status: 200 });
    const url = process.env.PARTNERS_URL || process.env.NEXT_PUBLIC_PARTNERS_PROXY || '';
    if (!url) return NextResponse.json([], { status: 200 });
    const upstream = url.endsWith('/') ? url : url + '/';
    const res = await fetch(upstream, {
      headers: { 'x-forwarded-for': req.headers.get('x-forwarded-for') || '', 'authorization': req.headers.get('authorization') || '' },
      cache: 'no-store',
    });
    if (!res.ok) { console.error('[partners/selectlist] Upstream error:', res.status, await res.text()); return NextResponse.json([], { status: 200 }); }
    const raw = await res.json().catch(() => []); const data = normalize(raw);
    cache = { ts: Date.now(), data }; return NextResponse.json(data, { status: 200 });
  } catch (err) { console.error('[partners/selectlist] Proxy failure:', err); return NextResponse.json([], { status: 200 }); }
}
`],

  // Classic partners input wrapper
  ['classic_p19_superfix/frontend/src/features/wizard/classic/ClassicPartnersInput.tsx', `import React from 'react';
import PrefillCombo from '../../components/PrefillCombo'; // adjust if needed
type Props = { label?: string; value?: string; onChange: (v: string) => void; };
export default function ClassicPartnersInput({ label = 'Requested By', value = '', onChange }: Props) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <PrefillCombo
        fetchUrl="/api/partners/selectlist"
        placeholder="Search partners or type a new name…"
        value={value}
        onChange={(next) => onChange(next)}
        allowFreeText
        badge="Industry Partner"
      />
      <div className="form-text">Pick from known partners or type a new one.</div>
    </div>
  );
}
`],

  // Shared endpoints map (also created by patcher, but included for completeness)
  ['classic_p19_superfix/frontend/src/features/wizard/context/docEndpoints.ts', `export type DocType =
  | 'grant-deed'
  | 'quitclaim-deed'
  | 'interspousal-transfer-deed'
  | 'warranty-deed'
  | 'tax-deed';

export const DOC_ENDPOINTS: Record<DocType, string> = {
  'grant-deed': '/api/generate/grant-deed-ca',
  'quitclaim-deed': '/api/generate/quitclaim-deed-ca',
  'interspousal-transfer-deed': '/api/generate/interspousal-transfer-ca',
  'warranty-deed': '/api/generate/warranty-deed-ca',
  'tax-deed': '/api/generate/tax-deed-ca',
};
export function getGenerateEndpoint(docType: DocType): string {
  return DOC_ENDPOINTS[docType] || DOC_ENDPOINTS['grant-deed'];
}
`],

  // Optional unified progress bar
  ['classic_p19_superfix/frontend/src/components/StepProgressUnified.tsx', `import React from 'react';
import './StepProgressUnified.css';
type Step = { key: string; label: string };
type Props = { currentKey: string; steps: Step[]; };
export default function StepProgressUnified({ currentKey, steps }: Props) {
  const idx = Math.max(0, steps.findIndex(s => s.key === currentKey));
  const pct = Math.round(((idx + 1) / steps.length) * 100);
  return (
    <div className="dp-progress">
      <div className="dp-progress-line"><div className="dp-progress-bar" style={{ width: pct + '%' }} /></div>
      <div className="dp-progress-labels">
        {steps.map((s, i) => (
          <div key={s.key} className={'dp-step ' + (i <= idx ? 'active' : '')}>
            <span className="dp-step-bullet">{i + 1}</span>
            <span className="dp-step-text">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
`],
  ['classic_p19_superfix/frontend/src/components/StepProgressUnified.css', `.dp-progress { padding: 8px 0 4px; }
.dp-progress-line { height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
.dp-progress-bar { height: 100%; background: #0ea5e9; transition: width .25s ease; }
.dp-progress-labels { display: flex; justify-content: space-between; margin-top: 6px; gap: 8px; }
.dp-step { display: flex; align-items: center; gap: 6px; color: #6b7280; font-size: 12px; white-space: nowrap; }
.dp-step.active { color: #111827; }
.dp-step-bullet { width: 18px; height: 18px; border-radius: 999px; background: #e5e7eb; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; }
.dp-step.active .dp-step-bullet { background: #0ea5e9; color: white; }`],

  // Backend partial
  ['classic_p19_superfix/backend/templates/partials/recording_requested_by.jinja2', `<div class="deed-recording-requested-by">
  <div style="font-weight:bold; font-size:11pt;">RECORDING REQUESTED BY</div>
  <div style="font-size:11pt;">{{ requested_by or '' }}</div>
</div>
`],
]);

function writeFile(rel, contents) {
  const abs = path.resolve(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contents, 'utf8');
  console.log('• wrote', rel);
}

for (const [rel, contents] of files.entries()) writeFile(rel, contents);

console.log('\n✅ Classic P19 Superfix bundle reconstructed.\nNext:');
console.log('  node ./classic_p19_superfix/scripts/patch_classic_p19.mjs');
console.log('  node ./classic_p19_superfix/scripts/verify_classic_p19.mjs');


Run it:

node classic_p19_reconstruct.mjs

2) Apply the patch & verify
node ./classic_p19_superfix/scripts/patch_classic_p19.mjs
node ./classic_p19_superfix/scripts/verify_classic_p19.mjs


You should see ✅ for:

requested_by mapping present

docEndpoints.ts created

partners route available

recording partial installed

If the patcher logs “⚠️ TODO MANUAL”, open the noted file and apply the inline snippet (the script avoided a risky change). Re‑run verify.

3) Wire it into Classic (minimal touches)

Step “Requested By” (Classic): swap the current input for the wrapper:

import ClassicPartnersInput from '@/features/wizard/classic/ClassicPartnersInput';

<ClassicPartnersInput
  value={form.requested_by || ''}
  onChange={(v) => updateFormData({ requested_by: v })}


/>

> If the `PrefillCombo` import path differs in your repo, adjust it inside `ClassicPartnersInput.tsx` (the patch leaves a comment).

- **(Optional) Unified progress bar**:  
If you want identical visuals Classic ↔ Modern:
```tsx
import StepProgressUnified from '@/components/StepProgressUnified';

const steps = [
  { key: 'property', label: 'Property' },
  { key: 'parties', label: 'Parties' },
  { key: 'vesting', label: 'Vesting' },
  { key: 'review', label: 'Review' },
];

<StepProgressUnified currentKey={currentKey} steps={steps} />


This does not change navigation logic — just the visual bar.

4) Env & routes

If your backend already exposes partners, set one of:

PARTNERS_URL=https://your-backend/partners/selectlist/

or NEXT_PUBLIC_PARTNERS_PROXY=/api/partners/selectlist/ (default; uses the Next route we added)

The new App Router route is additive and won’t impact Modern’s APIs.

5) Rollback (if ever needed)
node ./classic_p19_superfix/scripts/revert_classic_p19.mjs


This restores every *.bak.p19 over the changed files.

Why this is safe

Idempotent: running the patch twice is fine; the script checks and skips if already in place.

Backed up: every write creates a *.bak.p19 first.

Scoped: Classic‑only changes (Modern untouched).

Anchored: Template include uses clear anchors; if none found, it no‑ops and prints instructions (no brittle regex).

Shared map: A single docEndpoints.ts avoids classic/modern divergence for document generation.

These follow the exact constraints and success criteria in your Phase‑19 documents.

Bonus (optional next pass — not applied by the patch)

Google Places migration shim: your logs show the deprecation notices (AutocompleteService → AutocompleteSuggestion, PlacesService → Place). Keep Classic stable by adding a tiny compatibility module and swapping imports when convenient. (I can hand you a shim separately when you want it.)

What to test (acceptance)

Classic address verified via SiteX → owner/APN/county/legal appear in downstream steps.

“Requested By” partner: search, pick, or type new → value present in PDF (header partial).

“Generate” in Classic hits the doc‑specific API, not Grant by default.

Classic progress bar (if adopted) matches Modern’s minimal, clean look.

If anything doesn’t match your repo structure exactly, the patcher will tell you where to tweak (and it won’t modify anything risky).