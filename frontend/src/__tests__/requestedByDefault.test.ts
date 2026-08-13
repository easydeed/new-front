/**
 * SETTINGS1 item 5 — Recording Requested By starts on something, and the
 * something it starts on does not create a deed.
 *
 * ═══ ONE FACT, ONE HOME ═══
 *
 * `company_name` sat in `users` AND in `user_profiles`. Settings wrote
 * the first; the deed pre-fill read the second. So an officer who fixed
 * her company on the Settings page did not change the company that
 * pre-fills the recorder's top-left box, and nothing on either screen
 * suggested they were different columns.
 *
 * Owner-ruled: `users.company_name` is canonical. This is the frontend
 * half — the value reaches the builder through `/users/profile`, which
 * is the endpoint Settings writes.
 *
 * ═══ AND THE PREFILL THAT WAS MINTING DEEDS ═══
 *
 * `hasMeaningfulData` carries the comment "an untouched builder must not
 * mint rows", and `requestedBy` is one of the fields it counts. The
 * localStorage prefill fills `requestedBy` as soon as the Recording
 * section is expanded — so that stated rule stopped being true the day
 * it shipped: opening Recording to see what is in it, and leaving it for
 * the 2.5s autosave debounce, created a deed row holding one company
 * name, for every officer who had ever picked a partner.
 *
 * Adding a second prefill without settling this would have extended it
 * to everyone with a company on their profile. A default is not typing.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import {
  OWN_COMPANY_ID,
  defaultRequestedBy,
  isPrefillOnly,
  requestedByChoices,
} from '../lib/requestedByDefault';
import { hasMeaningfulData } from '../lib/deedPayload';
import type { DeedBuilderState } from '../types/builder';

const SRC = path.join(__dirname, '..');
const SECTION = codeOnly(fs.readFileSync(
  path.join(SRC, 'components', 'builder', 'sections', 'RecordingSection.tsx'), 'utf8'));
const PAYLOAD = codeOnly(fs.readFileSync(
  path.join(SRC, 'lib', 'deedPayload.ts'), 'utf8'));

const PARTNERS = [
  { id: 'p-1', label: 'Chicago Title', address: '1 Wacker, Chicago, IL 60601' },
  { id: 'p-2', label: 'Fidelity National' },
];

const empty = (over: Partial<DeedBuilderState> = {}): DeedBuilderState => ({
  deedType: 'grant_deed',
  property: null,
  grantor: '',
  grantee: '',
  vesting: '',
  dtt: null,
  requestedBy: '',
  requestedByAddress: '',
  returnTo: '',
  titleOrderNo: '',
  escrowNo: '',
  ...over,
}) as DeedBuilderState;

describe('the officer\'s own company is a real option, not a bare string', () => {
  it('appears first, labelled, with a reserved id', () => {
    const choices = requestedByChoices(PARTNERS, 'Pacific Coast Escrow');
    expect(choices[0]).toMatchObject({ id: OWN_COMPANY_ID, label: 'Pacific Coast Escrow', own: true });
    expect(choices).toHaveLength(3);
  });

  it('the reserved id cannot collide with a partner id', () => {
    /**
     * Partner ids are server-issued UUIDs. If the synthetic id could
     * ever equal one, `defaultRequestedBy` would resolve the wrong
     * entry and `lastPartnerUsed` would point at a partner that does
     * not exist.
     */
    expect(OWN_COMPANY_ID).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
    const choices = requestedByChoices(
      [{ id: OWN_COMPANY_ID, label: 'Impostor' }], 'Pacific Coast Escrow');
    expect(choices.filter((c) => c.own)).toHaveLength(1);
  });

  it('is not offered when the profile has no company', () => {
    for (const blank of [null, undefined, '', '   ']) {
      expect(requestedByChoices(PARTNERS, blank).some((c) => c.own)).toBe(false);
    }
  });

  it('is not offered twice when the company is already a partner', () => {
    // Two identically-labelled options is a control that cannot show
    // which one is selected — the `<select>` matches by value.
    const choices = requestedByChoices(PARTNERS, ' Chicago Title ');
    expect(choices).toHaveLength(2);
    expect(choices.some((c) => c.own)).toBe(false);
  });
});

