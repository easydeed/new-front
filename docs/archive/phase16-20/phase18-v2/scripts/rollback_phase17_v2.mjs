#!/usr/bin/env node
// Phase 17 — rollback all *.bak.v17 files
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.argv[2] || '.');
function log(...a){ console.log('[phase17/rollback]', ...a); }

function walk(dir){
  let out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walk(full));
    else out.push(full);
  }
  return out;
}

function main(){
  const all = walk(ROOT);
  const backups = all.filter(p => /\.bak\.v17$/.test(p));
  for (const bak of backups){
    const orig = bak.replace(/\.bak\.v17$/, '');
    fs.copyFileSync(bak, orig);
    fs.unlinkSync(bak);
    log('restored', path.relative(ROOT, orig));
  }
  log('restored', backups.length, 'file(s).');
}

main();
