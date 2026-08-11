/**
 * FLOW1 item 0 — the Shared Deeds screen, from the screen's side.
 *
 * ═══ THE DEFECT THESE PINS EXIST FOR ═══
 *
 * An audit reported this page as rendering FABRICATED rows: Invalid
 * Date, NaN days left, blank Deed Type, blank Shared With, and a Status
 * of "Viewed" beside a Response of "Not viewed" — with a row count that
 * happened to equal the number of completed deeds, which reads like the
 * page synthesising rows out of the deeds list.
 *
 * It was not synthesising anything. It fetched `GET /shared-deeds` and
 * rendered the real rows — through EIGHT WRONG KEY NAMES. A key that
 * does not exist is `undefined`, `undefined` renders as an empty cell,
 * and `new Date(undefined)` renders as Invalid Date. Every symptom in
 * that report is one of those eight.
 *
 * ═══ WHAT IS PINNED, AND WHY THOSE THINGS ═══
 *
 *  1. THE ROWS COME FROM THE SHARE FETCH AND NOTHING ELSE. This is the
 *     owner's ruling written as a test. The report's hypothesis was
 *     synthesis; the hypothesis was wrong today and the pin is what
 *     keeps it wrong tomorrow. `sharedDeeds` may be filled from the
 *     `/shared-deeds` response and from no other source.
 *
 *  2. THE INTERFACE MATCHES THE SERVER'S PAYLOAD BY EQUALITY, against
 *     the corpus the backend row builder asserts itself against. Two
 *     declarations of one contract, in two languages, neither reading
 *     the other, is exactly how eight fields drifted unnoticed. Now they
 *     read the same list.
 *
 *  3. NO DATE REACHES THE SCREEN UNGUARDED. "Invalid Date" is not a
 *     cosmetic bug on a tracking surface — it is the screen asserting a
 *     fact it does not hold, in the same typeface as the facts it does.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { codeOnly } from '../test-support/sourceText';

const SRC = path.join(__dirname, '..');
const PAGE_PARTS = ['app', 'shared-deeds', 'page.tsx'];
const PAGE = fs.readFileSync(path.join(SRC, ...PAGE_PARTS), 'utf8');
const PAGE_CODE = codeOnly(PAGE);
/** JSX wraps wherever the formatter chose to, so a sentence in the
 * source is not a sentence in a string. Flatten before asserting on a
 * multi-line expression — otherwise the pin passes or fails on
 * whitespace. */
const FLAT = PAGE_CODE.replace(/\s+/g, ' ');

/** The corpus the BACKEND row builder also reads — same referee, two
 * languages. `backend/services/shared_deed_row.py` asserts its emitted
 * key set equals this; the test below asserts the interface does. */
const CONTRACT: string[] = JSON.parse(
  fs.readFileSync(
    path.join(SRC, '..', '..', 'backend', 'services', 'shared_deed_row_keys.json'),
    'utf8',
  ),
).keys;

/** Field names declared by `interface SharedDeed { ... }`.
 *
 * Read from the RAW source, not `codeOnly()` — the interface carries
 * doc comments and stripping them is unnecessary here, while the brace
 * matching below needs the block intact. */
function interfaceFields(source: string, name: string): string[] {
  const start = source.indexOf(`interface ${name} {`);
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  let end = -1;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  expect(end).toBeGreaterThan(start);
  const body = codeOnly(source.slice(start, end));
  // Only top-level members: a nested object type would indent further,
  // and there are none today — if one appears, this pin should be the
  // thing that notices.
  const fields: string[] = [];
  for (const line of body.split('\n')) {
    const m = /^\s{2}([a-z_][a-z0-9_]*)\??\s*:/i.exec(line);
    if (m) fields.push(m[1]);
  }
  return fields;
}

/**
 * ═══ RETARGET, 2026-08-11 — READ THIS BEFORE TRUSTING THE PIN BELOW ═══
 *
 * This block was written one day before it was changed, and a pin
 * loosening a pin one day later has to carry its own justification where
 * the next reader will find it. So:
 *
 * **What it said.** "The rows come from the share fetch AND NOTHING
 * ELSE", enforced as: exactly one `setSharedDeeds(` call, one
 * `/shared-deeds` fetch, no `/deeds` fetch.
 *
 * **Why it said that.** An audit reported this page as synthesising rows
 * out of the officer's completed-deed list, because the row count
 * happened to equal the completed-deed count. It was not — the count was
 * one share per completed deed — but "it isn't doing that today" is an
 * observation, and the pin turned it into a property.
 *
 * **What changed.** FLOW1 item 3 unified the two officer trackers: this
 * screen now also shows NOTARY2 signings, which live in
 * `signing_requests` and arrive from `/signing-requests/v2`. Under the
 * old wording that second fetch is forbidden.
 *
 * **Why this is a retarget and not a loosening.** The property was never
 * "one fetch". It was **every row is a thing that was actually sent to
 * somebody.** A share was sent. A signing request was sent. A completed
 * deed sitting in her list was not sent to anyone, and a row for it
 * would be a tracking screen reporting an event that never happened.
 *
 * So the prohibition is unchanged and is now stated as itself, by name,
 * rather than implied by a fetch count: THE DEEDS LIST IS NOT A SOURCE
 * OF ROWS. The allowance is explicit and enumerated — two feeds, both of
 * things that left the building — and adding a third would have to be
 * written down here, which is the point.
 */
