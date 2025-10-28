#!/usr/bin/env node
// Phase 17 — Bulletproof v2 applier
// Safe model/template updates with backups, dry-run, and clear logs.

import fs from 'fs';
import path from 'path';

const DRY = !!process.env.DRY_RUN;
const STRICT = !!process.env.STRICT;
const ROOT = path.resolve(process.argv[2] || '.');

function log(...a){ console.log('[phase17/apply]', ...a); }
function warn(...a){ console.warn('[phase17/apply][WARN]', ...a); }
function err(...a){ console.error('[phase17/apply][ERROR]', ...a); }
function read(p){ return fs.readFileSync(p, 'utf8'); }
function write(p, s){ if(DRY){ log('DRY-WRITE', p); return; } fs.writeFileSync(p, s, 'utf8'); }
function exists(p){ try{ fs.statSync(p); return true; } catch{ return false; } }
function backup(p){
  const bak = p + '.bak.v17';
  if (!exists(bak)){
    if (!DRY) fs.copyFileSync(p, bak);
    log('backup ->', bak);
  }
}

function walk(dir){
  let out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walk(full));
    else out.push(full);
  }
  return out;
}

function findFiles(pred){
  return walk(ROOT).filter(pred);
}

function patchModel(file){
  let code = read(file);
  backup(file);

  // Already has requested_by?
  if (/requested_by\s*:\s*Optional\[?str\]?/i.test(code)){
    log('model ok (requested_by exists):', path.relative(ROOT, file));
    return;
  }

  // Ensure Optional import exists
  if (!/\bOptional\b/.test(code)){
    // Insert before first class definition
    if (/^from typing import/m.test(code)){
      // Add Optional to existing typing import
      code = code.replace(/from\s+typing\s+import\s+([^\n]+)/m, (m, grp) => {
        if (/\bOptional\b/.test(grp)) return m; // already
        return `from typing import ${grp}, Optional`;
      });
    } else {
      code = code.replace(/(^[\s\S]*?)(class\s+\w)/m, `$1from typing import Optional\n\n$2`);
    }
  }

  // Ensure Field import exists
  if (!/\bField\b/.test(code)){
    if (/from\s+pydantic\s+import\s+([^\n]+)/.test(code)){
      code = code.replace(/from\s+pydantic\s+import\s+([^\n]+)/, (m, grp) => {
        if (/\bField\b/.test(grp)) return m;
        return `from pydantic import ${grp}, Field`;
      });
    } else {
      // try to add a new import line near other pydantic imports
      code = `from pydantic import Field\n` + code;
    }
  }

  // Insert requested_by field inside the primary deed context/class
  // Heuristic: add to the first class whose name contains "Deed" or "Context"
  const classRe = /class\s+([A-Za-z_]\w*)(?:\([^)]*\))?\s*:\s*\n([\s\S]*?)(?=^class\s+|\Z)/gm;
  let replaced = false;
  code = code.replace(classRe, (match, cls, body) => {
    if (replaced) return match;
    if (!/Deed|Context/i.test(cls)) return match;

    if (/requested_by\s*:/.test(body)) {
      replaced = true;
      return match;
    }

    // Determine indentation level (assume 4 spaces)
    const indent = '    ';
    const lines = body.split('\n');

    // Find insertion point: last field-like line (foo: Type = ... or foo: Type)
    let insertAt = lines.length;
    for (let i = lines.length - 1; i >= 0; i--) {
      const L = lines[i];
      if (/^\s{4}[\w_]+\s*:\s*[\w\[\]\s\|\.]+/.test(L)) { insertAt = i + 1; break; }
      if (/^\s{4}def\s+/.test(L)) { insertAt = i; break; } // before methods
    }

    const fieldLine = `${indent}requested_by: Optional[str] = Field(default="", description="Recording requester")`;
    lines.splice(insertAt, 0, fieldLine);

    replaced = true;
    return `class ${cls}:\n` + lines.join('\n');
  });

  if (!replaced){
    warn('could not locate a Deed/Context class, appending field at EOF:', path.relative(ROOT, file));
    code += `\n\n# Phase17 v2 append (no class heuristic hit)\nrequested_by_fallback_hint = True\n`;
  }

  write(file, code);
  log('model patched:', path.relative(ROOT, file));
}

function ensureTemplateHeader(file){
  let code = read(file);
  backup(file);

  // If any variant exists (text or jinja variable), skip injection
  if (/RECORDING\s+REQUESTED\s+BY/i.test(code) || /\{\{\s*requested_by\s*(?:\|\||or)\s*/i.test(code)){
    // Normalize variants like ((requested_by or title_company) or "")
    code = code.replace(
      /\{\{\s*\(\s*requested_by\s+or\s+title_company\s*\)\s+or\s+""\s*\}\}/g,
      '{{ requested_by or title_company or "" }}'
    );
    write(file, code);
    log('template normalized (already had header):', path.relative(ROOT, file));
    return;
  }

  // Find <body> insertion point
  const bodyMatch = code.match(/<body[^>]*>/i);
  if (!bodyMatch){
    const msg = 'no <body> tag — skipping to avoid corrupting template';
    if (STRICT) { throw new Error(`[STRICT] ${msg}: ${file}`); }
    warn(msg + ': ' + path.relative(ROOT, file));
    return;
  }
  const insertPoint = bodyMatch.index + bodyMatch[0].length;

  const block = `
<div class="box" style="width:3.25in;">
  <div><strong>RECORDING REQUESTED BY:</strong> {{ requested_by or title_company or "" }}</div>
  <div style="margin-top:.18in;"><strong>AND WHEN RECORDED MAIL TO:</strong></div>
  {% if return_to %}
    <div>{{ return_to.name }}</div>
    <div>{{ return_to.address1 }}</div>
    {% if return_to.address2 %}<div>{{ return_to.address2 }}</div>{% endif %}
    <div>{{ return_to.city }}, {{ return_to.state }} {{ return_to.zip }}</div>
  {% endif %}
</div>
`;
  code = code.slice(0, insertPoint) + '\n' + block + code.slice(insertPoint);
  write(file, code);
  log('template injected header:', path.relative(ROOT, file));
}

function main(){
  log('root:', ROOT);
  const all = walk(ROOT);

  // Target backend models (non-grant variants)
  const modelTargets = all.filter(p =>
    /backend[\/\\].*models[\/\\].*\.(py)$/.test(p) &&
    /(quitclaim|interspousal|warranty|tax)/i.test(p)
  );

  // Target templates
  const templateTargets = all.filter(p =>
    /templates[\/\\].*(quitclaim|interspousal|warranty|tax).*\/index\.(jinja2|html)$/i.test(p)
  );

  if (modelTargets.length === 0) warn('no backend models matched');
  if (templateTargets.length === 0) warn('no templates matched');

  for (const m of modelTargets) {
    try { patchModel(m); } catch(e){ err('model patch failed:', m, e.message); }
  }

  for (const t of templateTargets) {
    try { ensureTemplateHeader(t); } catch(e){ err('template patch failed:', t, e.message); }
  }

  log('done.');
}

main();
