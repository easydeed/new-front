/**
 * U0 (UX audit) — the gate integrity question, answered and pinned.
 *
 * Verdict: the GATE was intact — a non-empty unconfirmed material field is
 * always a candidate and always blocks generation; an empty field has
 * nothing to confirm and never reaches the PDF. The DISPLAY lied: the
 * header counter derived "complete" from mere field presence, and the
 * property card rendered a confirm affordance for an empty owner. These
 * tests pin both truths and the one-source derivation that replaces them.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { collectCandidateFields } from '../lib/provenance';
import { deriveSectionTruth } from '../lib/deedValidation';
import type { DeedBuilderState } from '../types/builder';

function baseState(overrides: Partial<DeedBuilderState> = {}): DeedBuilderState {
  return {
    deedType: 'grant-deed',
    property: {
      address: '1358 5TH ST',
      city: 'Santa Monica',
      county: 'Los Angeles',
      state: 'CA',
      zip: '90401',
      apn: '4290-012-034',
      legalDescription: 'LOT 7, BLOCK B',
      provenance: {
        apn: { value: '4290-012-034', source: 'sitex', status: 'confirmed', confirmedAt: 't' },
        legalDescription: { value: 'LOT 7, BLOCK B', source: 'sitex', status: 'confirmed', confirmedAt: 't' },
      },
    },
    grantor: 'JOHN A. DOE',
    grantorProvenance: { value: 'JOHN A. DOE', source: 'user', status: 'confirmed', confirmedAt: 't' },
    grantee: 'ROBERT C. ROE',
    vesting: 'a single man',
    dtt: {
      isExempt: false, exemptReason: '', transferValue: '500000',
      calculatedAmount: '550.00', basis: 'full_value', areaType: 'city', cityName: 'Santa Monica',
    },
    dttDecision: { source: 'user', status: 'confirmed', confirmedAt: 't' },
    requestedBy: 'Pacific Coast Escrow',
    returnTo: 'grantee',
    ...overrides,
  };
}

describe('the gate itself (doctrine pin)', () => {
  it('a NON-EMPTY unconfirmed material field is always a candidate — generation blocks', () => {
    const s = baseState();
    s.property!.owner = 'SOMEBODY UNCONFIRMED';
    // no provenance stamp for owner → candidate
    const candidates = collectCandidateFields(s);
    expect(candidates.some((c) => c.key === 'owner')).toBe(true);
  });

  it('an EMPTY field has nothing to confirm — it is never a candidate', () => {
    const s = baseState(); // owner absent entirely
    expect(collectCandidateFields(s).some((c) => c.key === 'owner')).toBe(false);
  });
});

describe('one truth: the counter derives from gate math', () => {
  it('a section holding an unconfirmed candidate is NOT complete', () => {
    const s = baseState();
    s.property!.owner = 'SOMEBODY UNCONFIRMED';
    const truth = deriveSectionTruth(s);
    expect(truth.statuses.property).toBe('warning');
    expect(truth.completedCount).toBeLessThan(truth.totalSections);
    expect(truth.pendingConfirmations).toBeGreaterThan(0);
    // Candidates don't disable the button — the gate modal confirms them.
    expect(truth.readyForGate).toBe(true);
  });

  it('an empty owner neither blocks nor warns — no phantom "unconfirmed"', () => {
    const truth = deriveSectionTruth(baseState());
    expect(truth.statuses.property).toBe('complete');
    expect(truth.completedCount).toBe(truth.totalSections);
    expect(truth.pendingConfirmations).toBe(0);
  });

  it('a failing substantive check marks its section and blocks the button', () => {
    const s = baseState({ vesting: '' });
    const truth = deriveSectionTruth(s);
    expect(truth.statuses.vesting).toBe('empty');
    expect(truth.readyForGate).toBe(false);
  });

  it('"N of N complete" is impossible while the gate would still block', () => {
    const s = baseState();
    s.property!.provenance!.apn!.status = 'candidate';
    const truth = deriveSectionTruth(s);
    const gateWouldBlock = collectCandidateFields(s).length > 0;
    expect(gateWouldBlock).toBe(true);
    expect(truth.completedCount).toBeLessThan(truth.totalSections);
  });
});

/**
 * T-5 — the promise returns, because the record now keeps it.
 *
 * The T-0 block lived here and forbade the words "corrected deed" and
 * "record keeps both". Its docstring named its own retirement condition:
 * delete it in the same PR that mirrors document_authenticity's lineage
 * onto `deeds`. That PR is this one, so it is gone.
 *
 * What replaces it is the inverse pin. The sentence is now true and must
 * STAY true — if the lineage were ever removed, the copy would go back to
 * promising a relationship nothing records, and this fails.
 */
