/**
 * DASH-FIX #3 and #5 — one word doing two jobs, and one date doing two.
 *
 * ═══ THE FINDING ═══
 *
 * An audit found a single document reported three ways on three
 * surfaces: badged "Completed" in Recently worked on, listed under
 * "Waiting on a reply" in the queue, and "Out for signing" in its own
 * record. All three read real data; only one answered the question.
 *
 * `deeds.status = 'completed'` means THE DOCUMENT WAS GENERATED. It says
 * nothing about signing, sending, or recording. Rendering it as
 * "Completed" invites the one reading the product has no evidence for.
 *
 * The same audit found the same shape in a date: the dashboard renders
 * `updated_at`, Past Deeds renders `created_at`, and both showed a bare
 * date. The same document read 7/29 in one place and 07/28 in the other.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { codeOnly } from '../test-support/sourceText';
import {
  authoringStateLabel, LAST_WORKED_ON,
} from '../lib/authoringState';

const SRC = join(__dirname, '..');
const read = (...p: string[]) => codeOnly(readFileSync(join(SRC, ...p), 'utf8'));

describe('authoring state is labelled as authoring state', () => {
  it('never renders a generated document as "Completed"', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR. Authoring-complete is not
     * transaction-complete, and "Completed" is only ever read as the
     * second one.
     */
    expect(authoringStateLabel('completed')).toBe('Prepared');
    expect(authoringStateLabel('COMPLETED')).toBe('Prepared');
    expect(authoringStateLabel(' completed ')).toBe('Prepared');
  });

  it('leaves the authoring words that were never mistakable', () => {
    expect(authoringStateLabel('draft')).toBe('Draft');
    expect(authoringStateLabel('in_progress')).toBe('In progress');
    expect(authoringStateLabel(null)).toBe('Draft');
  });

  it('shows an unrecognised status as itself rather than guessing', () => {
    /** §4 — a token we do not know is not evidence of any state. */
    expect(authoringStateLabel('quarantined')).toBe('quarantined');
  });

  it('needs no tooltip to be safe, and carries none', () => {
    /**
     * OWNER-RULED, cutting something added one PR earlier. The badge
     * carried a `title` gloss saying the word meant nothing about
     * signing or recording — invisible on touch and to anybody not
     * hovering, so the qualification reached only some readers.
     *
     * A caveat only some readers get is worse than a word that does not
     * need one. And "Prepared" does not need one: it is an ADJECTIVE
     * ABOUT THE DOCUMENT rather than a claim about the transaction,
     * which was the rename's whole purpose.
     */
    const src = codeOnly(readFileSync(join(SRC, 'lib', 'authoringState.ts'), 'utf8'));
    expect(src).not.toMatch(/export function authoringStateHint/);
    // The gloss is gone from everywhere rather than from one call site.
    // NOT asserted as "no `title=` on the dashboard": three QueueList
    // headings legitimately carry one, and a pin that forbids an
    // attribute rather than a claim would have made those a violation.
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) {
          // __tests__ excluded, and the reason is this very assertion:
          // codeOnly strips comments but NOT string contents, so the
          // pin searching for the name would find its own search term.
          if (e !== 'node_modules' && e !== '__tests__') walk(full);
        } else if (/\.tsx?$/.test(e)) files.push(full);
      }
    };
    walk(SRC);
    for (const f of files) {
      expect(codeOnly(readFileSync(f, 'utf8'))).not.toContain('authoringStateHint');
    }
  });

  it('is the only place either surface turns the column into English', () => {
    /**
     * §13 rule 3. The dashboard rendered `{deed.status}` RAW — the badge
     * was the database's own token — while Past Deeds carried a private
     * `labels` map saying "Completed". Two surfaces, two vocabularies,
     * neither citing the other.
     */
    const dash = read('app', 'dashboard', 'page.tsx');
    const past = read('app', 'past-deeds', 'page.tsx');
    /* §16 — SATISFIED BY SUBTRACTION. The dashboard used the shared
       label because it rendered a deed feed. DASH3 removed the feed, so
       the dashboard now turns the column into English NOWHERE, which is
       a stronger form of "not a second vocabulary" than citing the
       first one. The prohibition is what carries the ruling here, and
       it is the half that could regress. */
    expect(dash).not.toContain('deed.status');
    expect(dash).not.toContain('{deed.status || ');
    expect(past).toContain('authoringStateLabel(status)');
    expect(past).not.toMatch(/completed:\s*"Completed"/);
  });

  it('lets no surface write its own status vocabulary', () => {
    /** §14.1 — the property, not the spelling: any file mapping the
     *  three status tokens to display strings of its own is a second
     *  vocabulary, whatever the map is called. */
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) {
          if (e !== '__tests__' && e !== 'node_modules') walk(full);
        } else if (/\.tsx?$/.test(e)) files.push(full);
      }
    };
    walk(SRC);
    const carriers = files.filter((f) => {
      const src = codeOnly(readFileSync(f, 'utf8'));
      return /completed:\s*['"]Completed['"]/.test(src)
          || /in_progress:\s*['"]In Progress['"]/i.test(src);
    });
    expect(carriers.map((f) => f.replace(SRC, ''))).toEqual([]);
  });
});

describe('a date carries the name of the column it came from', () => {
  it('the dashboard says which date it is showing', () => {
    /**
     * DASH-FIX #5. The dashboard is RIGHT to sort and show `updated_at`
     * — "Recently worked on" is the module's whole purpose — but a bare
     * date invites a reader to compare it with a creation date elsewhere
     * and conclude one of them is broken.
     */
    /* §16 — THE SUBJECT IS GONE AND IS REPORTED, NOT RE-HOMED.
       DASH-FIX #5 ruled that "Recently worked on" must name the date it
       shows. DASH3 removed that module, so there is no bare date on the
       dashboard to mislabel — the worklist shows an AGE ("8 days",
       "age unknown"), which is a different thing said in its own words.
       The constant and the rule stay for Past Deeds and for whatever
       shows a raw date next; what does not happen is quietly declaring
       the worklist's age to be the same ruling satisfied. */
    const dash = read('app', 'dashboard', 'page.tsx');
    expect(dash).not.toMatch(/formatDate\(deed\.(updated_at|created_at)/);
    expect(LAST_WORKED_ON).toBe('Last worked on');
  });

  it('leaves Past Deeds showing what it has always shown', () => {
    /** Its column IS creation, and its table has a header saying so.
     *  The defect was never that the two differed — it was that neither
     *  said which it was. */
    expect(read('app', 'past-deeds', 'page.tsx'))
      .toContain('formatDate(deed.created_at)');
  });
});
