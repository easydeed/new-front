/**
 * X2 — the legitimacy batch, pinned.
 *
 * 1. /settings lands on the real account page, never a 404.
 * 2. Every non-trust AI vesting suggestion matches a NAMED option — the
 *    recommended path must not look like the risky (Custom) path.
 * 3. DTT shows its breakdown; cities without their own transfer tax get
 *    NO fabricated city portion (the $2.20-for-any-city bug).
 * 4/5. Share modal: email is the identity (name optional); expiry copy
 *    states what actually happens.
 * 6. Duplicate-parcel awareness is passive — a notice, never a block.
 * 7. Past Deeds is searchable/filterable with a Doc ID column; dashboard
 *    drafts read as needs-action.
 * 8. Success-page downloads serve the server-stored bytes, and the
 *    stored PDF's fingerprint is displayed.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { computeDttBreakdown } from '../lib/dttCalc';
import { getVestingSuggestion } from '../lib/ai-helpers';
import { VESTING_OPTIONS } from '../components/builder/sections/VestingSection';
import type { DTTData } from '../types/builder';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

describe('X2.1 — /settings is never a dead end', () => {
  it('redirects to the real account page', () => {
    const src = readSource('app', 'settings', 'page.tsx');
    expect(src).toContain("redirect('/account-settings')");
  });
});

describe('X2.2 — accepted vesting suggestions land on named options', () => {
  const named = VESTING_OPTIONS.map((o) => o.value.toLowerCase());

  const CASES: Array<[string, string, number, string]> = [
    ['single grantee', 'ROBERT ROE', 1, 'grant-deed'],
    ['married couple', 'JOHN SMITH AND JANE SMITH', 2, 'grant-deed'],
    ['two individuals', 'ANN ONE AND BOB TWO', 2, 'grant-deed'],
    ['interspousal single', 'JANE SMITH', 1, 'interspousal-transfer'],
    ['three grantees', 'A ONE AND B TWO AND C THREE', 3, 'grant-deed'],
  ];

  for (const [label, grantee, count, deedType] of CASES) {
    it(`${label}: the suggested value is a NAMED option`, () => {
      const suggestion = getVestingSuggestion(grantee, count, deedType);
      expect(suggestion).not.toBeNull();
      expect(named).toContain(suggestion!.value.toLowerCase());
    });
  }

  it('trust vesting stays genuinely custom (names the trust)', () => {
    const suggestion = getVestingSuggestion('JOHN SMITH, TRUSTEE OF THE SMITH FAMILY TRUST', 1, 'grant-deed');
    expect(suggestion).not.toBeNull();
    expect(named).not.toContain(suggestion!.value.toLowerCase());
  });

  it('option matching in the section is case-insensitive', () => {
    const src = readSource('components', 'builder', 'sections', 'VestingSection.tsx');
    expect(src).toContain('matchesOption');
    expect(src).toMatch(/toLowerCase\(\)/);
  });
});

describe('X2.3 — DTT breakdown, no fabricated city tax', () => {
  const base: DTTData = {
    isExempt: false, exemptReason: '', transferValue: '500,000',
    calculatedAmount: '', basis: 'full_value', areaType: 'city', cityName: '',
  };

  it('a city with NO municipal transfer tax gets county-only (the $2.20 phantom is dead)', () => {
    const b = computeDttBreakdown({ ...base, cityName: 'Glendale' });
    expect(b).not.toBeNull();
    expect(b!.city).toBeNull();
    expect(b!.county).toBe('550.00');
    expect(b!.total).toBe('550.00');
  });

  it('a city with its own transfer tax shows both portions', () => {
    const b = computeDttBreakdown({ ...base, cityName: 'Los Angeles' });
    expect(b!.county).toBe('550.00');
    expect(b!.city).toBe('2250.00');
    expect(b!.total).toBe('2800.00');
  });

  it('unincorporated is county-only', () => {
    const b = computeDttBreakdown({ ...base, areaType: 'unincorporated', cityName: '' });
    expect(b!.city).toBeNull();
    expect(b!.total).toBe('550.00');
  });

  it('exempt and empty declare nothing', () => {
    expect(computeDttBreakdown({ ...base, isExempt: true })).toBeNull();
    expect(computeDttBreakdown({ ...base, transferValue: '' })).toBeNull();
    expect(computeDttBreakdown(null)).toBeNull();
  });

  it('the section renders the breakdown, not one opaque total', () => {
    const src = readSource('components', 'builder', 'sections', 'TransferTaxSection.tsx');
    expect(src).toContain('computeDttBreakdown');
    expect(src).toContain('dttBreakdown.county');
    expect(src).toContain('dttBreakdown.city');
  });
});

describe('X2.4/5 — share modal honesty', () => {
  it('recipient name is optional; email is the identity', () => {
    // PARTNER2/B: the typed-name-and-email pair moved into the recipient
    // picker, where the name is optional BY CONSTRUCTION — she picks a
    // partner and the name comes with them, or types an address and the
    // name field is marked optional. The property is unchanged: an email
    // identifies a recipient and a name never gates the send.
    const src = readSource('features', 'partners', 'PartnerRecipientPicker.tsx');
    expect(src).toContain('Their name (optional)');
    const nameInput = src.substring(src.indexOf('Their name (optional)') - 400,
                                    src.indexOf('Their name (optional)'));
    expect(nameInput).not.toContain('required');
    // The email input is the one that identifies.
    expect(src).toMatch(/type="email"[\s\S]{0,200}placeholder="name@example\.com"/);
  });

  it('expiry copy states what actually happens at expiry', () => {
    const src = readSource('features', 'signing', 'ShareForReviewModal.tsx');
    expect(src).toContain('When the link expires it stops working');
    expect(src).toContain('the deed itself is unaffected');
  });
});

describe('X2.6 — duplicate-parcel awareness is passive', () => {
  it('the builder checks the APN and notifies without blocking', () => {
    const src = readSource('features', 'builder', 'DeedBuilder.tsx');
    expect(src).toContain('already has a completed deed');
    expect(src).toContain('Continuing creates a separate document');
    // A notice, never a gate: the dupe check must not touch gateBlocked.
    const gate = src.substring(src.indexOf('const gateBlocked'), src.indexOf('const stampConfirmed'));
    expect(gate).not.toContain('apn');
  });
});

describe('X2.7 — findable rows', () => {
  it('Past Deeds has search, status filter, and a Doc ID column', () => {
    const src = readSource('app', 'past-deeds', 'page.tsx');
    expect(src).toContain('Search address, grantee, APN, or Doc ID');
    expect(src).toContain('statusFilter');
    expect(src).toContain('>Doc ID</th>');
    expect(src).toContain('visibleDeeds.map');
  });

  it('dashboard drafts read as needs-action with a labeled Continue', () => {
    const src = readSource('app', 'dashboard', 'page.tsx');
    expect(src).toContain('needsAction');
    expect(src).toContain('border-amber-400');
    expect(src).toMatch(/Continue\s*<ArrowRight/);
    // Last-touched time, not created time.
    expect(src).toContain('formatDate(deed.updated_at || deed.created_at)');
  });
});

describe('X2.8 — downloads are demonstrably server-truth', () => {
  it('the success page fetches bytes from the authenticated download endpoint', () => {
    const src = readSource('app', 'deed-builder', '[type]', 'success', 'success-content.tsx');
    expect(src).toMatch(/\/deeds\/\$\{deedId\}\/download/);
  });

  it('the stored PDF fingerprint is surfaced', () => {
    const src = readSource('app', 'deed-builder', '[type]', 'success', 'success-content.tsx');
    expect(src).toContain('pdf_sha256');
    expect(src).toContain('Stored PDF fingerprint');
  });
});
