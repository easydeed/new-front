/**
 * DASH3 — the rulings the redesign could undo without failing anything.
 *
 * Three of the owner's five rulings had no pin after the build: the
 * hero's unit, the colour ruling, and the cut chip annotations. All three
 * are the kind a later edit reverses while every gate stays green — the
 * hero by growing a client-side `.reduce`, the colour by "matching the
 * mockup", the annotations by being helpful. They are pinned here.
 *
 * The last two cases are not rulings but FAILURES this ticket produced
 * and had to find twice over. Both are pinned so the next build cannot
 * repeat them quietly.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

const DASH = codeOnly(read('app', 'dashboard', 'page.tsx'));
const WORKLIST = codeOnly(read('features', 'dashboard', 'Worklist.tsx'));
const CHIPS = codeOnly(read('features', 'dashboard', 'StartSomethingNew.tsx'));

describe('DASH3 ruling 2 — the hero counts rows, and the server counts them', () => {
  it('reads the count rather than deriving one', () => {
    /**
     * The headline and the body are the same arithmetic, not two
     * arithmetics that agree. `hero_count()` sums the groups the server
     * sends and the page prints that number, so "3 things need you" over
     * four rows is not a bug that can exist.
     *
     * A client-side sum is what makes it possible: it looks like the
     * same number and diverges the first time the two filter differently
     * — which is precisely how the accuracy figure and the queue came to
     * disagree in DASH-FIX.
     */
    expect(DASH).toContain('worklist?.count');
    // No second opinion about the count, in any of the shapes one takes.
    expect(DASH).not.toMatch(/worklist[\s\S]{0,80}\.groups[\s\S]{0,80}reduce/);
    expect(DASH).not.toMatch(/groups[\s\S]{0,60}\.items\.length/);
  });

  it('never prints a figure it did not receive', () => {
    // Ruled before DASH3 and kept: an absent count is not zero. The
    // count is read with `?? 0` and the ZERO branch renders words, not a
    // numeral — so a queue that answered without a worklist cannot print
    // "0 things need you" as though it had counted.
    expect(DASH).toContain('worklistCount === 0');
  });
});

describe('DASH3 ruling 4 — queue state is neutral, and said in words', () => {
  it('spines carry no doctrinal colour', () => {
    /**
     * Amber is unconfirmed external data and violet is a proposed legal
     * choice (docs/BRAND.md). The mockup spends both on queue state,
     * which is the correction ADMIN-BRAND already made once. One mockup
     * row lands on violet correctly — an unconfirmed exemption — and
     * that is coincidence, not compliance.
     */
    const spine = WORKLIST.slice(WORKLIST.indexOf('const SPINE'),
                                 WORKLIST.indexOf('export default'));
    expect(spine).not.toMatch(/amber|violet|purple|yellow|red-|emerald/);
    expect(spine).toMatch(/gray/);
  });

  it('says the state in words, so colour is never the only carrier', () => {
    // The same rule the setup checklist got: a reader who cannot
    // distinguish two greys still reads "Gone quiet".
    expect(WORKLIST).toContain('{row.tag}');
  });
});

describe('DASH3 ruling 5 — the chips do not annotate themselves', () => {
  it('carries no "most used" or "N this year"', () => {
    /**
     * Cut by ruling: a strip for starting something new does not need to
     * report her filing history back to her, and "1 this year" beside an
     * instrument reads as a judgement of how little she has used it.
     */
    expect(CHIPS.toLowerCase()).not.toContain('most used');
    expect(CHIPS).not.toMatch(/this year/i);
  });
});

describe('DASH3 — the two failures this ticket found in itself', () => {
  it('declares every hook before the first early return', () => {
    /**
     * FOUND BY `eslint`, WHICH IS NOT A GATE HERE.
     *
     * I first declared the greeting's `useState`/`useEffect` beside the
     * markup that uses them, which is after `if (loading) return …`. The
     * first paint then runs two fewer hooks than the second, and React
     * tears the component down the moment the profile answers — a crash
     * on the one screen every user lands on.
     *
     * tsc is blind to it. Jest is blind to it here, because these suites
     * read source text rather than mounting through the transition.
     * `react-hooks/rules-of-hooks` sees it, and `next.config` sets
     * `eslint.ignoreDuringBuilds: true`, so nothing we run in CI would
     * have stopped it. This pin is the control that survives that.
     */
    const body = DASH.slice(DASH.indexOf('export default function Dashboard'));
    const firstReturn = body.search(/\n  if \([\s\S]{0,60}\) \{\n    return/);
    expect(firstReturn).toBeGreaterThan(0);
    const after = body.slice(firstReturn);
    expect(after).not.toMatch(/\buseState\s*[(<]/);
    expect(after).not.toMatch(/\buseEffect\s*\(/);
  });

  it('a failed deed list is a result of its own, above both empty ones', () => {
    /**
     * F4's ruling, which DASH3 nearly deleted as dead code.
     *
     * A failed `/deeds` load leaves the list empty, which makes
     * `hasDeeds` false, which lands on "Nothing here yet." — the
     * first-run welcome, shown to an officer whose documents merely
     * failed to load. The error state's RENDERER had gone with the feed
     * while the error itself was still being set, and an error that
     * renders nothing is indistinguishable from having nothing.
     *
     * Pinned as ORDER rather than distance: the failure branch must be
     * reached before either claim about her documents.
     */
    expect(DASH).toContain('deedsError ?');
    const fail = DASH.indexOf('deedsError ?');
    expect(fail).toBeGreaterThan(0);
    expect(fail).toBeLessThan(DASH.indexOf('hasDeeds ?'));
  });
});
