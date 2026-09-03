/**
 * ESLINT1 — the gate that was turned off.
 *
 * ═══ WHY THIS EXISTS ═══
 *
 * DASH3's build produced a hooks-after-early-return defect: the greeting's
 * `useState`/`useEffect` were declared after `if (loading) return …`, so
 * the first paint ran two fewer hooks than the second and React tears the
 * component down the moment the profile answers. A render crash on the one
 * screen every user lands on.
 *
 * No gate we run catches that class. `tsc` does not model hook ordering.
 * The frontend suites read SOURCE TEXT rather than mounting through the
 * state transition, so they cannot see it either — and they are the
 * majority of our frontend coverage by design.
 *
 * `react-hooks/rules-of-hooks` sees it exactly, is enabled at error
 * severity by `next/core-web-vitals`, and runs during `next build` by
 * default. `next.config.js` set `eslint.ignoreDuringBuilds: true`.
 *
 * **A DISABLED GATE IS WORSE THAN A MISSING ONE, because the repository
 * looks equipped.** Anyone auditing our controls would find the rule
 * configured, at the right severity, in a linter the build runs. All of
 * that was true and none of it fired.
 *
 * ═══ WHY A CEILING RATHER THAN A HARD ZERO ═══
 *
 * Flipping the flag alone would fail every build on 136 pre-existing
 * errors, 104 of which are `no-explicit-any` — a style rule, not a defect
 * class. A build that suddenly fails on old style debt is a gate everyone
 * re-disables, which is how the flag got set in the first place.
 *
 * So the shape is `tsc-baseline`'s, which the repository already trusts:
 * frozen at N, only goes down. With one addition it needs and tsc did not
 * — the rules that catch DEFECTS are pinned at zero independently of the
 * ceiling, because a budget shared between "an unescaped apostrophe" and
 * "hooks called conditionally" spends itself on the wrong one.
 *
 * ═══ WHAT MAKES THIS NUMBER GO DOWN WITHOUT ANYTHING IMPROVING ═══
 *
 * §14.4: a monotonic-down invariant is satisfied by breaking the thing it
 * measures. tsc's version was a file that failed to PARSE. eslint's is
 * different and easier:
 *
 *   1. `/* eslint-disable *​/` at the top of a file silences all of it.
 *      One line, no diff noise, and the ceiling applauds.
 *   2. A file leaving the lint set — moved outside `src`, added to an
 *      ignore list — is not measured, and unmeasured reads as clean.
 *   3. A parse error stops eslint reading the rest of that file.
 *
 * So the floor is not a number either: blanket disables are refused, the
 * FILE COUNT has its own floor, and a parse error fails outright.
 */
import { ESLint } from 'eslint';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/** Frozen 2026-08-20 at 136/58. Lowered to 134/56 by GUIDE1 (three
 *  orphaned components deleted) and to 126/54 by DARK1 (eleven more).
 *
 *  LOWER these when the count drops; never raise them. Raising one is a
 *  decision to keep a defect and should read like one in the diff.
 *
 *  ═══ AND LOWER THEM WHEN A DELETION LOWERS THEM FOR YOU ═══
 *
 *  A ceiling left at its old number after files are deleted silently
 *  re-authorises exactly the debt those files were carrying — DARK1's
 *  deletions took 8 errors and 2 warnings with them, and leaving 134
 *  would have granted the next author 8 free errors, invisibly, with no
 *  diff anywhere recording the grant.
 *
 *  The drawdown trigger in OWNER_LEDGER.md watches this number falling
 *  toward zero. It does not watch the SUBJECT shrinking underneath it.
 *  A ratchet that tightens only when somebody remembers to tighten it is
 *  not a ratchet, and this property belongs to every threshold in the
 *  repo, not just this one: re-measure whenever a deletion lowers what
 *  the threshold measures. */
const CEILING = { errors: 126, warnings: 53 };

/** A file that stops being linted stops being measured, and unmeasured
 *  reads as clean. This floor is the count of files eslint actually
 *  reported on — deleting a file legitimately lowers it, so this fails
 *  loudly and expects a human to lower it deliberately.
 *
 *  It did exactly that on its first real encounter: GUIDE1 deleted three
 *  orphaned components and the gate refused the run until this number
 *  was lowered on purpose. 294 -> 291, three deletions, checked.
 *
 *  GUIDE2 raised it back to 294 by adding three files. The floor moves in
 *  BOTH directions on purpose — raising it locks in the coverage the way
 *  lowering the ceiling locks in the cleanup, and a floor left behind the
 *  real count silently tolerates that many files going dark.
 *
 *  DARK1 lowered it to 293 (`/team` deleted), then 292 (`VideoPlayer.tsx`
 *  deleted — the rickroll a green pin had been certifying the absence of),
 *  then 285 (the DARKSWEEP cleanup: seven unruled, unimported, unpinned
 *  components), then 281 (the four notification/partner scaffold
 *  components, owner-ruled). NOTIF1 raised it to 283 by adding two — the
 *  strip and its pins. DEED-POLISH raised it to 285, also by adding two:
 *  `lib/sectionSummary.ts` and its pins. Eight deliberate moves now, and
 *  the gate has refused a run for every DOWNWARD one — which is the only
 *  evidence that it is doing anything at all (§14.9).
 *
 *  AND THE PARSE-ERROR FLOOR EARNED ITSELF THIS TICKET. A JSX comment
 *  placed in an expression position broke `InputSection.tsx`, and the
 *  tsc count FELL from 83 to 9 — a file that cannot be parsed stops
 *  reporting its errors, so the monotonic-down invariant was satisfied
 *  by breaking the thing it measures (§14.4), in the direction that
 *  looks like an improvement. eslint's count moved the other way (127,
 *  over ceiling) and is what made it visible.
 *
 *  Raising it after an addition is the same discipline as lowering it
 *  after a deletion (§14.14): a floor left below the real count silently
 *  tolerates that many files going dark later.
 *
 *  ENGINE1 raised it 285 -> 289 for four files that arrived with
 *  #262-#265, and lowered the WARNING ceiling 54 -> 53 in the same pass.
 *  Neither move was this ticket's own work — which is the point: the
 *  ratchet is re-measured whenever the gate is run, not only when the
 *  person running it caused the change. A gain left unlocked is a gain
 *  the next author may spend without any diff recording the grant.
 *
 *  The last move lowered the CEILING too: deleting dead files took 8
 *  errors and 2 warnings with them, and a ceiling left at the old number
 *  would quietly re-authorise that much new debt. Cleanup that does not
 *  move the ceiling is cleanup the gate forgets. */
