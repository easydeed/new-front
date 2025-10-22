    #!/usr/bin/env node
    import fs from 'fs';
    import path from 'path';

    const repoRoot = process.argv[2] || '.';
    const pagePath = path.join(repoRoot, 'frontend/src/app/deeds/[id]/preview/page.tsx');
    if (!fs.existsSync(pagePath)) {
      console.log('[preview-guard] WARN: Preview page not found:', path.relative(process.cwd(), pagePath));
      process.exit(0);
    }
    let code = fs.readFileSync(pagePath, 'utf8');

    // Ensure import of guard helpers
    if (!code.includes("@/lib/preview/guard")) {
      code = code.replace(/(import[^\n]+;\s*)/, "$1\nimport { validateDeedCompleteness, generateWithRetry } from '@/lib/preview/guard';\n");
    }

    // Try to ensure pre-validation before any '/api/generate' call
    if (!code.includes('validateDeedCompleteness')) {
      code = code.replace(/(async\s+function\s+[^\(]+\([^\)]*\)\s*\{)/, (m) => m + `
  // DeedPro preview guard: validate before generate
  const id = (params?.id || searchParams?.id || '').toString();
  const apiRes = await fetch('/api/deeds/' + id, { method: 'GET' });
  const deed = apiRes.ok ? await apiRes.json() : null;
  const errs = validateDeedCompleteness(deed);
  if (errs.length) {
    console.warn('[PreviewGuard] Blocking generate due to validation errors', errs);
    // TODO: surface these in the UI / route back to edit
    return null;
  }
`);
    }

    // Rewrite direct generate fetches to use capped 5xx retry
    code = code.replace(/await\s+fetch\(([^\)]*\/api\/generate[^\)]*)\)/g, "await generateWithRetry($1)");

    fs.writeFileSync(pagePath, code);
    console.log('[preview-guard] Patched preview page with pre-validation and capped retry.');

    // Add the guard helper file if missing
    const helperPath = path.join(repoRoot, 'frontend/src/lib/preview/guard.ts');
    if (!fs.existsSync(helperPath)) {
      const helper = `
export function validateDeedCompleteness(deed:any): string[] {
  const errs:string[] = [];
  if (!deed?.grantor_name) errs.push('Grantor information is required');
  if (!deed?.grantee_name) errs.push('Grantee information is required');
  if (!deed?.legal_description) errs.push('Legal description is required');
  return errs;
}

export async function generateWithRetry(input:any, init?:RequestInit) {
  const MAX = 3;
  let attempt = 0;
  let last:any;
  while (attempt < MAX) {
    const res = await fetch(input, init);
    if (res.status >= 500 && res.status < 600) {
      await new Promise(r => setTimeout(r, [500,1500,3000][attempt] || 3000));
      attempt++;
      last = res;
      continue;
    }
    return res;
  }
  return last;
}
`;
      fs.mkdirSync(path.dirname(helperPath), { recursive: true });
      fs.writeFileSync(helperPath, helper);
      console.log('[preview-guard] Added helper lib/preview/guard.ts');
    }
