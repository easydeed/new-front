import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { fileExists, readJson, readText } from './utils.fs.mjs';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'p19.config.json');

function log(...args) { console.log(chalk.cyan('[p19:verify]'), ...args); }
function bad(...args) { console.error(chalk.red('[p19:verify]'), ...args); }

async function main() {
  const cfg = await readJson(CONFIG_PATH);
  let ok = true;

  // 1) route checks
  const routeDst = path.join(ROOT, cfg.partnersRoutePath);
  if (!(await fileExists(routeDst))) {
    bad('missing partners route:', cfg.partnersRoutePath);
    ok = false;
  } else {
    const txt = await readText(routeDst);
    const must = ['export const runtime = \'nodejs\'', 'export const dynamic = \'force-dynamic\'', 'PARTNERS_URL'];
    for (const m of must) {
      if (!txt.includes(m)) { bad('route missing token:', m, 'in', cfg.partnersRoutePath); ok = false; }
    }
  }

  // 2) PartnersInput + hook present
  for (const p of [cfg.partnersInputPath, cfg.usePartnersListHookPath]) {
    const full = path.join(ROOT, p);
    if (!(await fileExists(full))) { bad('missing file:', p); ok = false; }
  }

  // 3) templates contain header
  const patterns = Array.isArray(cfg.templatesGlob) ? cfg.templatesGlob : [cfg.templatesGlob];
  for (const pattern of patterns) {
    const files = await glob(pattern, { cwd: ROOT, dot: false, absolute: true });
    for (const file of files) {
      const html = await readText(file);
      if (!/RECORDING REQUESTED BY/i.test(html)) {
        bad('template missing header:', path.relative(ROOT, file));
        ok = false;
      }
    }
  }

  // 4) Prefill propagation presence (best-effort)
  for (const rel of cfg.prefillComboPaths || []) {
    const full = path.join(ROOT, rel);
    if (await fileExists(full)) {
      const txt = await readText(full);
      if (!/onChange\(newValue\)/.test(txt)) {
        bad('PrefillCombo may not propagate typed values:', rel);
        ok = false;
      }
    }
  }

  if (ok) log(chalk.green('All checks passed ✔'));
  else process.exit(2);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
