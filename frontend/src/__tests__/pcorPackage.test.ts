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
    expect(code).toContain('/pcor.pdf');
    expect(code).toMatch(/Authorization.*Bearer/);
  });
});
