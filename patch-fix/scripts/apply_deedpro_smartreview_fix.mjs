    #!/usr/bin/env node
    import fs from 'fs';
    import path from 'path';
    import { fileURLToPath } from 'url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const repoRoot = process.argv[2] || '.';
    const baseDir = path.join(__dirname, '..');

    const cp = (srcRel, dstRel) => {
      const src = path.join(baseDir, srcRel);
      const dst = path.join(repoRoot, dstRel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      console.log('[apply] wrote', path.relative(process.cwd(), dst));
    };

    cp('files/frontend/src/features/wizard/mode/review/SmartReview.tsx',
       'frontend/src/features/wizard/mode/review/SmartReview.tsx');
    cp('files/frontend/src/features/wizard/mode/components/SmartReview.tsx',
       'frontend/src/features/wizard/mode/components/SmartReview.tsx');
    cp('files/frontend/src/features/wizard/mode/engines/steps/SmartReview.tsx',
       'frontend/src/features/wizard/mode/engines/steps/SmartReview.tsx');

    const mePath = path.join(repoRoot, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (fs.existsSync(mePath)) {
      let code = fs.readFileSync(mePath, 'utf8');
      if (!code.includes('useEffect')) {
        code = `import { useEffect } from 'react';\n` + code;
      }
      if (!code.includes('smartreview:confirm')) {
        const fnOpen = /export\s+default\s+function\s+ModernEngine[^\{]*\{/;
        if (fnOpen.test(code)) {
          code = code.replace(fnOpen, (m) => m + `
  // Ensure ANY SmartReview variant routes through engine finalization.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handler = () => { try { onNext(); } catch (e) { console.error('[ModernEngine] onNext failed from smartreview:confirm', e); } };
    window.addEventListener('smartreview:confirm', handler);
    return () => window.removeEventListener('smartreview:confirm', handler);
  }, []);
`);
          fs.writeFileSync(mePath, code);
          console.log('[apply] patched ModernEngine.tsx');
        } else {
          console.log('[apply] WARNING: Could not find ModernEngine function; please paste the listener near the top of the component body.');
        }
      } else {
        console.log('[apply] ModernEngine already patched.');
      }
    } else {
      console.log('[apply] WARNING: ModernEngine.tsx not found at expected path.');
    }

    const fdPath = path.join(repoRoot, 'frontend/src/lib/deeds/finalizeDeed.ts');
    if (fs.existsSync(fdPath)) {
      let code = fs.readFileSync(fdPath, 'utf8');
      if (!/source\s*:\s*['"]modern['"]/.test(code)) {
        const vestingRe = /(vesting\s*:\s*payload\.vesting\?\.description\s*\|\|\s*null)/;
        if (vestingRe.test(code)) {
          code = code.replace(vestingRe, `$1,\n    source: 'modern'`);
        } else {
          // Fallback: append at end of object if needed
          code = code.replace(/backendPayload\s*=\s*\{([\s\S]*?)\}/, (m, inner) => `backendPayload = {${inner}\n    source: 'modern'\n}`);
        }
        fs.writeFileSync(fdPath, code);
        console.log('[apply] tagged finalizeDeed.ts payload with source: modern');
      } else {
        console.log('[apply] finalizeDeed.ts already tagged.');
      }
    } else {
      console.log('[apply] WARNING: finalizeDeed.ts not found at expected path.');
    }

    console.log('[apply] Done. Next: npm run typecheck && npm run build');
