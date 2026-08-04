/**
 * ADMIN-BRAND — the console is a DeedPro surface, and its colors mean
 * what they mean everywhere else.
 *
 * Two separate problems, and the second is why this file checks a
 * mechanism rather than a palette:
 *
 * 1. The console's accent was `#F57C00` orange. It appears on no other
 *    DeedPro surface, and it sits in the amber family that BRAND.md
 *    reserves for a MEANING — "unconfirmed external data". An operator
 *    scanning for the amber that says "a machine suggested this, no
 *    human has confirmed it" was reading past an orange used for nav
 *    highlights, buttons and a logo tile.
 *
 * 2. Four tokens the console referenced — `--dp-warn`, `--dp-error`,
 *    `--dp-muted`, `--dp-brand` — were never defined anywhere. Every one
 *    was written as `var(--dp-warn, #b26a00)`, so the fallback hex
 *    rendered every single time. The console was not styled by its token
 *    file at all in those places; it was styled by whatever hex the last
 *    author typed inside the parentheses, including a `#333` border and
 *    a `#1a1a2e` dark-navy surface on a light theme.
 *
 * A palette pin would have caught the first and missed the second
 * entirely. So the load-bearing test here is the one that resolves every
 * referenced token against tokens.css: an undefined token cannot be
 * rebranded, because nothing it says is being read.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const ADMIN = path.join(__dirname, '..', 'app', 'admin');
const TOKENS = path.join(ADMIN, 'styles', 'tokens.css');

/** Every .tsx/.css file under src/app/admin. */
function adminFiles(dir = ADMIN, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) adminFiles(full, acc);
    else if (/\.(tsx?|css)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function withoutComments(src: string): string {
  return codeOnly(src);
}

const FILES = adminFiles().map((f) => [path.relative(ADMIN, f), fs.readFileSync(f, 'utf8')] as const);
const CODE = FILES.map(([name, src]) => [name, withoutComments(src)] as const);

describe('every admin token resolves to a definition', () => {
  const declared = new Set(
    [...fs.readFileSync(TOKENS, 'utf8').matchAll(/^\s*(--dp-[a-z0-9-]+)\s*:/gm)]
      .map((m) => m[1])
  );

  it('tokens.css declares the palette', () => {
    expect(declared.size).toBeGreaterThan(20);
  });

  for (const [name, src] of CODE) {
    if (name === 'styles/tokens.css') continue;
    it(`${name} references only declared tokens`, () => {
      const used = [...src.matchAll(/var\(\s*(--dp-[a-z0-9-]+)/g)].map((m) => m[1]);
      const undeclared = [...new Set(used)].filter((t) => !declared.has(t));
      expect(undeclared).toEqual([]);
    });
  }
});

describe('no color is spelled as a raw hex at a call site', () => {
  for (const [name, src] of CODE) {
    if (name === 'styles/tokens.css') continue;
    it(`${name} reads colors from tokens`, () => {
      // A hex fallback inside var() is the specific form that let four
      // undefined tokens render their fallback for months.
      expect(src).not.toMatch(/var\(\s*--dp-[a-z0-9-]+\s*,\s*#/);
      const hexes = [...src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
      expect(hexes).toEqual([]);
    });
  }
});

describe('the accent is the brand, not the console\'s own orange', () => {
  const tokens = fs.readFileSync(TOKENS, 'utf8');

  it('the primary token is brand purple', () => {
    expect(tokens).toMatch(/--dp-primary:\s*#7C4DFF/i);
  });

  it('the pre-brand orange family is gone from every admin file', () => {
    // #F57C00 / #ea580c / #c2410c / #FF9800 — the old --dp-primary ramp
    // and the sidebar logo gradient.
    const ORANGE = /#(F57C00|FF9800|ea580c|c2410c|fff7ed|F26B2B)/i;
    const offenders = FILES
      .filter(([, src]) => ORANGE.test(withoutComments(src)))
      .map(([name]) => name);
    expect(offenders).toEqual([]);
  });

  it('the sidebar mark uses the brand ramp', () => {
    const layout = fs.readFileSync(path.join(ADMIN, 'styles', 'admin-layout.css'), 'utf8');
    expect(layout).toMatch(/\.admin-logo-icon[\s\S]{0,400}var\(--dp-primary\)/);
  });
});

describe('the admin palette mirrors the brand source of truth', () => {
  /**
   * ADMIN-BRAND follow-up, added in the ADMIN3 PR (flagged, not
   * smuggled). BRAND.md names `tailwind.config.js` `brand.*` as the
   * single source for the brand colors. The console is plain CSS and
   * cannot read Tailwind classes, so `tokens.css` MIRRORS those values
   * — and every other mirror in this codebase is pinned bidirectionally
   * (form_families.py ↔ formRegistry.ts, dtt_rates.py ↔ dttCalc.ts,
   * api_catalog.py ↔ apiDocs.ts). This one shipped without its pin, so
   * a brand change in Tailwind would have silently left admin behind —
   * which is precisely the drift that produced an orange console in the
   * first place.
   */
  const tailwind = fs.readFileSync(
    path.join(__dirname, '..', '..', 'tailwind.config.js'), 'utf8');
  const tokens = fs.readFileSync(TOKENS, 'utf8');

  function brandShade(shade: string): string {
    const m = tailwind.match(new RegExp(`${shade}:\\s*'(#[0-9a-fA-F]{6})'`));
    if (!m) throw new Error(`brand.${shade} not found in tailwind.config.js`);
    return m[1].toLowerCase();
  }

  function adminToken(name: string): string {
    const m = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
    if (!m) throw new Error(`${name} not found in tokens.css`);
    return m[1].toLowerCase();
  }

  const MIRRORED: Array<[string, string]> = [
    ['--dp-primary', '500'],
    ['--dp-primary-600', '600'],
    ['--dp-primary-active', '700'],
    ['--dp-primary-light', '50'],
  ];

  for (const [token, shade] of MIRRORED) {
    it(`${token} equals tailwind brand.${shade}`, () => {
      expect(adminToken(token)).toBe(brandShade(shade));
    });
  }

  it('the doctrinal amber matches the app\'s warning.500', () => {
    const m = tailwind.match(/warning:\s*\{[\s\S]{0,200}?DEFAULT:\s*'(#[0-9a-fA-F]{6})'/);
    expect(m).not.toBeNull();
    expect(adminToken('--dp-warning')).toBe(m![1].toLowerCase());
  });
});

describe('doctrinal colors appear only with their meanings', () => {
  const tokens = fs.readFileSync(TOKENS, 'utf8');

  it('tokens.css states what amber, red and green mean here', () => {
    // BRAND.md: "A designer changing amber to blue is changing the
    // product's honesty system, not a palette." The meanings must be
    // written down where the values are, or the next edit is a palette
    // edit by default.
    expect(tokens).toContain('unconfirmed');
    expect(tokens).toMatch(/--dp-warning:\s*#F59E0B/i);
    expect(tokens).toContain('--dp-absent');
  });

  it('amber never fills a control', () => {
    // Fills are for actions; amber describes DATA. A filled amber button
    // spends the doctrine color on something that carries no meaning —
    // and this is precisely what the Suspend button used to do.
    for (const [name, src] of CODE) {
      if (!/\.tsx$/.test(name)) continue;
      const fills = [...src.matchAll(/background:\s*'var\((--dp-warning[a-z-]*)\)'/g)];
      expect(fills.map((m) => `${name}: ${m[1]}`)).toEqual([]);
    }
  });

  it('absence is neutral, not amber', () => {
    // "Not monitored" and "not measured" are facts about our
    // instrumentation, not warnings about data.
    const system = fs.readFileSync(path.join(ADMIN, 'components', 'SystemTab.tsx'), 'utf8');
    expect(system).toMatch(/status === 'not_monitored'\)\s*return <Badge kind="neutral"/);
  });

  it('the amber used for body text is the legible one', () => {
    // #F59E0B on a near-white wash does not clear contrast for text; a
    // doctrine color that cannot be read does not carry its meaning.
    for (const [name, src] of CODE) {
      if (!/\.tsx$/.test(name)) continue;
      expect(src).not.toMatch(/color:\s*'var\(--dp-warning\)'/);
    }
  });
});
