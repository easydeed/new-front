/**
 * BRAND1 — the Stamped Page mark, pinned.
 *
 * Snapshot + structure pins for the logo component, and the hard
 * constraint attested: the mark is app/marketing chrome — the recorded-
 * instrument path never imports it (G2 no-chrome; the backend leak pins
 * separately forbid the brand hex in generated deed HTML).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoLockup, LogoLockupDark, LogoMark } from '../components/brand/Logo';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

describe('BRAND1 — the mark', () => {
  it('full-size mark: document + fold + three lines + two-ring seal', () => {
    const svg = renderToStaticMarkup(<LogoMark size={32} />);
    expect(svg).toContain('#7C4DFF');            // the page
    expect(svg).toContain('#5B35D5');            // the fold
    expect((svg.match(/<rect/g) || []).length).toBe(3);   // three text lines
    expect((svg.match(/<circle/g) || []).length).toBe(2); // two-ring seal
    expect(svg).toMatchSnapshot();
  });

  it('small-size optics (≤20px): two lines, single thicker ring', () => {
    const svg = renderToStaticMarkup(<LogoMark size={16} />);
    expect((svg.match(/<rect/g) || []).length).toBe(2);
    expect((svg.match(/<circle/g) || []).length).toBe(1);
  });

  it('lockup: two-tone wordmark — ink Deed, brand Pro', () => {
    const html = renderToStaticMarkup(<LogoLockup size={32} />);
    expect(html).toContain('Deed');
    expect(html).toContain('Pro');
    expect(html).toContain('#1F2B37');
    expect(html).toContain('#7C4DFF');
    expect(html).toMatchSnapshot();
  });

  it('dark lockup: one-color white', () => {
    const html = renderToStaticMarkup(<LogoLockupDark size={32} />);
    expect(html).toContain('DeedPro');
    expect(html).toContain('#FFFFFF');
  });
});

describe('BRAND1 — the hard constraint: no mark near recorded pages', () => {
  it('the preview-to-PDF path never imports the logo', () => {
    for (const file of [
      ['components', 'builder', 'PreviewPanel.tsx'],
      ['features', 'builder', 'DeedBuilder.tsx'],
    ] as const) {
      const src = readSource(...file);
      expect(src).not.toContain('brand/Logo');
    }
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
