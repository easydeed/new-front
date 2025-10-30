\
    #!/usr/bin/env node
    /**
     * Phase 17 — All Deed Types (Bulletproof v1): verify script
     * - Confirms requested_by in backend models
     * - Confirms PDF templates contain requested_by header
     * - Confirms adapters reference requestedBy (best‑effort)
     * - Optionally runs `npm run -s build` when BUILD_CHECK=1
     */
    import fs from 'fs'; import path from 'path'; import child_process from 'child_process';
    const repo = process.argv[2] || '.';
    const ok = (m)=>console.log('[phase17/verify] ✅', m);
    const warn = (m)=>console.warn('[phase17/verify] ⚠️ ', m);
    const bad = (m)=>{ console.error('[phase17/verify] ❌', m); process.exitCode = 1; };
    const has = p => fs.existsSync(p);
    const read = p => fs.readFileSync(p, 'utf8');

    const models = [
      'backend/models/quitclaim_deed.py',
      'backend/models/interspousal_transfer.py',
      'backend/models/warranty_deed.py',
      'backend/models/tax_deed.py',
    ];
    let modelChecked = 0;
    models.forEach(p => {
      if (!has(path.join(repo, p))) { warn('Missing model (ok if not in repo): ' + p); return; }
      const s = read(path.join(repo, p));
      if (/requested_by\s*:\s*Optional\[?str\]?/i.test(s)) ok('Model includes requested_by: ' + p);
      else bad('Model missing requested_by: ' + p);
      modelChecked++;
    });
    if (!modelChecked) warn('No deed models found — verify paths/layout.');

    const templates = [
      'templates/quitclaim_deed_ca/index.jinja2',
      'templates/quitclaim_deed_ca/index.html',
      'templates/interspousal_transfer_ca/index.jinja2',
      'templates/interspousal_transfer_ca/index.html',
      'templates/warranty_deed_ca/index.jinja2',
      'templates/warranty_deed_ca/index.html',
      'templates/tax_deed_ca/index.jinja2',
      'templates/tax_deed_ca/index.html',
    ];
    let tplChecked = 0;
    templates.forEach(p => {
      const full = path.join(repo, p);
      if (!has(full)) { warn('Missing template (ok if named differently): ' + p); return; }
      const s = read(full);
      if (/RECORDING REQUESTED BY:/i.test(s) && /requested_by/.test(s)) ok('Template header OK: ' + p);
      else bad('Template header missing or not using requested_by: ' + p);
      tplChecked++;
    });
    if (!tplChecked) warn('No templates found — verify paths/layout.');

    // Adapters (best effort): check at least one reference
    const adapterTargets = [
      'frontend/src/utils/canonicalAdapters/quitclaim.ts',
      'frontend/src/utils/canonicalAdapters/interspousal.ts',
      'frontend/src/utils/canonicalAdapters/warranty.ts',
      'frontend/src/utils/canonicalAdapters/taxDeed.ts',
    ];
    let adapterFound = 0;
    adapterTargets.forEach(p => {
      const full = path.join(repo, p);
      if (!has(full)) { warn('Missing adapter (ok if different layout): ' + p); return; }
      const s = read(full);
      if (/requestedBy/.test(s)) ok('Adapter references requestedBy: ' + p);
      else warn('Adapter missing requestedBy path (flow may be handled globally): ' + p);
      adapterFound++;
    });

    if (process.env.BUILD_CHECK === '1') {
      try {
        console.log('[phase17/verify] Running `npm run -s build` …');
        child_process.execSync('npm run -s build', { cwd: repo, stdio: 'inherit' });
        ok('Build succeeded');
      } catch (e) {
        bad('Build failed — check output above');
      }
    }

    if (process.exitCode) {
      console.error('[phase17/verify] One or more checks failed.');
      process.exit(1);
    } else {
      console.log('[phase17/verify] All checks completed.');
    }
