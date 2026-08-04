/**
 * T-3 — the PCOR offer says what it is and what it is not.
 *
 * The copy rule here is the standing no-unearned-claims rule applied to
 * a number that would have been very easy to state: we fill nine of the
 * form's sixty-five text fields. "80% prefilled" was the phrase in the
 * original ticket and it is not supportable, so the offer says
 * "everything your deed already knows" and then LISTS what it doesn't.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'deed-builder', '[type]', 'success',
            'success-content.tsx'), 'utf8');
const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('T-3 — the PCOR package offer', () => {
  it('uses the ruled copy and states the statutory basis', () => {
    expect(code).toContain('Pre-filled with everything your deed already knows');
    expect(code).toMatch(/480\.3/);
  });

  it('claims no percentage', () => {
    // The phrase from the original ticket, and any sibling.
    expect(code).not.toMatch(/\d+%\s*(pre-?filled|complete)/i);
    expect(code).not.toMatch(/80%/);
  });

  it('lists what the buyer still has to complete', () => {
    expect(code).toContain('still_needed');
    expect(code).toContain('The buyer still completes');
  });

  it('says the certification is left blank, and why', () => {
    expect(code).toMatch(/certification and signature are left blank/);
    expect(code).toMatch(/sworn statement/);
  });

  it('tells the officer the form stays fillable', () => {
    expect(code).toMatch(/stays fillable/);
  });

  it('hides the offer rather than inventing one when the check fails', () => {
    // `pcor` stays null on error, and the block is gated on
    // `pcor?.available` — no optimistic default.
    expect(code).toMatch(/pcor\?\.available/);
    expect(code).not.toMatch(/available:\s*true/);
  });

  it('downloads through an authenticated blob fetch, not a bare href', () => {
    expect(code).toContain("'pcor.pdf'");
    expect(code).toContain("'death-statement.pdf'");
    expect(code).toMatch(/Authorization.*Bearer/);
  });
});

describe('T-3b — the BOE-502-D offer', () => {
  it('is offered filled when we hold the county form', () => {
    expect(code).toContain('deathStatement?.available');
    expect(code).toContain('Change in Ownership Statement');
    expect(code).toContain('Pre-filled with everything this affidavit already knows');
  });

  it('claims no percentage here either', () => {
    // Scoped to CLAIMS, not to the character: this file also contains a
    // CSS keyframe block whose 0%/50%/100% are not assertions about
    // anything. A pin that cannot tell a claim from a stylesheet is a pin
    // that gets deleted by the next person who trips on it.
    expect(code).not.toMatch(/\d+%\s*(pre-?filled|complete|done|filled)/i);
  });

  it('the passive notice survives ONLY as the fallback', () => {
    // The FORMS flag-4 notice was passive because form-fill was deferred.
    // It must not disappear — counties we do not hold still need it — but
    // it must not compete with a filled form either.
    expect(code).toContain('!deathStatement?.available && formConfig(type)?.companionNotice');
  });

  it('says the legal characterisation is the officer\'s to mark', () => {
    expect(code).toMatch(/How title passed is a legal characterisation/);
  });

  it('says the certification is blank and the form stays fillable', () => {
    expect(code).toMatch(/certification and signature are blank/);
    expect(code).toMatch(/stays fillable/);
  });
});

describe('T-4 — the file, and what it refuses to carry', () => {
  it('threads documents by the officer\'s own escrow number', () => {
    expect(code).toContain('matter?.grouped');
    expect(code).toMatch(/File \{matter\.key\?\.value\}/);
  });

  it('offers "start related document"', () => {
    expect(code).toContain('Start related document');
    expect(code).toContain('carryFrom=');
  });

  it('says the carried facts keep their ORIGINAL confirmation times', () => {
    // Doctrine §10: a re-stamped confirmation forges a second look.
    expect(code).toMatch(/original confirmation times/i);
  });

  it('names what did not carry rather than leaving a silent gap', () => {
    // A blank transfer-tax section looks like a bug; naming the omission
    // is the difference between deliberate and forgotten.
    expect(code).toContain('not_carried');
    expect(code).toMatch(/Not carried:/);
  });

  it('does not present a first document as an error', () => {
    expect(code).toMatch(/first document on this file/);
  });
});
