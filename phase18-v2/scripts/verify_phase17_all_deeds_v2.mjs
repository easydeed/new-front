#!/usr/bin/env node
// Phase 17 — Bulletproof v2 verifier
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(process.argv[2] || '.');
function log(...a){ console.log('[phase17/verify]', ...a); }
function warn(...a){ console.warn('[phase17/verify][WARN]', ...a); }

function walk(dir){
  let out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walk(full));
    else out.push(full);
  }
  return out;
}

function checkModels(files){
  let ok = true;
  for (const f of files){
    const code = fs.readFileSync(f, 'utf8');
    const hasField = /requested_by\s*:\s*Optional\[?str\]?/i.test(code);
    if (!hasField){ ok = false; warn('missing requested_by in model:', path.relative(ROOT, f)); }
  }
  return ok;
}

function checkTemplates(files){
  let ok = true;
  for (const f of files){
    const code = fs.readFileSync(f, 'utf8');
    const has = /RECORDING\s+REQUESTED\s+BY/i.test(code) || /\{\{\s*requested_by\s*(?:\|\||or)\s*/i.test(code);
    if (!has){ ok = false; warn('missing header in template:', path.relative(ROOT, f)); }
  }
  return ok;
}

function reportAdapters(files){
  let ok = true;
  for (const f of files){
    const code = fs.readFileSync(f, 'utf8');
    const mentions = /\brequestedBy\b/.test(code) || /\brequested_by\b/.test(code);
    if (!mentions){ ok = false; warn('adapter may not forward requestedBy:', path.relative(ROOT, f)); }
  }
  return ok;
}

function main(){
  log('root:', ROOT);
  const all = walk(ROOT);

  const modelTargets = all.filter(p =>
    /backend[\/\\].*models[\/\\].*\.(py)$/.test(p) &&
    /(quitclaim|interspousal|warranty|tax)/i.test(p)
  );

  const templateTargets = all.filter(p =>
    /templates[\/\\].*(quitclaim|interspousal|warranty|tax).*\/index\.(jinja2|html)$/i.test(p)
  );

  const adapterTargets = all.filter(p =>
    /frontend[\/\\]src[\/\\].*canonicalAdapters.*\.(ts|tsx)$/i.test(p) &&
    /(quitclaim|interspousal|warranty|tax|deed)/i.test(p)
  );

  const mOk = checkModels(modelTargets);
  const tOk = checkTemplates(templateTargets);
  const aOk = reportAdapters(adapterTargets);

  // Optional real build
  if (process.env.BUILD_CHECK){
    log('running: npm run -s build');
    const res = spawnSync(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run','-s','build'], { cwd: ROOT, stdio: 'inherit' });
    if (res.status !== 0){
      process.exitCode = 2;
      return;
    }
  }

  if (mOk && tOk){
    log('✓ models/templates look consistent.');
  }
  if (!aOk){
    warn('adapters need manual review (see adapters/manual_adapter_checklist.md).');
  }
  log('verify done.');
}

main();
