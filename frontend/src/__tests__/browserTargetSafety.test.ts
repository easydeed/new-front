import fs from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

const frontend = path.resolve(__dirname, '../..');
const command = 'node --test scripts/browser-target-safety.check.cjs';

describe('browser safety check remains a maintained blocking instrument', () => {
  it('runs the real Node check before Jest without conditional or advisory execution', () => {
    // Read YAML deliberately, not JavaScript source; only actual run lines count.
    const workflow = fs.readFileSync(path.join(frontend, '../.github/workflows/test.yml'), 'utf8');
    const job = workflow.split('\n  frontend-tests:')[1].split('\n  production-dependency-audit:')[0];
    const runs = job.split('\n').map(line => line.trim()).filter(line => line.startsWith('run:'));
    expect(runs).toContain(`run: ${command}`);
    expect(runs.indexOf(`run: ${command}`)).toBeLessThan(runs.indexOf('run: npx jest --ci'));
    expect(job).not.toMatch(/^\s*(?:continue-on-error|if):/m);
  });

  it('exposes exactly that check through the local package script', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(frontend, 'package.json'), 'utf8'));
    expect(manifest.scripts['test:browser-safety']).toBe(command);
  });
});
