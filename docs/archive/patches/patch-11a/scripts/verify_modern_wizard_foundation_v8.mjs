import fs from 'fs'; import path from 'path'; import child_process from 'child_process';

    const repo = process.argv[2] || '.';
    const runBuild = process.env.BUILD_CHECK === '1';
    const ok = (m)=>console.log('[verify-foundation-v8] ✅', m);
    const warn = (m)=>console.warn('[verify-foundation-v8] ⚠️ ', m);
    const bad = (m)=>{ console.error('[verify-foundation-v8] ❌', m); process.exitCode = 1; };

    function has(p){ return fs.existsSync(p); }
    function read(p){ return fs.readFileSync(p, 'utf8'); }

    const pf = path.join(repo, 'frontend/src/features/wizard/mode/prompts/promptFlows.ts');
    if (!has(pf)) warn('promptFlows.ts not found (legal showIf patch may be manual)');
    else {
      const s = read(pf);
      if (!/import\s*\{\s*shouldShowLegal\s*\}\s*from\s*'@\/lib\/wizard\/legalShowIf'/.test(s)) bad('Missing import shouldShowLegal from legalShowIf');
      if (!/showIf:\s*\(state[^)]*\)\s*=>\s*shouldShowLegal\(state\)/.test(s)) bad('legalDescription.showIf is not shouldShowLegal(state)');
      else ok('legalDescription.showIf uses shouldShowLegal(state)');
    }

    const me = path.join(repo, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (!has(me)) warn('ModernEngine.tsx not found');
    else {
      const s = read(me);
      if (/from\s+['"]\.\.\/components\/SmartReview['"]/.test(s)) bad('ModernEngine still imports ../components/SmartReview (should be ../review/SmartReview)');
      else ok('SmartReview import normalized');

      if (!/from\s+['"]@\/lib\/deeds\/finalizeDeed['"]/.test(s) && /finalizeDeed/.test(s)) warn('ModernEngine may import finalizeDeed from a non-canonical path');
      else ok('finalizeDeed canonical import looks good');

      if (!/from\s+['"]@\/lib\/wizard\/invariants['"]/.test(s)) warn('invariants import not found (optional)');
      else ok('invariants import present');
    }

    const route = path.join(repo, 'frontend/src/app/api/partners/selectlist/route.ts');
    if (!has(route)) bad('Partners route missing');
    else {
      const s = read(route);
      if (!/export\s+const\s+runtime\s*=\s*'nodejs'/.test(s)) bad("Partners route must set runtime='nodejs'");
      else ok("Partners route uses runtime='nodejs'");
      if (!/export\s+const\s+dynamic\s*=\s*'force-dynamic'/.test(s)) warn("Partners route missing dynamic='force-dynamic' (optional)");
      else ok("Partners route dynamic='force-dynamic' present");
    }

    const legal = path.join(repo, 'frontend/src/lib/wizard/legalShowIf.ts');
    if (!has(legal)) bad('legalShowIf.ts missing');
    else {
      const s = read(legal);
      if (!/return\s+true\s*;/.test(s)) warn('legalShowIf.ts does not unconditionally return true (ensure Legal always shows)');
      else ok('legalShowIf.ts returns true (Legal step always visible)');
    }

    if (runBuild) {
      try {
        console.log('[verify-foundation-v8] Running `npm run -s build` …');
        require('child_process').execSync('npm run -s build', { cwd: repo, stdio: 'inherit' });
        ok('Build succeeded');
      } catch (e) {
        bad('Build failed — check output above');
      }
    }

    if (process.exitCode) {
      console.error('[verify-foundation-v8] One or more checks failed.');
      process.exit(1);
    } else {
      console.log('[verify-foundation-v8] All checks passed.');
    }
