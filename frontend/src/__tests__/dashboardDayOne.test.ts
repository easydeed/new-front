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

  it('day one and all-clear are DIFFERENT results, still', () => {
    /**
     * #206's ruling, and DASH3 had to carry it deliberately because the
     * v2 design collapses them: its "All clear" state renders the same
     * screen for an officer who cleared her board and one who has never
     * made a deed. Collapsing them would congratulate somebody on her
     * first morning for finishing nothing.
     *
     * The IMPLEMENTATION changed — it was a suppression
     * (`if (empty && !hasDeeds) return null`), and it is now three
     * explicit branches, because a worklist has to say something in all
     * three cases rather than render nothing in one of them.
     *
     * Pinned as the property: the clear sentence is reachable only with
     * deeds, and the day-one branch says something else.
     */
    const src = dashboard();
    expect(src).toContain('Nothing needs you.');
    expect(src).toContain('Nothing here yet.');
    // ORDER, not distance. The first version of this line measured 600
    // characters between the gate and the sentence and failed at 640 —
    // §14.1.1's fixed-window mistake, written by the author of the entry
    // that records it, two days later. A comment explaining the branch
    // is enough to move a character count; nothing about a comment can
    // move the ORDER of the branches.
    const gate = src.indexOf(') : hasDeeds ? (');
    const clearAt = src.indexOf('Nothing needs you.');
    const dayOneAt = src.indexOf('Nothing here yet.');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(clearAt);
    expect(clearAt).toBeLessThan(dayOneAt);
  });

  it('§16 — the greeting rides on the headline instead of leading', () => {
    /**
     * The ruling was that the greeting should not be BURIED under three
     * cards. It was pinned as "AIGreeting renders above ResumeCard",
     * which asserted an order between two components DASH3 removes —
     * the resume card rehomed into the first your-turn row, and the
     * greeting demoted onto the headline.
     *
     * The intent survives and is stronger: the greeting is now on the
     * first line of the page, beside the number she came for, rather
     * than above the work in a block of its own.
     */
    const src = dashboard();
    expect(src).toContain('greetingLine');
    expect(src).not.toContain('<AIGreeting');
    // And it is still HER greeting — the shared one, not a second
    // opinion about what hour it is (§14.3).
    expect(src).toContain('getTimeGreeting()');
  });

  it('still says plainly when the queue could not load', () => {
    // §4 survives the cleanup: an empty state we suppressed must not
    // become a silent failure. The error branch is untouched.
    expect(dashboard()).toContain("Couldn't load what's waiting");
  });
});

describe('the trial length', () => {
  it('is declared in exactly one place on this side of the wire', () => {
    /**
     * It lived as a `const` in the landing page with a comment saying
     * "one number, stated once per side" — true while the landing page
     * was the only surface that mentioned it. The day-one rail is a
     * second surface, so the number moved to `lib/trial.ts` and both
     * import it.
     *
     * TRIAL1's mirror compares that file with the server's
     * TRIAL_PERIOD_DAYS. A screen that retypes the digits is a second
     * claim the mirror would not see, so this counts declarations.
     */
    const { readdirSync, statSync } = require('fs');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry !== '__tests__' && entry !== 'node_modules') walk(full);
        } else if (/\.tsx?$/.test(entry)) files.push(full);
      }
    };
    walk(SRC);
    const declarations = files.filter((f) =>
      /(?:const|let|var)\s+TRIAL_DAYS\s*=/.test(readFileSync(f, 'utf8')));
    expect(declarations.map((f) => f.replace(SRC, ''))).toEqual(['/lib/trial.ts']);

    // And nowhere writes the length as prose instead of importing it.
    for (const f of files) {
      if (f.endsWith('lib/trial.ts')) continue;
      expect(codeOnly(readFileSync(f, 'utf8')))
        .not.toMatch(/\d+[\s-]day (?:free )?trial/i);
    }
  });
});