const FILES_FLOOR = 289;

/**
 * These catch DEFECTS rather than style, and every one is at zero today —
 * verified, not assumed, before being written down. They are pinned at
 * zero independently of the ceiling above.
 *
 * `react-hooks/rules-of-hooks` is first because it is the rule this whole
 * ticket came from. The rest were checked individually and were already
 * clean, which made pinning them free — the only moment that is ever
 * true.
 */
const MUST_BE_ZERO = [
  'react-hooks/rules-of-hooks',
  '@next/next/no-sync-scripts',
  '@next/next/no-assign-module-variable',
  'no-cond-assign',
  'no-dupe-keys',
  'no-unsafe-negation',
  'react/jsx-no-undef',
  'react/jsx-key',
];

/** A file-level `eslint-disable` with no rule named turns the gate off
 *  locally. A disable that NAMES its rules is a scoped decision and is
 *  allowed — this refuses only the blanket form. */
const BLANKET = /\/\*\s*eslint-disable\s*\*\//;

const eslint = new ESLint({ cwd: ROOT });
const results = await eslint.lintFiles(['src']);

let errors = 0, warnings = 0, parseErrors = [];
const byRule = new Map();

for (const file of results) {
  for (const m of file.messages) {
    if (m.severity === 2) errors++; else warnings++;
    if (m.fatal || /^Parsing error/.test(m.message)) {
      parseErrors.push(`${file.filePath}:${m.line} ${m.message}`);
    }
    const id = m.ruleId ?? '(no rule)';
    byRule.set(id, (byRule.get(id) ?? 0) + 1);
  }
}

const blanket = results
  .map((f) => f.filePath)
  .filter((p) => BLANKET.test(readFileSync(p, 'utf8')));

const fail = [];

// ── The floor, which is not a number ────────────────────────────────
if (parseErrors.length) {
  fail.push(`${parseErrors.length} file(s) failed to PARSE — the counts below `
          + `are meaningless:\n  ${parseErrors.slice(0, 10).join('\n  ')}`);
}
if (blanket.length) {
  fail.push(`blanket eslint-disable (no rule named) in ${blanket.length} `
          + `file(s) — that silences the gate rather than passing it:\n  `
          + blanket.map((p) => p.replace(ROOT, '')).join('\n  '));
}
if (results.length < FILES_FLOOR) {
  fail.push(`only ${results.length} files linted, floor is ${FILES_FLOOR}. `
          + `A file that stops being linted stops being measured. If files `
          + `were deleted on purpose, lower FILES_FLOOR deliberately.`);
}

// ── The defect rules, at zero, independent of the ceiling ────────────
for (const rule of MUST_BE_ZERO) {
  const n = byRule.get(rule) ?? 0;
  if (n > 0) {
    fail.push(`${rule}: ${n} violation(s). This rule is pinned at ZERO — `
            + `it catches a defect class, not style, and it was at zero when `
            + `the gate was written.`);
  }
}

// ── The ceiling ─────────────────────────────────────────────────────
if (errors > CEILING.errors) {
  fail.push(`eslint errors regressed: ${errors}, ceiling is ${CEILING.errors}`);
}
if (warnings > CEILING.warnings) {
  fail.push(`eslint warnings regressed: ${warnings}, ceiling is ${CEILING.warnings}`);
}

console.log(`eslint: ${errors} errors (ceiling ${CEILING.errors}), `
          + `${warnings} warnings (ceiling ${CEILING.warnings}), `
          + `${results.length} files linted (floor ${FILES_FLOOR})`);
console.log('\nby rule:');
for (const [rule, n] of [...byRule].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${rule}`);
}

if (fail.length) {
  for (const f of fail) console.error(`::error::${f}`);
  process.exit(1);
}

if (errors < CEILING.errors || warnings < CEILING.warnings) {
  console.log(`\n::notice::eslint improved to ${errors}/${warnings} — lower `
            + `CEILING in frontend/scripts/eslint-gate.mjs to lock the gain in.`);
}
