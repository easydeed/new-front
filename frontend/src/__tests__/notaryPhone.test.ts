/**
 * NOTARYPHONE1 — the screen nobody signs in to.
 *
 * ═══ WHO THIS IS FOR ═══
 *
 * The notary is not our customer. She has no account, no password, no
 * support relationship, and she is on her phone because a token arrived
 * by email. Every allowance the rest of this product gets — a wide
 * viewport, a session to come back to, a person to call — she does not
 * have.
 *
 * ═══ THE TRUNCATION ═══
 *
 * The availability rows sat in `grid-cols-2` at every width. That is
 * ~150px per control on a phone; Chrome needs about 200px to render a
 * `datetime-local`. So it truncated, and what she saw after typing a
 * date and a time was
 *
 *     2026 10:00 AM
 *
 * with the date gone. She could not check the time she had just entered.
 *
 * The officer's own dispatch inputs, one file over in
 * `RequestSigningModal`, have had `grid-cols-1 sm:grid-cols-2` with
 * labels the whole time. **The pattern already existed in this
 * codebase.** The surface that got the worse version is the one used by
 * somebody who cannot complain to us.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');
const NOTARY = codeOnly(read('app', 'signing', '[token]', 'page.tsx'));
const OFFICER = codeOnly(read('features', 'signing', 'RequestSigningModal.tsx'));

/** Every datetime-local on the token surface, with its surroundings. */
const dateInputs = (src: string) =>
  src.split('type="datetime-local"').slice(1);

describe('the inputs fit the phone they are used on', () => {
  it('no datetime control is forced into a half-width column', () => {
    /** THE PIN THIS FILE EXISTS FOR. `grid-cols-2` without a breakpoint
     *  is the truncation, and it is the only spelling of it. */
    expect(NOTARY).not.toContain('grid grid-cols-2');
    expect(NOTARY).toContain('grid-cols-1 sm:grid-cols-2');
  });

  it('and the officer surface, which was already right, still is', () => {
    // The comparison that makes the finding a finding: the pattern was
    // here, one file over, the whole time.
    expect(OFFICER).toContain('grid-cols-1 sm:grid-cols-2');
  });

  it('every datetime input fills its column rather than a fixed width', () => {
    for (const after of dateInputs(NOTARY)) {
      expect(after.slice(0, 300)).toContain('w-full');
    }
  });
});

describe('every control has a name', () => {
  it('each datetime input carries an id, and a label points at it', () => {
    /**
     * Two identical controls side by side. Without names, a screen
     * reader announces "date and time" twice and the difference between
     * them — which one is the start — is carried entirely by position.
     */
    const ids = NOTARY.match(/id=\{?[`'"]([a-z-]+(-\$\{i\})?)[`'"]\}?/g) || [];
    expect(ids.length).toBeGreaterThanOrEqual(4);
    for (const name of ['Starts', 'Ends']) {
      expect(NOTARY).toContain(`>\n                        ${name}\n`);
    }
    expect(NOTARY).toContain('htmlFor={`start-${i}`}');
    expect(NOTARY).toContain('htmlFor={`end-${i}`}');
    expect(NOTARY).toContain('htmlFor="propose-start"');
    expect(NOTARY).toContain('htmlFor="propose-end"');
  });

  it('the count of labels matches the count of inputs', () => {
    // A label added to one of a pair is the failure the register form
    // had: the half that is covered hides that the other half is not.
    const inputs = dateInputs(NOTARY).length;
    const labels = (NOTARY.match(/htmlFor=/g) || []).length;
    expect(labels).toBe(inputs);
  });
});

describe('a disabled button says why', () => {
  it('an incomplete row is explained, not silently ignored', () => {
    /**
     * A browser hands back `''` for a half-typed datetime, so a date
     * with no time reads to this code exactly like an empty field. Post
     * greys out and the most likely mistake is indistinguishable from
     * having typed nothing.
     *
     * §4 wearing a UI hat: the product declined and did not say so.
     */
    expect(NOTARY).toContain('const incomplete =');
    expect(NOTARY).toContain('needs both a start and an end');
    expect(NOTARY).toContain('Add a time you are free');
  });

  it('the two cases are told apart', () => {
    // "You have not started" and "you started and stopped halfway" are
    // different mistakes and need different sentences.
    expect(NOTARY).toContain('incomplete\n                  ?');
  });

  it('the explanation is announced, not merely coloured', () => {
    expect(NOTARY).toContain('role="status"');
  });
});

describe('"Another" is not one-way', () => {
  it('a row can be removed once there is more than one', () => {
    // A row added by a mis-tap could not be taken back, and a
    // half-filled one disabled Post with no way to clear it.
    expect(NOTARY).toContain('Remove');
    expect(NOTARY).toContain('p.filter((_, n) => n !== i)');
  });

  it('the remove control names which row it removes', () => {
    expect(NOTARY).toContain('aria-label={`Remove time ${i + 1}`}');
  });

  it('the last row cannot be removed', () => {
    // Zero rows is a form with nothing to fill in and no way back.
    expect(NOTARY).toContain('rows.length > 1 &&');
  });
});
