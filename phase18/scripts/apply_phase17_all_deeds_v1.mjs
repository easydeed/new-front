\
    #!/usr/bin/env node
    /**
     * Phase 17 — All Deed Types (Bulletproof v1): apply script
     * - Adds `requested_by` Optional[str] to backend deed models (idempotent).
     * - Ensures Jinja templates show `RECORDING REQUESTED BY: {{ requested_by or title_company or "" }}`.
     * - Best‑effort patch to adapters to pass `requestedBy` through.
     * Creates `.bak.v17` backups.
     */
    import fs from 'fs'; import path from 'path'; import child_process from 'child_process';

    const repo = process.argv[2] || '.';
    const log = (...a)=>console.log('[phase17/apply]', ...a);
    const exists = p => fs.existsSync(p);
    const read = p => fs.readFileSync(p, 'utf8');
    const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); log('wrote', path.relative(process.cwd(), p)); };
    const backup = p => { const bak = p + '.bak.v17'; if (!exists(bak)) fs.copyFileSync(p, bak); return bak; };

    function safePatchModel(file){
      if (!exists(file)) { log('skip (missing model):', file); return; }
      let code = read(file); backup(file);
      // Only add if not present
      if (!/requested_by\s*:\s*Optional\[?str\]?/i.test(code)){
        // Try to find first class block line after BaseModel fields
        if (!/from\s+typing\s+import\s+Optional/.test(code)) {
          code = code.replace(/from\s+pydantic\s+import\s+BaseModel.*\n/, (m)=> m + 'from typing import Optional\n');
        }
        if (!/from\s+pydantic\s+import\s+.*Field/.test(code)) {
          // add Field import (preserve existing import)
          code = code.replace(/from\s+pydantic\s+import\s+([^\n]+)\n/, (m,g)=>`from pydantic import ${g.includes('BaseModel')? 'BaseModel, ': ''}${g.replace('BaseModel, ','').replace('BaseModel','').trim()}${g.trim().endsWith(',')?'':' ,'}Field\n`);
          if (!/Field/.test(code)) {
            // fallback if no import match
            code = `from pydantic import BaseModel, Field\nfrom typing import Optional\n` + code;
          }
        }
        // Insert field near other simple fields (after county/apn/property_address if present)
        const reClass = /(class\s+\w+Deed\w*\s*\(\s*BaseModel\s*\)\s*:\s*\n(?:\s+[^\n]*\n)+)/m;
        if (reClass.test(code)){
          code = code.replace(reClass, (m)=>{
            if (m.includes('requested_by')) return m;
            const insertion = `    requested_by: Optional[str] = Field(default="", description="Recording requester")\n`;
            // place before end of class block (naive: append at end of class body)
            return m.replace(/\n(\s*)(?=[^ \t])/m, (g)=>`\n${insertion}\n`); // unlikely; fallback below
          });
          // If previous replace failed to insert (pattern edge case), append safely
          if (!/requested_by\s*:\s*Optional\[?str\]?/.test(code)) {
            code = code.replace(/(class\s+\w+Deed[^\n]+\n)/, (m)=> m + `    requested_by: Optional[str] = Field(default="", description="Recording requester")\n`);
          }
        } else {
          // fallback: append near top-level fields
          code += `\n# Phase17: additive field\nrequested_by: Optional[str] = Field(default="", description="Recording requester")\n`;
        }
      }
      write(file, code);
    }

    function ensureTemplateHeader(file){
      if (!exists(file)) { log('skip (missing template):', file); return; }
      let code = read(file); backup(file);
      if (!/RECORDING REQUESTED BY:/i.test(code)){
        // Inject a standard header block at top of file (after first <div class="box"> or header section)
        const block = `\
<div class="box" style="width:3.25in;">
  <div><strong>RECORDING REQUESTED BY:</strong> {{ requested_by or title_company or "" }}</div>
  <div style="margin-top:.18in;"><strong>AND WHEN RECORDED MAIL TO:</strong></div>
  {% if return_to %}
    <div>{{ return_to.name }}</div>
    <div>{{ return_to.address1 }}</div>
    {% if return_to.address2 %}<div>{{ return_to.address2 }}</div>{% endif %}
    <div>{{ return_to.city }}, {{ return_to.state }} {{ return_to.zip }}</div>
  {% endif %}
</div>\n`;
        // naive insert near start
        code = block + '\n' + code;
      } else {
        // Ensure it uses requested_by fallback order
        code = code.replace(/RECORDING REQUESTED BY:\s*\}\}.*\n/i, (m)=> `<strong>RECORDING REQUESTED BY:</strong> {{ requested_by or title_company or "" }}</div>\n`);
        // Also normalize legacy patterns like (requested_by or title_company) or ""
        code = code.replace(/\{\{\s*\(\s*requested_by\s*or\s*title_company\s*\)\s*or\s*""\s*\}\}/g, '{{ requested_by or title_company or "" }}');
      }
      write(file, code);
    }

    function bestEffortPatchAdapter(file){
      if (!exists(file)) { log('skip (missing adapter):', file); return; }
      let code = read(file); backup(file);
      // Ensure 'requestedBy' passthrough when building payload or canonical
      if (!/requestedBy/.test(code)){
        // Try to detect object literals and add requestedBy
        code = code.replace(/(\{\s*[\s\S]*?\})/, (m)=>{
          if (m.includes('requestedBy')) return m;
          const lines = m.split('\n');
          if (lines.length > 1){
            lines.splice(-1, 0, '  requestedBy: (canonical?.requestedBy ?? state?.requestedBy ?? ""),');
            return lines.join('\n');
          }
          return m;
        });
      }
      write(file, code);
    }

    // 1) Backend models
    [
      'backend/models/quitclaim_deed.py',
      'backend/models/interspousal_transfer.py',
      'backend/models/warranty_deed.py',
      'backend/models/tax_deed.py',
    ].forEach(safePatchModel);

    // 2) Templates
    const tCandidates = [
      'templates/quitclaim_deed_ca/index.jinja2',
      'templates/quitclaim_deed_ca/index.html',
      'templates/interspousal_transfer_ca/index.jinja2',
      'templates/interspousal_transfer_ca/index.html',
      'templates/warranty_deed_ca/index.jinja2',
      'templates/warranty_deed_ca/index.html',
      'templates/tax_deed_ca/index.jinja2',
      'templates/tax_deed_ca/index.html',
    ];
    tCandidates.forEach(ensureTemplateHeader);

    // 3) Frontend adapters (best‑effort)
    const aCandidates = [
      'frontend/src/utils/canonicalAdapters/quitclaim.ts',
      'frontend/src/utils/canonicalAdapters/interspousal.ts',
      'frontend/src/utils/canonicalAdapters/warranty.ts',
      'frontend/src/utils/canonicalAdapters/taxDeed.ts',
    ];
    // fallback globbing by walking a few common roots
    const extraRoots = [
      'frontend/src/features/wizard',
      'frontend/src/utils',
    ];
    aCandidates.forEach(bestEffortPatchAdapter);
    // Walk extra roots for files containing 'quitclaim'/'interspousal'/'warranty'/'tax' and 'adapter'
    function walk(dir){
      try{
        for (const entry of fs.readdirSync(path.join(repo, dir), { withFileTypes: true })) {
          const p = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(p);
          else if (/\.tsx?$/.test(p) && /(adapter|canonical)/i.test(p) && /(quitclaim|interspousal|warranty|tax)/i.test(p)) {
            bestEffortPatchAdapter(path.join(repo, p));
          }
        }
      } catch {}
    }
    extraRoots.forEach(walk);

    console.log('[phase17/apply] Done.');
