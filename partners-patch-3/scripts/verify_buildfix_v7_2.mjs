import fs from 'fs'; import path from 'path'; import child_process from 'child_process';

    const repoRoot = process.argv[2] || '.';
    const runBuild = process.env.BUILD_CHECK === '1';

    function ok(m){ console.log('[verify-buildfix-v7.2] ✅', m); }
    function warn(m){ console.warn('[verify-buildfix-v7.2] ⚠️ ', m); }
    function bad(m){ console.error('[verify-buildfix-v7.2] ❌', m); process.exitCode = 1; }

    const pf = path.join(repoRoot, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
    if (!fs.existsSync(pf)) bad('promptFlows.ts not found');
    else {
      const s = fs.readFileSync(pf, 'utf8');
      if (!s.includes(`import { shouldShowLegal } from '@/lib/wizard/legalShowIf';`)) bad('legalShowIf import missing');
      if (!/showIf:\s*\(state[^)]*\)\s*=>\s*shouldShowLegal\(state\)/.test(s)) bad('legalDescription.showIf not using shouldShowLegal(state)');
      else ok('promptFlows legalDescription.showIf looks correct');
      // quick syntax sanity: ensure no stray 'const ' immediately after showIf line (dup body)
      if (/showIf:[^\n]*shouldShowLegal\([^)]+\)[^\n]*\n\s*const\s+legal/.test(s)) bad('Residual inline showIf body detected after replacement');
    }

    const me = path.join(repoRoot, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (!fs.existsSync(me)) bad('ModernEngine.tsx not found');
    else {
      const s = fs.readFileSync(me, 'utf8');
      if (!/usePartners\(\)/.test(s)) warn('usePartners() not detected — ensure PartnersProvider wraps the page');
      if (!/partners=\{current\.field\s*===\s*'requestedBy'\s*\?\s*partners\s*:\s*\[\]\}/.test(s))
        warn('PrefillCombo may not receive partners — verify props around Requested By input');
      if (!/__editing_legal/.test(s)) bad('Missing __editing_legal focus/blur wiring for legalDescription');
      else ok('ModernEngine legal editing wiring present');
      // sanity: ensure no mangled onChange
      if (/onChange=\{\(v\)\s*=\s*partners=/.test(s)) bad('Detected mangled onChange prop near PrefillCombo');
      else ok('No mangled onChange detected');
    }

    if (runBuild) {
      try {
        console.log('[verify-buildfix-v7.2] Running `npm run -s build` (set BUILD_CHECK=1 to enable) …');
        child_process.execSync('npm run -s build', { cwd: repoRoot, stdio: 'inherit' });
        ok('Project build succeeded');
      } catch (e) {
        bad('Project build failed — see output above');
      }
    }

    if (process.exitCode) {
      console.error('[verify-buildfix-v7.2] One or more checks failed.');
      process.exit(1);
    } else {
      console.log('[verify-buildfix-v7.2] All checks passed.');
    }
