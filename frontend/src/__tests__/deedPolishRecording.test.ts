/**
 * DEED-POLISH #1 and #3 — the mail-to address, and the section that hid
 * its own fields.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';
import { RECORDING_EMPTY, recordingSummary } from '../lib/sectionSummary';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

const payload = codeOnly(read('lib', 'deedPayload.ts'));

describe('DEED-POLISH #3 — a collapsed section reports every field it holds', () => {
  it('names all five, not just the requester', () => {
    /**
     * THE FINDING: the fields were never missing. Inputs, state, payload,
     * proxy, metadata and twenty-four templates all carried them — and the
     * officer who commissioned the feature concluded it did not exist,
     * because the collapsed summary read `requestedBy` alone and therefore
     * read as ANSWERED.
     */
    const s = recordingSummary({
      requestedBy: 'Acme Escrow',
      requestedByAddress: '456 Escrow Way, Los Angeles, CA 90012',
      returnTo: 'grantee',
      titleOrderNo: 'TC-2026-12345',
      escrowNo: 'ESC-789456',
    });
    expect(s).toContain('Acme Escrow');
    expect(s).toContain('456 Escrow Way');
    expect(s).toContain('returns to grantee');
    expect(s).toContain('TC-2026-12345');
    expect(s).toContain('ESC-789456');
  });

  it('makes a MISSING escrow number legible by contrast', () => {
    // The whole point: from the collapsed state, without expanding and
    // scrolling past a divider. The order number is named, the escrow
    // number is absent from the line, and the difference is visible.
    /* PINNED AT THE LABEL, NOT THE WORD. The first version forbade
       'Escrow' anywhere and tripped on the fixture's own requester name,
       "Acme Escrow" — §14.1, matching the spelling instead of the
       property. The requester here is deliberately named without it. */
    const s = recordingSummary({ requestedBy: 'Pacific Coast Title', titleOrderNo: 'TC-1' });
    expect(s).toContain('Order TC-1');
    expect(s).not.toContain('Escrow ');
  });

  it('labels the reference numbers rather than showing them bare', () => {
    // Two unlabelled identifiers side by side are indistinguishable, which
    // defeats the reason for surfacing them at all.
    const s = recordingSummary({ titleOrderNo: 'TC-1', escrowNo: 'ESC-2' });
    expect(s).toBe('Order TC-1 · Escrow ESC-2');
  });

  it('falls back to a prompt when the section is genuinely empty', () => {
    expect(recordingSummary({})).toBe(RECORDING_EMPTY);
    expect(recordingSummary({ requestedBy: '   ' })).toBe(RECORDING_EMPTY);
  });

  it('the summary is not clipped to one line by its container', () => {
    /* Fixing the summary's CONTENT without its CONTAINER reproduces the
       defect one layer out: `truncate` clips the LAST items, which are
       exactly the reference numbers this ticket exists to surface. */
    const section = codeOnly(read('components', 'builder', 'InputSection.tsx'));
    expect(section).not.toMatch(/truncate/);
    expect(section).toContain('line-clamp-2');
  });

  it('the panel feeds the summary all five fields', () => {
    // Pinned at the CALL, not the import: a summary helper that is imported
    // and passed one field is the same defect with more ceremony.
    const panel = codeOnly(read('components', 'builder', 'InputPanel.tsx'));
    const call = panel.slice(panel.indexOf('recordingSummary({'));
    const body = call.slice(0, call.indexOf('})'));
    for (const field of ['requestedBy', 'requestedByAddress', 'returnTo',
                         'titleOrderNo', 'escrowNo']) {
      expect(body).toContain(field);
    }
  });
});

describe('DEED-POLISH #1 — the return-to address', () => {
  it('sends the requester address in the mail-to block', () => {
    /* It sent a bare string, which the backend widened to {name} and no
       more — so "When Recorded, Return To" printed a name with nowhere to
       send it. The address was in `requestedByAddress` all along. */
    const block = payload.slice(payload.indexOf('return_to:'));
    expect(block.slice(0, 600)).toContain('requestedByAddress');
  });

  it('does NOT parse the address into city/state/zip', () => {
    /* OWNER-RULED: one officer-typed line in, one line out. Splitting it
       means guessing, and a WRONG city on a mail-to block is worse than an
       absent one — it looks filled rather than incomplete. Same argument
       that kept the PCOR buyer address empty. */
    const block = payload.slice(payload.indexOf('return_to:'));
    const requesterBranch = block.slice(block.indexOf(': {', block.indexOf('address1')));
    expect(requesterBranch).not.toMatch(/requestedByAddress[\s\S]{0,200}\bcity:/);
  });
});

describe('DEED-POLISH #1 — the discriminator that would have rotted silently', () => {
  const resume = codeOnly(read('lib', 'deedResume.ts'));

  it('no longer decides the mail-to choice from the TYPE alone', () => {
    /**
     * THE NEAR-MISS. Resume read `typeof meta.return_to === 'object'` to
     * mean "grantee" — sound only while the requester branch sent a bare
     * STRING. Giving the requester an address makes it an object too, so
     * the old test would have flipped every requester-return draft to
     * "Grantee" on resume, SILENTLY CHANGING WHERE THE DEED MAILS.
     *
     * The reliable difference is the structured address block: only the
     * grantee branch carries city/state/zip, and it carries the KEYS even
     * when the property has no city — so presence, not truthiness.
     */
    expect(resume).toContain("'city' in");
    expect(resume).not.toMatch(
      /typeof meta\.return_to === 'object'\s*\?\s*'grantee'/);
  });

  it('the requester branch must never grow a city key', () => {
    // The inference above depends on it. Pinned here so a future edit to
    // the payload cannot quietly invalidate a file it does not touch.
    const block = payload.slice(payload.indexOf('return_to:'));
    const requester = block.slice(block.indexOf('name: genState.requestedBy'));
    expect(requester.slice(0, 200)).not.toContain('city:');
  });
});
