#!/usr/bin/env node
import fs from 'fs'; import path from 'path'; import child_process from 'child_process';

    const repo = process.argv[2] || '.';
    const runBuild = process.env.BUILD_CHECK === '1';
    const ok = (m)=>console.log('[v8.2/verify] ✅', m);
    const warn = (m)=>console.warn('[v8.2/verify] ⚠️ ', m);
    const bad = (m)=>{ console.error('[v8.2/verify] ❌', m); process.exitCode = 1; };

    function has(p){ return fs.existsSync(p); }
    function read(p){ return fs.readFileSync(p, 'utf8'); }

    // ModernEngine checks
    const me = path.join(repo, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (!has(me)) warn('ModernEngine.tsx not found');
    else {
      const s = read(me);
      if (!/__didHydrateLegal/.test(s)) bad('Missing one-shot legal hydration effect');
      else ok('One-shot legal hydration present');
      if (!/onFocus=\{\(\)\s*=>\s*\{\s*if\s*\(current\.field\s*===\s*"legalDescription"\)/.test(s)) warn('onFocus for legalDescription plain input not found (may already be in PrefillCombo path only)');
      else ok('Focus handler found on plain input');
      if (!/onBlur=\{\(\)\s*=>\s*\{\s*if\s*\(current\.field\s*===\s*"legalDescription"\)/.test(s)) warn('onBlur for legalDescription plain input not found');
      else ok('Blur handler found on plain input');
    }

    // Partners route
    const route = path.join(repo, 'frontend/src/app/api/partners/selectlist/route.ts');
    if (!has(route)) warn('partners route missing');
    else {
      const s = read(route);
      if (!/export\s+const\s+runtime\s*=\s*'nodejs'/.test(s)) bad("partners route must have runtime='nodejs'");
      else ok("partners route runtime='nodejs'");
      if (!/export\s+const\s+dynamic\s*=\s*'force-dynamic'/.test(s)) warn("partners route missing dynamic='force-dynamic' (optional)");
      else ok("partners route dynamic='force-dynamic'");
    }

    // PartnersContext
    const pc = path.join(repo, 'frontend/src/features/partners/PartnersContext.tsx');
    if (!has(pc)) warn('PartnersContext.tsx not found');
    else {
      const s = read(pc);
      if (!/\blabel:\s*_label\b/.test(s) && !/label:\s*it\.label/.test(s)) bad('Partners transform to label not found');
      else ok('Partners transform to label present');
      if (!/\[PARTNERS DIAG\]/.test(s)) warn('Partners diagnostics not found (optional)');
      else ok('Partners diagnostics present');
    }

    // finalizeDeed
    const fz = path.join(repo, 'frontend/src/lib/deeds/finalizeDeed.ts');
    if (!has(fz)) warn('finalizeDeed.ts not found');
    else {
      const s = read(fz);
      if (!/requested_by\s*:/.test(s)) bad('finalizeDeed: requested_by mapping missing');
      else ok('finalizeDeed: requested_by mapping found');
      if (!/Backend payload \(FULL\)/.test(s)) warn('finalizeDeed diagnostics not found (optional)');
      else ok('finalizeDeed diagnostics present');
    }

    if (runBuild) {
      try {
        console.log('[v8.2/verify] Running `npm run -s build` …');
        child_process.execSync('npm run -s build', { cwd: repo, stdio: 'inherit' });
        ok('Build succeeded');
      } catch (e) {
        bad('Build failed — see output above');
      }
    }

    if (process.exitCode) {
      console.error('[v8.2/verify] One or more checks failed.');
      process.exit(1);
    } else {
      console.log('[v8.2/verify] All checks passed.');
    }
