import fs from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

function atLeast(value: string, floor: [number, number, number]): boolean {
  if (!/^\d+\.\d+\.\d+$/.test(value)) return false;
  const actual = value.split('.').map(Number);
  for (let i = 0; i < floor.length; i++) {
    if (actual[i] !== floor[i]) return actual[i] > floor[i];
  }
  return true;
}

// Historical security floors, not a claim that future advisories cannot
// affect these versions. Keep auditing the resolved tree as well.
// https://nextjs.org/blog/november-2026-security-release
// https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3
describe('platform dependency security regression', () => {
  it('keeps the approved Next 15 release line above the security floor', () => {
    expect(manifest.dependencies.next.startsWith('15.5.')).toBe(true);
    expect(atLeast(manifest.dependencies.next, [15, 5, 29])).toBe(true);
    expect(manifest.devDependencies['eslint-config-next']).toBe(manifest.dependencies.next);
    expect(lock.packages['node_modules/next'].version).toBe(manifest.dependencies.next);
    expect(lock.packages['node_modules/@next/env'].version).toBe(manifest.dependencies.next);
  });

  it('keeps React and React DOM on matching, patched exact versions', () => {
    expect(manifest.dependencies.react).toBe(manifest.dependencies['react-dom']);
    expect(atLeast(manifest.dependencies.react, [19, 1, 10])).toBe(true);
    for (const name of ['react', 'react-dom']) {
      expect(lock.packages[`node_modules/${name}`].version).toBe(manifest.dependencies[name]);
    }
  });

  it('does not keep a vulnerable image decoder underneath a patched framework', () => {
    // The Next optional dependency range also accepts the older sharp
    // line. A top-level framework bump alone must not leave it resolved.
    expect(atLeast(manifest.overrides.sharp, [0, 35, 5])).toBe(true);
    const decoders = Object.entries(lock.packages)
      .filter(([name]) => name.endsWith('/node_modules/sharp') || name === 'node_modules/sharp');
    expect(decoders.length).toBeGreaterThan(0);
    for (const [, entry] of decoders) {
      const version = (entry as { version: string }).version;
      expect(atLeast(version, [0, 35, 5])).toBe(true);
      expect(version).toBe(manifest.overrides.sharp);
    }
  });

  it('also patches the CSS processor behind the framework', () => {
    expect(atLeast(manifest.devDependencies.postcss, [8, 5, 23])).toBe(true);
    expect(manifest.overrides.postcss).toBe('$postcss');
    const processors = Object.entries(lock.packages)
      .filter(([name]) => name.endsWith('node_modules/postcss'));
    expect(processors.length).toBeGreaterThan(0);
    for (const [, entry] of processors) {
      expect(atLeast((entry as { version: string }).version, [8, 5, 23])).toBe(true);
    }
  });
});
