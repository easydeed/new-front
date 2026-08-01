/**
 * BRAND2 — the refined Stamped Page mark, pinned.
 *
 * Design source of record: the figma/ export (reference-only). Snapshot +
 * structure pins for the production component, the hard no-chrome
 * constraint attested, and the figma/ folder pinned as never-imported —
 * it must not become a live dependency by accident.
 */
import { describe, expect, it } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoLockup, LogoLockupDark, LogoMark } from '../components/brand/Logo';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

describe('BRAND2 — the refined mark', () => {
  it('full-size: page + fold + header line + two data lines + two-ring seal + hash-stamp dot', () => {
    const svg = renderToStaticMarkup(<LogoMark size={32} />);
    expect(svg).toContain('#7C4DFF');                     // the page
    expect(svg).toContain('#5B35D5');                     // the fold
    expect((svg.match(/<rect/g) || []).length).toBe(3);   // header + 2 data lines
    expect((svg.match(/<circle/g) || []).length).toBe(3); // two rings + center dot
    expect(svg).toContain('viewBox="0 0 64 80"');         // refined geometry
    expect(svg).toMatchSnapshot();
  });

  it('small-size optics (≤20px): two lines, single heavier ring, no dot', () => {
    const svg = renderToStaticMarkup(<LogoMark size={16} />);
    expect((svg.match(/<rect/g) || []).length).toBe(2);
    expect((svg.match(/<circle/g) || []).length).toBe(1);
    expect(svg).toContain('stroke-width="3.5"');
  });

  it('lockup: Plus Jakarta Sans 800, tight tracking, ink Deed + brand Pro', () => {
    const html = renderToStaticMarkup(<LogoLockup size={32} />);
    expect(html).toContain('Deed');
    expect(html).toContain('Pro');
    expect(html).toContain('#1F2B37');
    expect(html).toContain('#7C4DFF');
    expect(html).toContain('font-weight:800');
    expect(html).toContain('letter-spacing:-0.025em');
    expect(html).toMatchSnapshot();
  });

  it('dark lockup (refined): full-color mark, white Deed, Pro keeps brand', () => {
    const html = renderToStaticMarkup(<LogoLockupDark size={32} />);
    expect(html).toContain('#FFFFFF');
    expect(html).toContain('#7C4DFF');   // the mark AND "Pro" stay purple
    expect(html).toContain('#5B35D5');   // full-color mark: the fold renders
  });

  it('the wordmark face is self-hosted (next/font/local, committed woff2)', () => {
    const src = readSource('components', 'brand', 'Logo.tsx');
    expect(src).toContain("from 'next/font/local'");
    expect(src).toContain('PlusJakartaSans-ExtraBold-latin.woff2');
    expect(src).not.toContain('next/font/google');
    expect(
      fs.existsSync(path.join(__dirname, '..', 'components', 'brand', 'fonts', 'PlusJakartaSans-ExtraBold-latin.woff2'))
    ).toBe(true);
  });
});

describe('BRAND2 — the hard constraints', () => {
  it('the preview-to-PDF path never imports the logo', () => {
    for (const file of [
      ['components', 'builder', 'PreviewPanel.tsx'],
      ['features', 'builder', 'DeedBuilder.tsx'],
    ] as const) {
      const src = readSource(...file);
      expect(src).not.toContain('brand/Logo');
    }
  });

  it('nothing under figma/ is ever imported — it is a design reference, not a dependency', () => {
    // Sweep every app source file for an import/require reaching figma/.
    const hits = execSync(
      String.raw`grep -rlE "(from ['\"]|require\().*figma/" src --include='*.ts' --include='*.tsx' || true`,
      { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' }
    ).trim();
    expect(hits).toBe('');
  });

  it('the deployed surfaces use the component, not ad-hoc squares', () => {
    for (const file of [
      ['components', 'landing-v2', 'StickyNav.tsx'],
      ['components', 'Sidebar.tsx'],
      ['app', 'login', 'page.tsx'],
      ['app', 'register', 'page.tsx'],
      ['app', 'page.tsx'],
    ] as const) {
      expect(readSource(...file)).toContain('brand/Logo');
    }
  });
});
