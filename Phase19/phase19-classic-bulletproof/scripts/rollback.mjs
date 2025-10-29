import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';

const ROOT = process.cwd();
const OPS_LOG = path.join(ROOT, 'phase19_ops.log.json');

function log(...args) { console.log(chalk.cyan('[p19:rollback]'), ...args); }

async function main() {
  let ops;
  try {
    ops = JSON.parse(await fs.readFile(OPS_LOG, 'utf8'));
  } catch {
    console.error('No ops log found:', OPS_LOG);
    process.exit(2);
  }
  const restores = [];

  for (const section of ['writes', 'templatesUpdated', 'patches']) {
    for (const op of ops[section] || []) {
      if (op.backupPath) {
        const target = op.target || op.file;
        if (!target) continue;
        const backup = op.backupPath;
        log('restore', backup, '->', target);
        const txt = await fs.readFile(backup, 'utf8');
        await fs.writeFile(target, txt, 'utf8');
        restores.push(target);
      }
    }
  }

  log('restored', restores.length, 'files.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
