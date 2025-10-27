    #!/usr/bin/env node
    import fs from 'fs';
    import path from 'path';
    import { fileURLToPath } from 'url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const repoRoot = process.argv[2] || '.';
    const base = path.join(__dirname, '..');

    const log = (...a) => console.log('[apply-canonical-v6]', ...a);
    const read = p => fs.readFileSync(p, 'utf8');
    const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); log('wrote', path.relative(process.cwd(), p)); };
    const exists = p => fs.existsSync(p);

    // 0) Copy canonical v6 finalize and canonical adapter
    const copies = [
      ['files/frontend/src/lib/deeds/finalizeDeed.ts', 'frontend/src/lib/deeds/finalizeDeed.ts'],
      ['files/frontend/src/lib/canonical/toCanonicalFor.ts', 'frontend/src/lib/canonical/toCanonicalFor.ts'],
      ['files/frontend/src/lib/preview/guard.ts', 'frontend/src/lib/preview/guard.ts'],
    ];
    for (const [srcRel, dstRel] of copies) {
      const src = path.join(base, srcRel);
      const dst = path.join(repoRoot, dstRel);
      write(dst, read(src));
    }

    // 1) Re-export consolidate finalizeDeed
    const svc = path.join(repoRoot, 'frontend/src/services/finalizeDeed.ts');
    write(svc, "export { finalizeDeed } from '@/lib/deeds/finalizeDeed';\n");
    const brg = path.join(repoRoot, 'frontend/src/features/wizard/mode/bridge/finalizeDeed.ts');
    write(brg, "export { finalizeDeed } from '@/lib/deeds/finalizeDeed';\n");

    // 2) ModernEngine patch
    const me = path.join(repoRoot, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (!exists(me)) {
      log('WARNING: ModernEngine.tsx not found at expected path:', path.relative(process.cwd(), me));
    } else {
      let code = read(me);

      // Ensure SmartReview import from review
      code = code.replace(/from\s+['"]\.\.\/components\/SmartReview['"]/g, "from '../review/SmartReview'");
      code = code.replace(/from\s+['"]\.\.\/engines\/steps\/SmartReview['"]/g, "from '../review/SmartReview'");
      if (!/from\s+['"]\.\.\/review\/SmartReview['"]/.test(code) && code.includes('SmartReview')) {
        code = code.replace(/(import[^\n]+;\s*)/, "$1\nimport SmartReview from '../review/SmartReview';\n");
      }

      // Ensure canonical + finalize imports
      if (!/from\s+['"]@\/lib\/canonical\/toCanonicalFor['"]/.test(code)) {
        code = code.replace(/(import[^\n]+;\s*)$/, "$1\nimport { toCanonicalFor } from '@/lib/canonical/toCanonicalFor';\n");
      }
      if (!/from\s+['"]@\/lib\/deeds\/finalizeDeed['"]/.test(code)) {
        code = code.replace(/(import[^\n]+;\s*)$/, "$1\nimport { finalizeDeed } from '@/lib/deeds/finalizeDeed';\n");
      }

      // Ensure useEffect/useRef/useCallback imports
      code = code.replace(/import\s+([^;]+)from\s+['"]react['"];?/, (m, imp) => {
        if (imp.includes('{')) {
          let newImp = imp;
          ['useEffect','useRef','useCallback'].forEach(n => {
            if (!newImp.includes(n)) newImp = newImp.replace('{', `{ ${n}, `);
          });
          return `import ${newImp}from 'react';`;
        } else {
          return `import { useEffect, useRef, useCallback } from 'react';\n` + m;
        }
      });

      // Insert onNext ref-safe bridge & useCallback with deps
      if (!/onNextRef\s*=\s*useRef/.test(code)) {
        const openFn = /(export\s+default\s+function\s+ModernEngine[^\{]*\{)/;
        if (openFn.test(code)) {
          code = code.replace(openFn, (m) => m + `
  // Keep latest onNext to avoid stale closures for DOM event fallback
  const onNextRef = useRef(() => {} as unknown as () => void);
`);
        }
      }
      // Normalize onNext: wrap with useCallback and call finalizeDeed(canonical,{docType,state,mode})
      code = code.replace(/const\s+onNext\s*=\s*async\s*\([^\)]*\)\s*=>\s*\{([\s\S]*?)\n\s*\};/, (m, body) => {
        const wrapped = `const onNext = useCallback(async () => {
${body}
}, [state, docType, mode, i, total]);`;
        return wrapped;
      });

      // After onNext definition, ensure fallback bridge and SmartReview onConfirm
      if (!/smartreview:confirm/.test(code)) {
        code = code.replace(/const\s+onNext\s*=\s*useCallback\([\s\S]*?\);/, (m) => m + `

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    const handler = () => { try { onNextRef.current?.(); } catch (e) { console.error('[ModernEngine] finalize failed', e); } };
    window.addEventListener('smartreview:confirm', handler);
    return () => window.removeEventListener('smartreview:confirm', handler);
  }, []);
`);
      }

      // Ensure final step calls canonical+finalize with opts and redirects
      code = code.replace(/\}\s*else\s*\{([\s\S]*?)\}/, (m, inner) => {
        // Replace finalization block content
        const finalBlock = `} else {
    console.log('[ModernEngine.onNext] 🟢 FINAL STEP - Starting finalization');
    const canonical = toCanonicalFor(docType, state);
    console.log('[ModernEngine.onNext] 🟢 Canonical payload created:', canonical);
    try {
      const result = await finalizeDeed(canonical, { docType, state, mode });
      if (result.success) {
        if (typeof window !== 'undefined') {
          window.location.href = \`/deeds/\${result.deedId}/preview?mode=\${mode}\`;
        }
      } else {
        alert('We could not finalize the deed. Please review and try again.');
      }
    } catch (e) {
      console.error('Finalize failed', e);
      alert('We could not finalize the deed. Please try again.');
    }
  }`;
        return finalBlock;
      });

      // Ensure SmartReview receives onConfirm={onNext}
      code = code.replace(/<SmartReview(\s+[^>]*)?>/g, (m) => /onConfirm=\{onNext\}/.test(m) ? m : m.replace(/>$/, ' onConfirm={onNext}>'));

      write(me, code);
    }

    // 3) SmartReview: overwrite ONLY if any forbidden side-effects are present
    function neuterIfSideEffects(p) {
      if (!exists(p)) return;
      const s = read(p);
      if (/fetch\(\s*['"]\/?api\/deeds/.test(s) || /window\.location\.href.*deeds/.test(s)) {
        write(p, read(path.join(base, 'files/frontend/src/features/wizard/mode/review/SmartReview.tsx')));
        log('Overwrote SmartReview with presentational-only version due to side effects:', path.relative(process.cwd(), p));
      }
    }
    neuterIfSideEffects(path.join(repoRoot, 'frontend/src/features/wizard/mode/review/SmartReview.tsx'));
    neuterIfSideEffects(path.join(repoRoot, 'frontend/src/features/wizard/mode/components/SmartReview.tsx'));
    neuterIfSideEffects(path.join(repoRoot, 'frontend/src/features/wizard/mode/engines/steps/SmartReview.tsx'));

    // 4) Fix promptFlows legalDescription showIf
    const pf = path.join(repoRoot, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
    if (exists(pf)) {
      let code = read(pf);
      const re = /(id:\s*['"]legalDescription['"][\s\S]*?showIf:\s*\(state[\s\S]*?\)\s*=>\s*)([^,\n]+)(,?)/m;
      if (re.test(code)) {
        code = code.replace(re, (m, head, cond, tail) => {
          const fn = `(state: any) => { const legal = (state?.legalDescription || '').toString(); const ok = legal.trim() !== '' && legal !== 'Not available'; return !ok; }`;
          return head + fn + (tail || '');
        });
        write(pf, code);
      } else {
        log('NOTE: Could not patch legalDescription showIf (pattern not found). Please update manually.');
      }
    } else {
      log('NOTE: promptFlows.ts not found; skipping legalDescription showIf patch.');
    }

    // 5) Preview guard: validate-before-generate
    const previewPage = path.join(repoRoot, 'frontend/src/app/deeds/[id]/preview/page.tsx');
    if (exists(previewPage)) {
      let code = read(previewPage);
      if (!code.includes("validateDeedCompleteness") || !code.includes("generateWithRetry")) {
        // add imports
        if (!/@\/lib\/preview\/guard/.test(code)) {
          code = code.replace(/(import[^\n]+;\s*)/, "$1\nimport { validateDeedCompleteness, generateWithRetry } from '@/lib/preview/guard';\n");
        }
        // naive insertion: guard before generate calls
        if (!/validateDeedCompleteness\(/.test(code)) {
          code = code.replace(/(async\s+function\s+[^\(]+\([^\)]*\)\s*\{)/, (m) => m + `
  // Canonical V6: validate deed before any PDF generation
  try {
    const id = (params?.id || searchParams?.id || '').toString();
    const r = await fetch('/api/deeds/' + id, { method: 'GET' });
    const deed = r.ok ? await r.json() : null;
    const errs = validateDeedCompleteness(deed);
    if (errs.length) {
      console.warn('[PreviewGuard] Blocking generate due to validation errors', errs);
      // TODO: surface in UI and link back to edit
      return null;
    }
  } catch (e) { console.warn('[PreviewGuard] Pre-validation skipped due to error', e); }
`);
        }
        // rewrite direct generate fetches
        code = code.replace(/await\s+fetch\(([^\)]*\/api\/generate[^\)]*)\)/g, "await generateWithRetry($1)");
        write(previewPage, code);
      }
    } else {
      log('NOTE: Preview page not found; skipping preview guard patch.');
    }

    console.log('[apply-canonical-v6] Complete.');
