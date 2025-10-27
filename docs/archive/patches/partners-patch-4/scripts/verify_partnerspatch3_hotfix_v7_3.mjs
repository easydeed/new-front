import fs from 'fs'; import path from 'path'; import child_process from 'child_process';
    const repo = process.argv[2] || '.';
    const runBuild = process.env.BUILD_CHECK === '1';
    function ok(m){ console.log('[verify-hotfix-v7.3] ✅', m); }
    function warn(m){ console.warn('[verify-hotfix-v7.3] ⚠️ ', m); }
    function bad(m){ console.error('[verify-hotfix-v7.3] ❌', m); process.exitCode = 1; }

    const me = path.join(repo, 'frontend/src/features/wizard/mode/engines/ModernEngine.tsx');
    if (!fs.existsSync(me)) bad('ModernEngine.tsx not found');
    else {
      const s = fs.readFileSync(me, 'utf8');
      if (!/onChange=\{\(e\)\s*=>\s*onChange\(current\.field,\s*e\.target\.value\)\s*\}/.test(s))
        warn('Could not confirm standard onChange signature (repo variant?)');
      if (!/onFocus=\{\(\)\s*=>\s*\{\s*if\s*\(current\.field\s*===\s*"legalDescription"\)/.test(s))
        bad('onFocus handler for legalDescription not found on regular <input>');
      else ok('onFocus handler present');
      if (!/onBlur=\{\(\)\s*=>\s*\{\s*if\s*\(current\.field\s*===\s*"legalDescription"\)/.test(s))
        bad('onBlur handler for legalDescription not found on regular <input>');
      else ok('onBlur handler present');
    }

    const route = path.join(repo, 'frontend/src/app/api/partners/selectlist/route.ts');
    if (!fs.existsSync(route)) bad('partners selectlist route.ts not found');
    else {
      const s = fs.readFileSync(route, 'utf8');
      if (!/export\s+const\s+runtime\s*=\s*'nodejs'/.test(s)) bad("route.ts must export runtime = 'nodejs'");
      else ok("route.ts runtime set to 'nodejs'");
      if (!/export\s+const\s+dynamic\s*=\s*'force-dynamic'/.test(s)) warn("route.ts missing dynamic = 'force-dynamic' (optional)");
      else ok('route.ts dynamic = force-dynamic present');
    }

    if (runBuild) {
      try {
        console.log('[verify-hotfix-v7.3] Running `npm run -s build` …');
        child_process.execSync('npm run -s build', { cwd: repo, stdio: 'inherit' });
        ok('Build succeeded');
      } catch (e) {
        bad('Build failed — check errors above');
      }
    }

    if (process.exitCode) {
      console.error('[verify-hotfix-v7.3] One or more checks failed.');
      process.exit(1);
    } else {
      console.log('[verify-hotfix-v7.3] All checks passed.');
    }