describe('FLOW1 — every row on Shared Deeds is a thing that was sent', () => {
  it('fills the table from the two feeds of things that were sent', () => {
    expect(PAGE_CODE).toContain('apiFetch(`/shared-deeds`');
    expect(FLAT).toContain('apiFetch( `/signing-requests/v2`');
    // Each feed is written into its own state, once. Two feeds, two
    // writers — not one writer that could be handed anything.
    expect((PAGE_CODE.match(/setSharedDeeds\s*\(/g) || [])).toHaveLength(1);
    expect((PAGE_CODE.match(/setSignings\s*\(\s*Array/g) || [])).toHaveLength(1);
  });

  it('never derives rows from the deeds list', () => {
    // The reported hypothesis, forbidden by name rather than by
    // arithmetic on fetch counts. A completed deed was not sent to
    // anybody; a row for one would be invariant #4 on the surface whose
    // whole job is to say what happened.
    for (const forbidden of [
      /apiFetch\(\s*[`'"]\/deeds/,
      /apiFetch\(\s*[`'"]\/api\/deeds/,
      /setSharedDeeds\s*\(\s*deeds/,
      /setSignings\s*\(\s*deeds/,
    ]) {
      expect(PAGE_CODE).not.toMatch(forbidden);
    }
  });

  it('a signings feed that fails is neither silent nor destructive', () => {
    // §4 read in both directions. Throwing would blank a table of
    // reviews that loaded fine — an error swallowing correct data.
    // Swallowing would show her no signings and no reason to doubt it.
    expect(PAGE_CODE).toContain('setSigningError');
    expect(FLAT).toContain('Your signings could not be loaded');
    expect(FLAT).toContain('the reviews below are unaffected');
  });
});

describe('FLOW1 — the interface and the server agree by equality', () => {
  it('declares exactly the fields the server sends', () => {
    const fields = interfaceFields(PAGE, 'SharedDeed');
    expect([...fields].sort()).toEqual([...CONTRACT].sort());
  });

  it('has no duplicate declarations', () => {
    const fields = interfaceFields(PAGE, 'SharedDeed');
    expect(new Set(fields).size).toBe(fields.length);
  });

  it('reads every row field through a name in the contract', () => {
    // `deed.something` where `something` is not a contract key is the
    // exact shape of the original defect — a field name that reads fine,
    // type-checks fine (it does not: it fails tsc, which is why this
    // pin is a second line and not the first), and is undefined at run
    // time. Kept as a sweep anyway because `any` anywhere upstream turns
    // the compiler's answer off.
    const reads = new Set<string>();
    for (const m of PAGE_CODE.matchAll(/\bdeed\.([a-z_][a-z0-9_]*)/gi)) {
      reads.add(m[1]);
    }
    expect([...reads].filter((r) => !CONTRACT.includes(r))).toEqual([]);
  });
});

describe('FLOW1 — no unguarded date reaches the screen', () => {
  it('parses dates through a guard that can answer "unknown"', () => {
    expect(PAGE_CODE).toMatch(/Number\.isNaN\(\s*parsed\.getTime\(\)\s*\)/);
    // formatDate returns the unknown marker rather than "Invalid Date".
    expect(PAGE_CODE).toMatch(/const UNKNOWN = /);
  });

  it('constructs no Date outside the guard', () => {
    // `new Date(...)` is allowed in exactly two places: the guard itself,
    // and the feedback modal's own timestamp (which is already inside a
    // truthiness check on a value the server minted). Anywhere else and
    // an unparseable value reaches toLocaleDateString again.
    const constructions = (PAGE_CODE.match(/new Date\(/g) || []).length;
    expect(constructions).toBeLessThanOrEqual(2);
  });

  it('does not treat a decided share as still pending', () => {
    // A share the recipient approved before `responded_at` existed has a
    // status and no date. "Pending" would be a claim about a share that
    // was decided; the unknown marker is a claim about our records.
    expect(FLAT).toContain('const decided = ');
    expect(FLAT).toContain(
      'deed.response_date ? formatDate(deed.response_date) : decided ? UNKNOWN : "Pending"',
    );
  });
});

describe('FLOW1 — a failed feedback fetch is not an answer', () => {
  it('raises instead of falling back to a field that does not exist', () => {
    // §4. The old fallback read `deed.feedback` — never sent by the list
    // endpoint — so a failed request opened a modal reading "(No
    // comments provided)": the officer told the reviewer left no
    // comments, when what happened is that we could not fetch them.
    expect(PAGE_CODE).not.toMatch(/deed\?\.feedback/);
    expect(PAGE_CODE).toMatch(/Failed to load feedback/);
  });
});