describe('THE ORDERING, which is the decision this file pins', () => {
  /**
   * Both orders have a wrong case, so neither is derivable and the one
   * chosen must be asserted rather than inferred from behaviour.
   *
   * Ruled: a partner she actually picked outranks the profile default.
   * Her own company fills the case that used to be blank.
   */
  it('a last-used partner beats the own company', () => {
    const choices = requestedByChoices(PARTNERS, 'Pacific Coast Escrow');
    expect(defaultRequestedBy(choices, 'p-1')).toEqual({
      value: 'Chicago Title', origin: 'last-partner',
      address: '1 Wacker, Chicago, IL 60601',
    });
  });

  it('the own company fills the previously-blank case', () => {
    const choices = requestedByChoices(PARTNERS, 'Pacific Coast Escrow');
    expect(defaultRequestedBy(choices, null)).toMatchObject({
      value: 'Pacific Coast Escrow', origin: 'own-company',
    });
  });

  it('a stale last-used id falls through rather than emptying the box', () => {
    // localStorage outlives a deleted partner. That is exactly the case
    // the fallback is for.
    const choices = requestedByChoices(PARTNERS, 'Pacific Coast Escrow');
    expect(defaultRequestedBy(choices, 'p-deleted').origin).toBe('own-company');
  });

  it('offers nothing when there is nothing to offer', () => {
    expect(defaultRequestedBy(requestedByChoices([], ''), 'p-1'))
      .toEqual({ value: '', origin: 'none' });
  });

  it('never invents a value', () => {
    // Sweep: whatever comes back, it is one of the labels offered or it
    // is empty. A default that is not in the list is a value the officer
    // cannot see and cannot correct.
    for (const last of [null, '', 'p-1', 'p-2', OWN_COMPANY_ID, 'nonsense']) {
      for (const company of ['', 'Pacific Coast Escrow']) {
        const choices = requestedByChoices(PARTNERS, company);
        const got = defaultRequestedBy(choices, last);
        if (got.value) {
          expect(choices.map((c) => c.label)).toContain(got.value);
        }
      }
    }
  });
});

describe('a default is not typing, so it does not mint a deed', () => {
  it('a builder holding ONLY a prefilled requested-by has nothing to save', () => {
    /** THE PIN THIS FILE EXISTS FOR. */
    expect(hasMeaningfulData(empty({
      requestedBy: 'Pacific Coast Escrow', requestedByPrefilled: true,
    }))).toBe(false);
  });

  it('the same value counts the moment she chooses it', () => {
    expect(hasMeaningfulData(empty({
      requestedBy: 'Pacific Coast Escrow', requestedByPrefilled: false,
    }))).toBe(true);
  });

  it('an unmarked value counts — the flag is opt-in, never a way to lose work', () => {
    // A resumed draft and every pre-existing state carry no flag. If the
    // absent case read as "prefilled", resume would stop autosaving.
    expect(hasMeaningfulData(empty({ requestedBy: 'Chicago Title' }))).toBe(true);
  });

  it('a prefill never suppresses REAL work sitting beside it', () => {
    // The flag answers one question about one field. Anything else in
    // the state still saves.
    for (const real of [
      { grantor: 'Jane Doe' },
      { grantee: 'John Roe' },
      { titleOrderNo: 'TC-1' },
      { escrowNo: 'ESC-1' },
    ]) {
      expect(hasMeaningfulData(empty({
        requestedBy: 'Pacific Coast Escrow', requestedByPrefilled: true, ...real,
      }))).toBe(true);
    }
  });

  it('isPrefillOnly needs BOTH the flag and a value', () => {
    expect(isPrefillOnly('Acme', true)).toBe(true);
    expect(isPrefillOnly('Acme', false)).toBe(false);
    expect(isPrefillOnly('', true)).toBe(false);
    expect(isPrefillOnly('   ', true)).toBe(false);
    expect(isPrefillOnly(undefined, undefined)).toBe(false);
  });

  it('the rule is called from hasMeaningfulData, not merely exported', () => {
    // A module nothing imports is a rule nothing enforces.
    expect(PAYLOAD).toContain('isPrefillOnly(s.requestedBy, s.requestedByPrefilled)');
  });
});

describe('the section uses the list it renders', () => {
  it('renders the choices, so a defaulted value is visible and correctable', () => {
    /**
     * A `<select>` whose value matches no `<option>` renders as
     * unselected. Writing the company into state without adding the
     * option would print a name on the deed that the screen shows as
     * blank — the exact shape of "state that exists and is not shown".
     */
    expect(SECTION).toContain('choices.map(');
    expect(SECTION).toContain('requestedByChoices(');
    expect(SECTION).toContain('defaultRequestedBy(');
  });

  it('marks what it filled, on every path that fills it', () => {
    // Set on the prefill; cleared on both paths where she chooses. A
    // path that forgets to clear it silently stops autosaving her work.
    expect(SECTION).toContain('requestedByPrefilled: true');
    expect((SECTION.match(/requestedByPrefilled: false/g) || []).length).toBe(2);
  });

  it('does not remember the own company as a last-used partner', () => {
    // It is not a partner, and storing it would make the fallback
    // outrank the profile it came from on the next deed — freezing a
    // stale company name past the day she corrects it in Settings.
    expect(SECTION).toContain('!chosen.own');
  });

  it('reads the company from the canonical source', () => {
    expect(SECTION).toContain('useOwnCompany()');
  });

  it('the empty-list message counts the list it shows', () => {
    // `partners.length === 0` would tell her there is nothing to pick
    // while her own company sits in the dropdown.
    expect(SECTION).toContain('choices.length === 0');
    expect(SECTION).not.toContain('partners.length === 0');
  });
});
