/**
 * What a brand-new officer is shown, and what she is no longer shown.
 *
 * ═══ THREE GUARANTEED-EMPTY MODULES ═══
 *
 * `docs/design/dashboard_day_one.html` was committed with the other
 * mockups and never referenced in a ticket. Diffing it against what
 * shipped found its whole critique still standing: on her first morning
 * an officer was told "Nothing is waiting on anyone", told separately
 * that "Every field on every open document is confirmed", and then
 * welcomed with four bullets describing what the product does.
 *
 * None of the three could have said anything else. She had no documents,
 * so the first two were arithmetic on an empty set, and the third was
 * landing-page copy shown to somebody who had already signed up — the
 * mockup's own line is that "a welcome banner can't notice anything".
 *
 * ═══ AND ONE OF THEM WAS THREE TICKETS OLD ═══
 *
 * The accuracy card is mine, built after getting the identical class
 * right on ResumeCard in the same session — which is the argument for
 * pinning the property here rather than trusting that the lesson
 * transferred. It demonstrably did not.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { codeOnly } from '../test-support/sourceText';

const SRC = join(__dirname, '..');
const DASHBOARD = join(SRC, 'app', 'dashboard', 'page.tsx');

const dashboard = () => codeOnly(readFileSync(DASHBOARD, 'utf8'));

describe('the day-one dashboard', () => {
  it('no longer welcomes her with four bullets about the product', () => {
    /**
     * Matched on the copy itself rather than on the component name: a
     * component renamed is the same four sentences, and it is the
     * sentences the ruling was about (§14.1).
     */
    const src = dashboard();
    for (const bullet of [
      "I'll find the property data",
      "I'll format the names",
      'including city rates',
      'in under 2 minutes',
      'Welcome to your dashboard',
    ]) {
      expect(src).not.toContain(bullet);
    }
  });

  it('has no call sites left for the empty-state banner component', () => {
    // Deleted rather than left orphaned. A zero-call-site component is
    // the shape this project has twice found already broken.
    expect(dashboard()).not.toContain('AIEmptyState');
    expect(() => readFileSync(join(SRC, 'components', 'ui', 'AIEmptyState.tsx')))
      .toThrow();
  });

  it('withholds the empty queue card from someone who has made nothing', () => {
    /**
     * A textual pin on a rendering condition, and said so: what must be
     * true is that "Nothing is waiting on anyone" never reaches an
     * officer with no deeds. The condition that holds it is one line,
     * so the pin checks that the line is there and the render path
     * still depends on `hasDeeds`.
     */
    const src = dashboard();
    expect(src).toContain('if (empty && !hasDeeds) return null');
    expect(src).toContain('hasDeeds={hasDeeds}');
    // And the sentence itself is still present — this ticket suppressed
    // it for one population, it did not delete it. The returning half is
    // held for a ruling, and if this assertion ever fails it should be
    // because that ruling arrived.
    expect(src).toContain('Nothing is waiting on anyone');
  });

  it('still says plainly when the queue could not load', () => {
    // §4 survives the cleanup: an empty state we suppressed must not
    // become a silent failure. The error branch is untouched.
    expect(dashboard()).toContain("Couldn't load what's waiting");
  });
});