describe('T-5 — the gate promises lineage, and the record keeps it', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'features', 'builder', 'DeedBuilder.tsx'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('offers the corrected-deed path again', () => {
    expect(code).toMatch(/corrected deed/i);
    expect(code).toMatch(/record keeps\s*\n?\s*both/i);
  });

  it('and says plainly that a correction is a NEW instrument', () => {
    // The part officers most need to hear: we record the relationship,
    // we do not un-record documents.
    expect(code).toMatch(/new instrument/i);
    expect(code).toMatch(/own signing and notarisation/i);
  });

  it('still warns the generated document cannot be edited', () => {
    expect(code).toContain('stored immutably');
    expect(code).toMatch(/cannot be edited/i);
  });

  it('the lineage the copy promises actually exists in the schema', () => {
    // The pin that keeps copy and record together in BOTH directions.
    const schema = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'backend', 'database.py'), 'utf8');
    expect(schema).toContain('superseded_by INTEGER REFERENCES deeds(id)');
    expect(schema).toContain('superseded_at TIMESTAMPTZ');
  });
});

/**
 * T-1 — the confirmation rhythm changed; the record did not.
 *
 * The whole claim of this ticket is that a deed generated by pressing
 * "Confirm all & generate" once is INDISTINGUISHABLE in the record from
 * one generated by clicking five individual Confirm buttons. Every field
 * still gets its own `confirmedAt`; `handleConfirmAll` still walks the
 * candidate list one key at a time and calls the same `stampConfirmed`.
 *
 * These pins guard that claim from the direction it would actually break:
 * someone "simplifying" the bulk path into a single shared timestamp, or
 * a single blanket flag, because the UI now shows one line instead of
 * five cards. The presentation is allowed to collapse. The record is not.
 */
describe('T-1 — collapsing the display does not collapse the record', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'features', 'builder', 'DeedBuilder.tsx'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('confirm-all still stamps field by field, not in bulk', () => {
    // The bulk handler maps over candidates and hands stampConfirmed the
    // KEYS — the per-key loop inside stampConfirmed is what mints one
    // timestamp each.
    expect(code).toMatch(
      /handleConfirmAll[\s\S]{0,240}stampConfirmed\(\s*state,\s*collectCandidateFields\(state\)\.map\(\(c\)\s*=>\s*c\.key\)\s*\)/
    );
  });

  it('each key still receives its own timestamp inside the loop', () => {
    const fn = code.slice(code.indexOf('const stampConfirmed'), code.indexOf('const handleGenerate'));
    expect(fn).toMatch(/for\s*\(const key of keys\)/);
    // The timestamp is minted INSIDE the loop — one per field, not hoisted.
    const loopStart = fn.indexOf('for (const key of keys)');
    const stamp = fn.indexOf('const confirmedAt = new Date().toISOString()');
    expect(stamp).toBeGreaterThan(loopStart);
  });

  it('no shared/bulk confirmation shortcut was introduced', () => {
    expect(code).not.toMatch(/confirmedAll|bulkConfirm|status:\s*'confirmed'\s*,\s*\.\.\.keys/);
    // A single hoisted timestamp reused across fields would look like this.
    expect(code).not.toMatch(/const sharedConfirmedAt|confirmedAt\s*=\s*now\b/);
  });

  it('the per-field path survives, behind a disclosure', () => {
    expect(code).toContain('handleConfirmField');
    expect(code).toContain('<details');
    expect(code).toContain('Review them individually');
  });

  it('the summary states the count and the source rather than listing cards', () => {
    expect(code).toMatch(/awaiting your\s*\n?\s*confirmation/);
    expect(code).toMatch(/records each one individually/);
  });
});
