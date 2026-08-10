/**
 * PARTNER1 — the Partners screen, brand and behaviour.
 *
 * Two jobs, and the order is the ticket's:
 *
 *  1. THE BUG. The form must capture the five address fields, because
 *     the address prints on the deed and this page is the only place to
 *     edit one. The end-to-end proof (partner → assembled line → PDF
 *     text) lives in `backend/tests/test_partner1_address.py`; what is
 *     asserted here is the half that runs in the browser.
 *
 *  2. BRAND. This screen predates BRAND2 and broke it three ways: flat
 *     blue/red buttons, emoji glyphs where the icon set belongs, and
 *     Quick Stats in a fourth palette. The amber in that palette is the
 *     one that mattered — BRAND.md reserves amber for "unconfirmed
 *     external data", and an officer scanning for the amber that means
 *     "no human has said yes to this" was reading past a lender count.
 *
 * Why this file and not an extension of `adminBrand.test.ts`: the admin
 * console is styled by CSS custom properties in its own `tokens.css`, so
 * its load-bearing pin resolves token references against declarations.
 * This page is a Tailwind surface — the equivalent question is whether
 * it spells brand colours as `brand-*` classes or as whatever hex or
 * palette the last author reached for.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { codeOnly } from '../test-support/sourceText';

const FILE = path.join(__dirname, '..', 'app', 'partners', 'page.tsx');
const RAW = fs.readFileSync(FILE, 'utf8');
const SRC = codeOnly(RAW);

// ── 1. The bug ───────────────────────────────────────────────────────

const ADDRESS_FIELDS = [
  'address_line1', 'address_line2', 'city', 'state', 'postal_code',
] as const;

describe('the form captures the address that prints on the deed', () => {
  it('blank() seeds every address field', () => {
    const blank = SRC.slice(SRC.indexOf('function blank()'), SRC.indexOf('function save('));
    for (const f of ADDRESS_FIELDS) expect(blank).toContain(f);
  });

  it.each(ADDRESS_FIELDS)('an input is bound to %s', (field) => {
    expect(SRC).toMatch(new RegExp(`editing\\.${field}`));
    expect(SRC).toMatch(new RegExp(`${field}:\\s*e\\.target\\.value`));
  });

  it('the table shows the address, and a missing one is an editable gap', () => {
    expect(SRC).toContain('partnerAddressLine');
    // Not a bare em-dash: an absent address must offer the way to fix it,
    // because the blank it becomes is on a recorded document.
    expect(SRC).toContain('Add address');
  });

  it('the officer is told how many partners are missing one, and why it matters', () => {
    expect(RAW).toMatch(/Recording Requested By/i);
    expect(SRC).toContain('missingAddress');
  });

  it('the address line is assembled the same way the backend assembles it', () => {
    // The officer checks the table; the deed prints the selectlist's
    // version. Two rules would drift, and the one she checked would not
    // be the one that recorded.
    const fn = SRC.slice(SRC.indexOf('export function partnerAddressLine'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    for (const f of ADDRESS_FIELDS) expect(body).toContain(f);
  });
});

// ── 2. Brand ─────────────────────────────────────────────────────────

describe('brand conformance (BRAND2)', () => {
  it('primary actions are brand purple, not blue', () => {
    expect(SRC).toContain('bg-brand-500');
    expect(SRC).not.toMatch(/bg-blue-\d/);
    expect(SRC).not.toMatch(/text-blue-\d/);
    expect(SRC).not.toMatch(/focus:ring-blue-\d/);
  });

  it('destructive actions are outline or text, never a filled block', () => {
    // Red must be findable, not the loudest thing on the screen.
    expect(SRC).not.toMatch(/bg-red-[5-9]00/);
    expect(SRC).toMatch(/border-red-\d00|text-red-\d00/);
  });

  it('cancel is a ghost, not a competing button', () => {
    const footer = SRC.slice(SRC.indexOf('Cancel') - 400, SRC.indexOf('Cancel'));
    expect(footer).toMatch(/border border-gray-300/);
  });

  it('no emoji glyphs — the icon set does this job', () => {
    // The screen shipped plus/save/trash/close/pencil emoji as button
    // labels. Checked against SRC, and over the emoji + dingbat blocks
    // ONLY — a first cut spanned U+2190–U+27BF, which swallows box
    // drawing (U+2500–U+257F), so the pin failed on the ═══ rule in its
    // own header comment. That is the eighth time a pin in this repo has
    // tripped on the prose explaining it; `codeOnly` exists for exactly
    // this, and the range wants to be no wider than the thing it forbids.
    expect(SRC).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{FE0F}]/u);
    expect(SRC).toContain("from 'lucide-react'");
  });

  it('Quick Stats use ONE accent, and a zero is muted rather than shouted', () => {
    const stats = SRC.slice(SRC.indexOf('Quick Stats'));
    expect(stats).not.toMatch(/text-emerald-\d/);
    expect(stats).not.toMatch(/text-amber-\d/);
    expect(SRC).toContain('text-gray-400');
    expect(SRC).toContain('text-brand-600');
  });

  it('AMBER IS NOT SPENT ON DECORATION anywhere on this page', () => {
    // The load-bearing one. BRAND.md: amber means "a machine suggested
    // this; a human has not yet said yes". A partner count is neither
    // machine-suggested nor awaiting anyone. Reassigning it degrades the
    // signal on every screen that uses it correctly.
    expect(SRC).not.toMatch(/amber/);
  });

  it('no colour is spelled as a raw hex at a call site', () => {
    // The old category badges built their chips from hex literals
    // (#3b82f6 / #10b981 / #f59e0b) in an inline style object, which no
    // palette change could ever reach.
    expect(SRC).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});

// ── 3. UX ────────────────────────────────────────────────────────────

describe('the list keeps context', () => {
  it('the editor is a modal/slide-over, not a card that pushes the table down', () => {
    expect(SRC).toMatch(/fixed inset-0/);
    expect(SRC).toContain('aria-modal="true"');
    expect(SRC).toContain('role="dialog"');
  });

  it('each row carries its own labelled actions', () => {
    expect(SRC).toMatch(/aria-label=\{`Edit \$\{p\.company_name\}`\}/);
    expect(SRC).toMatch(/aria-label=\{`Delete \$\{p\.company_name\}`\}/);
  });
});

describe('the table survives a normal window', () => {
  it('lower-priority columns drop out instead of forcing a horizontal scroll', () => {
    expect(SRC).toMatch(/hidden lg:table-cell/);
    expect(SRC).toMatch(/hidden xl:table-cell/);
    expect(SRC).not.toContain('overflow-x-auto');
  });

  it('long company names wrap instead of overflowing', () => {
    expect(SRC).toContain('table-fixed');
    expect(SRC).toContain('break-words');
  });
});

describe('category display', () => {
  it('renders Title Case, not raw snake_case', () => {
    expect(SRC).toContain('titleCase');
    expect(SRC).not.toMatch(/category\.replace\('_'/);
  });

  it('chips carry semantic neutral tones, no decorative colour', () => {
    const chip = SRC.slice(SRC.indexOf('function categoryChip'));
    const body = chip.slice(0, chip.indexOf('\n  }'));
    expect(body).toMatch(/slate|gray/);
    expect(body).not.toMatch(/violet|amber|emerald|blue/);
  });
});

describe('growth affordances', () => {
  it('search filters on the fields an officer would actually type', () => {
    expect(SRC).toContain('setQuery');
    for (const f of ['company_name', 'contact_name', 'email', 'city']) {
      expect(SRC.slice(SRC.indexOf('const filtered'))).toContain(f);
    }
  });

  it('the empty state says what partners are FOR, not just that there are none', () => {
    expect(RAW).toMatch(/No partners yet/);
    expect(RAW).toMatch(/Recording Requested By/);
    expect(RAW).toMatch(/Add your first partner/);
  });

  it('a search with no hits is distinguished from having no partners', () => {
    // Two different facts. "You have no partners" when you have twelve
    // and mistyped one is a lie about the officer's own data.
    expect(SRC).toContain('No partners match');
  });
});
