/**
 * D2 — the builder polish trio, pinned (frontend half).
 *
 * 1. Typed sections get "Next" buttons — forward momentum WITHOUT fake
 *    confirmations: "Confirm" stays reserved for external-source data
 *    (the doctrine boundary the owner drew).
 * 2. The requesting party's address travels: partner record → builder
 *    state → payload → preview line under the name.
 * 3. APN is bold on the preview, both appearances.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { buildDeedPayload } from '../lib/deedPayload';
import type { DeedBuilderState } from '../types/builder';

function readSource(...segments: string[]): string {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

const INPUT_PANEL = readSource('components', 'builder', 'InputPanel.tsx');
const PREVIEW = readSource('components', 'builder', 'PreviewPanel.tsx');
const RECORDING = readSource('components', 'builder', 'sections', 'RecordingSection.tsx');

describe('D2.1 — Next buttons on typed sections, never confirm affordances', () => {
  it('grantee → vesting → transfer tax → recording → done', () => {
    expect(INPUT_PANEL).toContain('<SectionNext to="vesting" label="Next: Vesting" />');
    expect(INPUT_PANEL).toContain('<SectionNext to="transferTax" label="Next: Transfer Tax" />');
    expect(INPUT_PANEL).toContain('<SectionNext to="recording" label="Next: Recording Info" />');
    expect(INPUT_PANEL).toContain('<SectionNext to="" label="Done — review your deed" />');
  });

  it('typed sections gained NO confirm affordances (doctrine boundary)', () => {
    // ConfirmableField remains only where external-source data lives.
    const grantee = readSource('components', 'builder', 'sections', 'GranteeSection.tsx');
    expect(grantee).not.toContain('ConfirmableField');
    expect(RECORDING).not.toContain('ConfirmableField');
  });
});

describe('D2.2 — the requesting-party address travels the full path', () => {
  it('selecting an entry carries the address into state', () => {
    /**
     * SETTINGS1 item 5 renamed `partner` to `chosen` — the picker now
     * offers the officer's own company alongside the rolodex, and both
     * kinds carry an address. The rule is unchanged and the pin follows
     * the identifier.
     *
     * That this pin broke on a pure rename is the small lesson: it
     * asserts a LINE rather than the behaviour, so it fails on correct
     * code. The behavioural half is the payload test below, which is
     * why that one did not move.
     */
    expect(RECORDING).toContain('requestedByAddress: chosen?.address');
  });

  it('the own-company entry carries an address too', () => {
    // Recording under your own company should fill the address line the
    // same way a partner does — the value is on the profile either way,
    // and typing it again is how the two copies diverge.
    expect(RECORDING).toContain('requestedByChoices(partners, companyName, companyAddress)');
  });

  it('the address is editable as its own field', () => {
    expect(RECORDING).toContain('Requesting Party Address');
  });

  it('buildDeedPayload carries requested_by_address', () => {
    const state = {
      deedType: 'grant-deed', property: null, grantor: '', grantee: '',
      vesting: '', dtt: null, requestedBy: 'Acme Escrow',
      requestedByAddress: '456 Escrow Way, Los Angeles, CA 90012',
      returnTo: '', titleOrderNo: '', escrowNo: '',
    } as DeedBuilderState;
    expect(buildDeedPayload(state).requested_by_address).toBe('456 Escrow Way, Los Angeles, CA 90012');
  });

  it('the preview prints the address under the requesting party', () => {
    expect(PREVIEW).toContain('preview.requestedByAddress');
  });

  it('the resume mapper restores it', () => {
    const resume = readSource('lib', 'deedResume.ts');
    expect(resume).toContain('requestedByAddress: meta.requested_by_address');
  });
});

describe('D2.3 — APN is bold on the preview', () => {
  it('both appearances carry font-bold', () => {
    const boundary = PREVIEW.substring(PREVIEW.indexOf('Boundary row'), PREVIEW.indexOf('Title */'));
    expect(boundary).toMatch(/font-bold[^`]*\$\{highlight\('property'\)\}/);
    const parcel = PREVIEW.substring(PREVIEW.indexOf('Parcel Number'));
    expect(PREVIEW).toMatch(/font-bold[^\n]*\n\s*Assessor/);
  });
});
