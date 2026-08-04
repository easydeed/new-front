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
 * T-0 — the gate does not promise a record it cannot keep.
 *
 * RETIRE THIS BLOCK IN T-5, not before. The sentence it forbids is not
 * wrong forever; it is wrong *today*. "Generate a corrected deed — the
 * record keeps both" describes supersession lineage, and `deeds` has
 * none: no superseded_by, no status past draft/completed/deleted, no
 * surface relating the pair. `document_authenticity` has the shape
 * (status + superseded_by self-FK) and is written only by the partner-API
 * lane, so no wizard deed has ever had a lineage row.
 *
 * When T-5 mirrors that shape onto `deeds`, the sentence becomes true and
 * should come back — delete this describe block in the same PR that makes
 * it honest, so the copy and the record change together.
 */
describe('T-0 — the generation gate claims only what the record holds', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'features', 'builder', 'DeedBuilder.tsx'), 'utf8');
  // The explanatory comment necessarily quotes the removed sentence.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('does not offer a "corrected deed" whose correction is recorded nowhere', () => {
    expect(code).not.toMatch(/corrected deed/i);
    expect(code).not.toMatch(/record keeps both/i);
  });

  it('still tells the officer the document is final and uneditable', () => {
    // Removing the false half must not remove the true warning with it.
    expect(code).toContain('stored immutably');
    expect(code).toMatch(/cannot be edited/i);
  });
});
