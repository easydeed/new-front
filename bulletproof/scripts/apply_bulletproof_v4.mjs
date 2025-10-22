    #!/usr/bin/env node
    import fs from 'fs';
    import path from 'path';
    import { fileURLToPath } from 'url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const repoRoot = process.argv[2] || '.';
    const base = path.join(__dirname, '..');

    const log = (...a) => console.log('[apply-v4]', ...a);
    const read = p => fs.readFileSync(p, 'utf8');
    const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); log('wrote', path.relative(process.cwd(), p)); };
    const exists = p => fs.existsSync(p);

    // 1) Copy presentational SmartReview variants (overwrite to neuter legacy logic)
    const copies = [
      ['files/frontend/src/features/wizard/mode/review/SmartReview.tsx', 'frontend/src/features/wizard/mode/review/SmartReview.tsx'],
      ['files/frontend/src/features/wizard/mode/components/SmartReview.tsx', 'frontend/src/features/wizard/mode/components/SmartReview.tsx'],
      ['files/frontend/src/features/wizard/mode/engines/steps/SmartReview.tsx', 'frontend/src/features/wizard/mode/engines/steps/SmartReview.tsx'],
    ];
    for (const [srcRel, dstRel] of copies) {
      const src = path.join(base, srcRel);
      const dst = path.join(repoRoot, dstRel);
      write(dst, read(src));
    }

    // 2) Ensure finalizeDeed re-exports are consolidated
    const svcPath = path.join(repoRoot, 'frontend/src/services/finalizeDeed.ts');
    write(svcPath, "export { finalizeDeed } from '@/lib/deeds/finalizeDeed';\n");
    const bridgePath = path.join(repoRoot, 'frontend/src/features/wizard/mode/bridge/finalizeDeed.ts');
    write(bridgePath, "export { finalizeDeed } from '@/lib/deeds/finalizeDeed';\n");

    // 3) Patch ModernEngine
    const mePath = path.join(repoRoot, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (exists(mePath)) {
      let code = read(mePath);

      // a) Import SmartReview from ../review/SmartReview explicitly
      code = code.replace(/from\s+['"]\.\.\/components\/SmartReview['"]/g, "from '../review/SmartReview'");
      code = code.replace(/from\s+['"]\.\.\/engines\/steps\/SmartReview['"]/g, "from '../review/SmartReview'");

      // If there is no explicit import, try to insert one near the top
      if (!/from\s+['"]\.\.\/review\/SmartReview['"]/.test(code) && code.includes('SmartReview')) {
        // Insert a generic import
        code = code.replace(/(import[^\n]+;\s*)/, "$1\nimport SmartReview from '../review/SmartReview';\n");
      }

      // b) Ensure React imports useEffect + useRef
      if (!/from\s+['"]react['"]/.test(code)) {
        code = `import React, { useEffect, useRef } from 'react';\n` + code;
      } else {
        code = code.replace(/import\s+([^;]+)from\s+['"]react['"];?/, (m, imp) => {
          let hasEffect = /useEffect/.test(imp);
          let hasRef = /useRef/.test(imp);
          let newImp = imp;
          if (imp.includes('{')) {
            if (!hasEffect) newImp = newImp.replace('{', '{ useEffect, ');
            if (!hasRef) newImp = newImp.replace('{', '{ useRef, ');
            return `import ${newImp}from 'react';`;
          } else {
            return `import { useEffect, useRef } from 'react';\n` + m;
          }
        });
      }

      // c) Inject ref-safe event bridge + onConfirm wiring
      if (!/onNextRef\s*=\s*useRef/.test(code)) {
        const openFn = /(export\s+default\s+function\s+ModernEngine[^\{]*\{)/;
        if (openFn.test(code)) {
          code = code.replace(openFn, (m) => m + `
  // Keep a ref to the latest onNext to avoid stale-closure issues.
  const onNextRef = useRef(() => {} as unknown as () => void);
  // @ts-ignore update ref when onNext changes
  useEffect(() => { onNextRef.current = onNext as any; }, [onNext]);

  // Fallback DOM-event bridge if SmartReview didn't receive onConfirm prop.
  useEffect(() => {
    const handler = () => { try { onNextRef.current?.(); } catch (e) { console.error('[ModernEngine] onNext from smartreview:confirm failed', e); } };
    window.addEventListener('smartreview:confirm', handler);
    return () => window.removeEventListener('smartreview:confirm', handler);
  }, []);
`);
        } else {
          log('WARNING: Could not find ModernEngine function signature to inject ref-safe bridge.');
        }
      } else {
        // Ensure event listener uses the ref variant
        code = code.replace(/window\.addEventListener\('smartreview:confirm',[^)]+\)/, "window.addEventListener('smartreview:confirm', () => onNextRef.current?.())");
      }

      // d) Ensure rendered SmartReview receives onConfirm={onNext}
      code = code.replace(/<SmartReview(\s+[^>]*)?>/g, (m) => /onConfirm=\{onNext\}/.test(m) ? m : m.replace(/>$/, ' onConfirm={onNext}>'));

      write(mePath, code);
    } else {
      log('WARNING: ModernEngine.tsx not found at expected path');
    }

    // 4) Patch finalizeDeed.ts
    const fdPath = path.join(repoRoot, 'frontend/src/lib/deeds/finalizeDeed.ts');
    if (exists(fdPath)) {
      let code = read(fdPath);

      // a) Add assert guard function if missing
      if (!/function\s+assertPayloadComplete/.test(code)) {
        code = code.replace(/export\s+async\s+function\s+finalizeDeed\(/, `
function assertPayloadComplete(payload:any) {
  const g1 = payload?.parties?.grantor?.name?.trim?.();
  const g2 = payload?.parties?.grantee?.name?.trim?.();
  const ld = payload?.property?.legalDescription?.trim?.();
  const missing = [];
  if (!g1) missing.push('grantor_name');
  if (!g2) missing.push('grantee_name');
  if (!ld) missing.push('legal_description');
  if (missing.length) {
    console.error('[finalizeDeed] Missing required fields before create:', { missing, payload });
    return { ok: false, missing };
  }
  return { ok: true };
}

export async function finalizeDeed(`);
      }

      // b) Call guard before building backend payload
      if (!/assertPayloadComplete\(payload\)/.test(code)) {
        code = code.replace(/console\.log\('\[finalizeDeed\] Canonical payload received:', payload\);/, `console.log('[finalizeDeed] Canonical payload received:', payload);
    const check = assertPayloadComplete(payload);
    if (!check.ok) {
      alert('Missing required fields: ' + check.missing.join(', ') + '. Please review and try again.');
      return { success: false };
    }`);
      }

      // c) Ensure source: 'modern' in backend payload
      if (!/source\s*:\s*['"]modern['"]/.test(code)) {
        code = code.replace(/vesting:\s*payload\.vesting\?\.description\s*\|\|\s*null/, "vesting: payload.vesting?.description || null,\n      source: 'modern'");
      }

      // d) Add trace headers to fetch
      if (!/x-client-flow/.test(code)) {
        code = code.replace(/headers:\s*\{([^}]+)\}/, (m, inner) => {
          // attempt to merge into existing headers object
          let merged = inner.trim().replace(/\s+$/,'');
          if (!/Content-Type/.test(merged)) merged = `'Content-Type': 'application/json',\n          ` + merged;
          const trace = `\n          'x-client-flow': 'modern-engine',\n          'x-ui-component': 'smartreview-review',\n          'x-build-sha': (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || 'dev') as any`;
          return `headers: { ${merged}${trace}\n        }`;
        });
      }

      write(fdPath, code);
    } else {
      log('WARNING: finalizeDeed.ts not found at expected path');
    }

    // 5) Optional: Add ESLint rule files (not auto-wired)
    const rulePath = path.join(base, 'eslint/deedpro-smartreview-guard.js');
    const ruleCfgPath = path.join(base, 'eslint/.eslintrc.deedpro.cjs');
    const outRuleDir = path.join(repoRoot, 'eslint');
    fs.mkdirSync(outRuleDir, { recursive: true });
    fs.copyFileSync(rulePath, path.join(outRuleDir, 'deedpro-smartreview-guard.js'));
    fs.copyFileSync(ruleCfgPath, path.join(outRuleDir, '.eslintrc.deedpro.cjs'));
    log('copied ESLint guard into ./eslint');

    console.log('[apply-v4] Complete.');
