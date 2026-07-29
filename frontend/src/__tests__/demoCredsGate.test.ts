/**
 * X0 (security hotfix) — demo credentials can never render outside local
 * dev, and never exist in source at all.
 *
 * History this pins against: the demo card shipped always-visible with
 * committed credential constants (#48/#55, a deliberate convenience
 * decision) and the round-2 security audit found the real credentials in
 * the production login bundle. Reversed: values come only from untracked
 * env (.env.local), and the card renders only when the build-time-inlined
 * NODE_ENV is 'development' — production builds eliminate the branch.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const LOGIN = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'login', 'page.tsx'),
  'utf8'
);

describe('X0 — demo credentials gate', () => {
  it('no credential literal exists in source — values come from env only', () => {
    expect(LOGIN).not.toMatch(/DEMO_EMAIL\s*=\s*["'][^"']+["']/);
    expect(LOGIN).not.toMatch(/DEMO_PASSWORD\s*=\s*["'][^"']+["']/);
    expect(LOGIN).not.toMatch(/@gmail\.com/);
    expect(LOGIN).toContain('process.env.NEXT_PUBLIC_DEMO_EMAIL');
    expect(LOGIN).toContain('process.env.NEXT_PUBLIC_DEMO_PASSWORD');
  });

  it('the card is gated on development NODE_ENV, checked at build time', () => {
    expect(LOGIN).toMatch(/process\.env\.NODE_ENV === ["']development["']/);
    expect(LOGIN).toContain('{SHOW_DEMO_CARD && (');
  });

  it('the demo block cannot render unconditionally again', () => {
    // The pre-X0 marker comment ("always shown") must not return, and the
    // card markup must sit inside the gate.
    expect(LOGIN).not.toContain('always shown');
    const gate = LOGIN.indexOf('{SHOW_DEMO_CARD && (');
    const card = LOGIN.indexOf('Demo credentials</span>');
    expect(gate).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(gate);
  });

  it('no demo-credential literal assignment exists anywhere in frontend source', () => {
    // Structural scan (never embeds a secret in this file): any
    // DEMO_EMAIL/DEMO_PASSWORD assigned from a string literal, anywhere,
    // is a violation — values may only come from env.
    const root = path.join(__dirname, '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(entry.name) && !p.endsWith('demoCredsGate.test.ts')) {
          const src = fs.readFileSync(p, 'utf8');
          if (/DEMO_(EMAIL|PASSWORD)\s*=\s*["'][^"']+["']/.test(src)) {
            offenders.push(p);
          }
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
