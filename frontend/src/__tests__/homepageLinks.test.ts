/**
 * HM1 — the homepage is functional: every href resolves, every CTA goes
 * somewhere real, and the dead-promise set can't return.
 *
 * The audit found every primary CTA dead, /register unreachable by UI,
 * 10 of 12 footer links 404ing, and the "2-min demo" iframe pointing at
 * a placeholder video. This walker extracts every href on the homepage
 * (page.tsx + StickyNav) and asserts each resolves to a real app route,
 * an in-page anchor that exists, or an allowed external scheme.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.join(__dirname, '..', 'app');

const PAGE = fs.readFileSync(path.join(APP_DIR, 'page.tsx'), 'utf8');
const NAV = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'landing-v2', 'StickyNav.tsx'),
  'utf8'
);
const ALL = PAGE + NAV;

function extractHrefs(src: string): string[] {
  const out: string[] = [];
  const re = /href=(?:"([^"]+)"|\{`([^`]+)`\}|\{"([^"]+)"\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

function routeExists(href: string): boolean {
  const clean = href.split('?')[0].split('#')[0];
  if (!clean || clean === '/') return true;
  const segments = clean.replace(/^\//, '').split('/');
  return fs.existsSync(path.join(APP_DIR, ...segments, 'page.tsx'));
}

describe('HM1 — every homepage href resolves', () => {
  const hrefs = extractHrefs(ALL);

  it('found a plausible number of links (extractor sanity)', () => {
    expect(hrefs.length).toBeGreaterThan(8);
  });

  it('every internal path resolves to a real route', () => {
    const broken = hrefs
      .filter((h) => h.startsWith('/'))
      .filter((h) => !routeExists(h));
    expect(broken).toEqual([]);
  });

  it('every in-page anchor has a matching section id', () => {
    const missing = hrefs
      .filter((h) => h.startsWith('#'))
      .filter((h) => !PAGE.includes(`id="${h.slice(1)}"`));
    expect(missing).toEqual([]);
  });

  it('only safe schemes appear', () => {
    const weird = hrefs.filter(
      (h) => !h.startsWith('/') && !h.startsWith('#') && !h.startsWith('mailto:') && !h.startsWith('${') && !h.includes('CONTACT_SALES_EMAIL')
    );
    expect(weird).toEqual([]);
  });
});

describe('HM1 — the conversion path exists', () => {
  it('the nav has Login and Start Free as real links', () => {
    expect(NAV).toContain('href="/login"');
    expect(NAV).toContain('href="/register"');
  });

  it('the hero and pricing CTAs route to /register', () => {
    expect((PAGE.match(/href="\/register"/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('HM1 — dead promises stay dead', () => {
  it('no Watch Demo button, no placeholder video section', () => {
    expect(ALL).not.toContain('Watch 2‑min Demo');
    expect(PAGE).not.toContain('VideoPlayer');
    expect(PAGE).not.toContain('id="video"');
    // The placeholder "demo" iframe (a rickroll) can never return.
    expect(
      fs.existsSync(path.join(__dirname, '..', 'components', 'landing-v2', 'VideoPlayer.tsx'))
    ).toBe(false);
  });

  it('the audited 404 links are gone', () => {
    for (const dead of ['"/api"', '"/integrations"', '"/about"', '"/blog"', '"/careers"', '"/cookies"', '"/contact"']) {
      expect(ALL).not.toContain(`href=${dead}`);
    }
  });

  it('the footer no longer links the internal /security page', () => {
    expect(ALL).not.toContain('href="/security"');
  });

  it('Contact Sales is owner-gated — hidden until an address exists', () => {
    expect(PAGE).toContain('CONTACT_SALES_EMAIL');
    expect(PAGE).toContain('Contact information coming soon');
  });
});

describe('HM3 — legal scaffolds are real routes marked DRAFT', () => {
  for (const route of ['terms', 'privacy']) {
    it(`/${route} exists and is clearly a draft pending counsel`, () => {
      const src = fs.readFileSync(path.join(APP_DIR, route, 'page.tsx'), 'utf8');
      expect(src).toContain('DRAFT');
      expect(src).toContain('counsel');
    });
  }
});
