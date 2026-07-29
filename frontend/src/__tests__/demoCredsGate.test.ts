/**
 * Demo credentials — never in source; visibility is env-controlled.
 *
 * History: committed constants shipped always-visible (#48/#55); the
 * round-2 audit found them in the production bundle; X0 removed them
 * from source and dev-gated the card. Owner decision 2026-07-29: the
 * card SHOWS pre-launch — so the gate is now env-presence (set the
 * NEXT_PUBLIC_DEMO_* vars on Vercel to show it, delete them at launch
 * to remove it). What can never change: no credential value in git.
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

  it('the card renders only when both env values exist', () => {
    expect(LOGIN).toContain('const SHOW_DEMO_CARD = !!DEMO_EMAIL && !!DEMO_PASSWORD');
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
