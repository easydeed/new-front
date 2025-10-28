#!/usr/bin/env node
// Phase 17 — report adapters (and optional conservative patch)
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.argv[2] || '.');
const AUTO = !!process.env.AUTO_ADAPT;

function log(...a){ console.log('[phase17/report-adapters]', ...a); }
function warn(...a){ console.warn('[phase17/report-adapters][WARN]', ...a); }
function read(p){ return fs.readFileSync(p, 'utf8'); }
function write(p,s){ fs.writeFileSync(p,s,'utf8'); }

function walk(dir){
  let out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(ROOT).filter(p =>
  /frontend[\/\\]src[\/\\].*canonicalAdapters.*\.(ts|tsx)$/i.test(p) &&
  /(quitclaim|interspousal|warranty|tax|deed)/i.test(p)
);

const snippet = `// Phase17 v2 — ensure requestedBy flows through
requestedBy: canonical?.requestedBy ?? opts?.state?.requestedBy ?? '',`;

for (const f of files){
  const code = read(f);
  const short = path.relative(ROOT, f);
  const has = /\brequestedBy\b/.test(code) || /\brequested_by\b/.test(code);
  if (has){ log('ok:', short); continue; }
  warn('missing requestedBy mapping:', short);
  console.log('  Suggested patch near the adapter payload object:');
  console.log('  ' + snippet);

  if (AUTO){
    // Attempt very conservative patch: only if a finalize function is clearly present
    const m = code.match(/export\s+async\s+function\s+finalize\w+\s*\([\s\S]*?\)\s*\{[\s\S]*?\n\s*const\s+payload\s*=\s*\{[\s\S]*?\n\s*\};/m);
    if (m){
      const upd = code.replace(/(const\s+payload\s*=\s*\{)/m, `$1\n  ${snippet}`);
      write(f, upd);
      log('auto-adapt inserted snippet in:', short);
    } else {
      warn('auto-adapt skipped (no clear finalize payload block):', short);
    }
  }
}

log('report done.');
