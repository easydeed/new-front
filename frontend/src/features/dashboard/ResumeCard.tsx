/**
 * Pick up where you left off — with what is left NAMED.
 *
 * ═══ WHY THE CHECKS ARE LISTED AND NOT COUNTED ═══
 *
 * "Continue — 2 checks left" tells her there is work; the two lines
 * above it tell her what she is walking back into before she clicks.
 * The difference matters most on the document she abandoned yesterday,
 * which is the one she remembers least about.
 *
 * ═══ THE THUMBNAIL IS THE DOCUMENT'S STATE, NOT A PICTURE OF IT ═══
 *
 * Confirmed fields draw solid, outstanding ones dashed. It is a
 * schematic, deliberately: a real preview would be an illegible
 * postage-stamp of a legal instrument, while a schematic answers the one
 * question the page is for — how much of this is settled — without her
 * opening it.
 *
 * It is drawn from the SAME check list as the sentences beside it, so
 * the picture and the words cannot disagree.
 */
'use client';

import type { AccuracyCheck } from './AccuracySection';
import { checkSentence } from './AccuracySection';

export interface ResumeTarget {
  deed_id: number;
  deed_type?: string | null;
  property?: string | null;
  escrow_no?: string | null;
  checks: AccuracyCheck[];
}

/**
 * The fields a grant deed's face carries, in the order they print. The
 * thumbnail marks each one solid or dashed; fields with no outstanding
 * check are settled.
 */
const FACE_FIELDS = [
  { key: 'grantor', label: 'Grantor' },
  { key: 'grantee', label: 'Grantee' },
  { key: 'legal_description', label: 'Legal description' },
  { key: 'apn', label: 'APN' },
  { key: 'vesting', label: 'Vesting' },
  { key: 'dtt', label: 'Transfer tax' },
];

export function outstandingFields(checks: AccuracyCheck[]): Set<string> {
  return new Set(checks.map((c) => c.field));
}

export default function ResumeCard({ target, onResume }: {
  target?: ResumeTarget | null;
  onResume?: (deedId: number) => void;
}) {
  if (!target) return null;
  const outstanding = outstandingFields(target.checks);
  const left = target.checks.length;

  return (
    <section aria-labelledby="resume-heading"
             className="flex gap-5 rounded-xl border border-slate-200 bg-white p-5">
      {/* The schematic. `aria-hidden` because the checks below say the
          same thing in words — a screen-reader user gets the sentences,
          not a description of dashes. */}
      <div aria-hidden className="hidden w-28 shrink-0 sm:block"
           data-testid="resume-thumbnail">
        <div className="space-y-1.5 rounded border border-slate-300 p-2">
          {FACE_FIELDS.map((f) => (
            <div
              key={f.key}
              data-testid={`thumb-${f.key}`}
              data-state={outstanding.has(f.key) ? 'outstanding' : 'confirmed'}
              className={outstanding.has(f.key)
                ? 'h-1.5 rounded border border-dashed border-slate-400'
                : 'h-1.5 rounded bg-slate-700'}
            />
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          Pick up where you left off
        </div>
        <h3 id="resume-heading" className="text-lg font-semibold text-slate-900">
          {target.property || 'Untitled document'}
        </h3>
        <div className="text-sm text-slate-500">
          {[target.deed_type, target.escrow_no].filter(Boolean).join(' · ')}
        </div>

        {left > 0 ? (
          <ul className="mt-3 space-y-1">
            {target.checks.map((check) => (
              <li key={`${check.field}-${check.population}`}
                  className="text-sm text-slate-700">
                {checkSentence(check)}
              </li>
            ))}
          </ul>
        ) : (
          /* ═══ A DRAFT WITH NOTHING OUTSTANDING IS STILL A DRAFT ═══

             This card only ever received documents WITH outstanding
             checks, because its target was the accuracy list's first
             row. A draft she had fully confirmed but not finished
             therefore fell out of it — and an audit found the gap being
             filled by a pre-#203 card drawing from a third population,
             which said "You have a deed in progress" and named nothing.

             So the card takes the case: no checks, and it says that
             rather than rendering an empty list under a button reading
             "0 checks left". */
          <p className="mt-3 text-sm text-slate-700">
            Every field on this one is confirmed — it is waiting on you to finish it.
          </p>
        )}

        <button
          type="button"
          onClick={() => onResume?.(target.deed_id)}
          className="mt-4 rounded-lg bg-[#7C4DFF] px-5 py-2.5 font-medium text-white"
        >
          {/* The count and the list are the same data, so they cannot
              disagree about how much is left. */}
          {left > 0
            ? `Continue — ${left} ${left === 1 ? 'check' : 'checks'} left`
            : 'Continue'}
        </button>
      </div>
    </section>
  );
}
