/**
 * X1 — adoption + freeze/viewport pins.
 *
 * The client exists (apiClient.test.ts pins its behavior); these pins
 * make sure the audited pages actually USE it, that the login page names
 * the expired session, that the full-viewport backdrop blur behind
 * modals (the Past Deeds renderer freeze) stays gone, and that the share
 * modal keeps its submit reachable at normal window heights.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

const AUDITED_PAGES: Array<[string, string[]]> = [
  ['past-deeds', ['app', 'past-deeds', 'page.tsx']],
  ['shared-deeds', ['app', 'shared-deeds', 'page.tsx']],
  ['dashboard', ['app', 'dashboard', 'page.tsx']],
];

describe('X1 — the audited pages route API calls through apiFetch', () => {
  for (const [name, segments] of AUDITED_PAGES) {
    it(`${name} uses apiFetch for backend calls`, () => {
      const src = readSource(...segments);
      expect(src).toContain("from \"@/lib/apiClient\"");
      // No bare fetch(`${api}/...`) to the backend remains. (The dashboard
      // auth-check profile fetch predates X1 and redirects on failure
      // itself; backend DATA calls are the audited surface.)
      expect(src).not.toMatch(/fetch\(`\$\{api\}/);
    });
  }

  it('the builder autosave/generate/resume go through apiFetch (401 never silent)', () => {
    const src = readSource('features', 'builder', 'DeedBuilder.tsx');
    expect(src).toContain("from '@/lib/apiClient'");
    expect((src.match(/apiFetch\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(src).not.toMatch(/await fetch\('\/api\/deeds/);
  });

  it('shared-deeds Try Again refetches instead of reloading blind', () => {
    const src = readSource('app', 'shared-deeds', 'page.tsx');
    expect(src).toContain('onClick={() => fetchSharedDeeds()}');
    expect(src).not.toContain('window.location.reload()');
  });
});

describe('X1 — session expiry is named at the login page', () => {
  it('login shows the expired-session message for ?expired=1', () => {
    const src = readSource('app', 'login', 'page.tsx');
    expect(src).toContain('searchParams.get("expired")');
    expect(src).toContain('Your session expired');
  });
});

describe('X1 — renderer freeze: no full-viewport backdrop blur behind modals', () => {
  // PARTNER2/B: past-deeds no longer OWNS a modal — its share flows moved
  // into their own components — so the list follows the modals rather than
  // the page that used to hold one. QuickAddPartnerModal is new to this
  // list and was a live violation when it arrived: it kept `backdrop-blur`
  // from before the X1 ruling because it had no importers at the time, and
  // Part B revives it.
  const BLUR_SURFACES: Array<string[]> = [
    ['app', 'shared-deeds', 'page.tsx'],
    ['components', 'ui', 'ConfirmDialog.tsx'],
    ['features', 'signing', 'ShareForReviewModal.tsx'],
    // FLOW1 item 6: SigningRequestModal.tsx is deleted with NOTARY1's
    // write path. RequestSigningModal (NOTARY2's) takes its place here —
    // the list follows the modals that exist, and dropping an entry
    // without replacing it would quietly shrink the sweep.
    ['features', 'signing', 'RequestSigningModal.tsx'],
    ['features', 'partners', 'QuickAddPartnerModal.tsx'],
  ];
  for (const segments of BLUR_SURFACES) {
    it(`${segments.join('/')} dims without blurring`, () => {
      const src = readSource(...segments);
      expect(src).not.toContain('backdrop-blur');
      expect(src).toContain('bg-black/50');
    });
  }
});

describe('X1 — the share modals are viewport-safe', () => {
  // The PROPERTY: the panel is a flex column, its body scrolls, and the
  // footer therefore stays reachable on a short viewport. Was pinned
  // against one modal by its handler's NAME; both share modals now carry
  // it, and naming the handler was pinning the spelling.
  const MODALS: Array<string[]> = [
    ['features', 'signing', 'ShareForReviewModal.tsx'],
    ['features', 'signing', 'RequestSigningModal.tsx'],
  ];
  for (const segments of MODALS) {
    it(`${segments.join('/')} scrolls its body, not its footer`, () => {
      const src = readSource(...segments);
      expect(src).toMatch(/max-h-\[85vh\] flex flex-col/);
      expect(src).toMatch(/<form[^>]*className="flex flex-col min-h-0 flex-1"/);
      expect(src).toMatch(/className="space-y-5 overflow-y-auto flex-1/);
      expect(src).toMatch(/className="flex gap-3 pt-5 shrink-0"/);
    });
  }
});
