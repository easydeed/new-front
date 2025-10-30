import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { backupWrite, ensureDir, fileExists, insertAfterBody, readJson, readText, writeText } from './utils.fs.mjs';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'p19.config.json');
const OPS_LOG = path.join(ROOT, 'phase19_ops.log.json');

function log(...args) { console.log(chalk.cyan('[p19]'), ...args); }
function warn(...args) { console.warn(chalk.yellow('[p19:warn]'), ...args); }

async function main() {
  const cfg = await readJson(CONFIG_PATH);
  const ops = { backups: [], writes: [], patches: [], templatesUpdated: [] };

  // 1) Partners proxy route
  const routeSrc = path.join(ROOT, 'src', 'frontend', 'route.ts');
  const routeDst = path.join(ROOT, cfg.partnersRoutePath);
  const routeContent = await readText(routeSrc);
  const a1 = await backupWrite(routeDst, routeContent, cfg.backupTag);
  ops.writes.push({ target: routeDst, ...a1 });
  log('partners route ->', routeDst, a1.wrote ? chalk.green('updated') : chalk.gray(a1.reason || 'no change'));
  if (a1.backupPath) ops.backups.push(a1.backupPath);

  // 2) PartnersInput.tsx
  const piSrc = path.join(ROOT, 'src', 'frontend', 'PartnersInput.tsx');
  const piDst = path.join(ROOT, cfg.partnersInputPath);
  const piContent = await readText(piSrc);
  const a2 = await backupWrite(piDst, piContent, cfg.backupTag);
  ops.writes.push({ target: piDst, ...a2 });
  log('PartnersInput ->', piDst, a2.wrote ? chalk.green('updated') : chalk.gray(a2.reason || 'no change'));
  if (a2.backupPath) ops.backups.push(a2.backupPath);

  // 3) usePartnersList.ts
  const hookSrc = path.join(ROOT, 'src', 'frontend', 'usePartnersList.ts');
  const hookDst = path.join(ROOT, cfg.usePartnersListHookPath);
  const hookContent = await readText(hookSrc);
  const a3 = await backupWrite(hookDst, hookContent, cfg.backupTag);
  ops.writes.push({ target: hookDst, ...a3 });
  log('usePartnersList ->', hookDst, a3.wrote ? chalk.green('updated') : chalk.gray(a3.reason || 'no change'));
  if (a3.backupPath) ops.backups.push(a3.backupPath);

  // 4) Template normalization
  const header = await readText(path.join(ROOT, 'src', 'template', 'header_snippet.html'));
  const patterns = Array.isArray(cfg.templatesGlob) ? cfg.templatesGlob : [cfg.templatesGlob];
  for (const pattern of patterns) {
    const files = await glob(pattern, { cwd: ROOT, dot: false, absolute: true });
    for (const file of files) {
      try {
        const html = await readText(file);
        if (/RECORDING REQUESTED BY/i.test(html)) continue;
        const injected = insertAfterBody(html, header);
        if (!injected) {
          warn('no <body> tag in template, skip:', file);
          continue;
        }
        const backupPath = `${file}.bak.${cfg.backupTag}`;
        await fs.writeFile(backupPath, html, 'utf8');
        await fs.writeFile(file, injected, 'utf8');
        ops.templatesUpdated.push({ file, backupPath });
        ops.backups.push(backupPath);
        log('template header inserted ->', file);
      } catch (e) {
        warn('template processing error:', file, e.message);
      }
    }
  }

  // 5) Optional PrefillCombo patch
  for (const rel of cfg.prefillComboPaths || []) {
    const full = path.join(ROOT, rel);
    if (!(await fileExists(full))) {
      warn('prefill file not found (ok):', rel);
      continue;
    }
    try {
      const txt = await readText(full);
      if (/onChange\(newValue\)/.test(txt)) {
        log('prefill already propagates typed value ->', rel);
        continue;
      }
      // naive patch: after setDraft(newValue); add onChange(newValue);
      const patched = txt.replace(/setDraft\(newValue\);/g, match => match + '\n          onChange(newValue);');
      if (patched === txt) {
        warn('prefill patch could not apply cleanly, please review manually ->', rel);
        continue;
      }
      const backupPath = `${full}.bak.${cfg.backupTag}`;
      await fs.writeFile(backupPath, txt, 'utf8');
      await fs.writeFile(full, patched, 'utf8');
      ops.patches.push({ file: full, backupPath });
      ops.backups.push(backupPath);
      log('prefill patched ->', rel);
    } catch (e) {
      warn('prefill patch error:', rel, e.message);
    }
  }

  await fs.writeFile(OPS_LOG, JSON.stringify(ops, null, 2), 'utf8');
  log('done. backups:', ops.backups.length, 'wrote:', ops.writes.length, 'templates updated:', ops.templatesUpdated.length);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
