/**
 * Start something new — ordered by what THIS officer actually files.
 *
 * ═══ WHY NOT ALPHABETICALLY ═══
 *
 * DASH3 — A 40px CHIP STRIP, NOT A 200px CARD. It sits above the
 * divider so it reads as "jump in, or clear your queue" rather than as a
 * panel competing with the work. The card form made starting something
 * new look equal in weight to the queue, on a screen whose whole purpose
 * is the queue.
 *
 * AND THE USE ANNOTATIONS ARE CUT (owner-ruled). "most used" and
 * "1 this year" were the only statistics left in a design whose purpose
 * is removing statistics — and a frequency label on a two-item strip is
 * decoration, not orientation. The ORDER still carries the same fact:
 * her most-filed instrument is first, which is the useful half of what
 * the label said.
 *
 * The catalog is 21 California instruments and an officer files three of
 * them. Alphabetical order puts an affidavit she has never filed above
 * the grant deed she files weekly; her own frequency puts her next
 * document first.
 *
 * ═══ THE COUNT IS THE EVIDENCE FOR THE ORDER ═══
 *
 * Shown rather than implied, and with its PERIOD, because "14" over an
 * unstated window is a number the reader has to guess the meaning of.
 * The server sends the period with the count so this screen does not
 * invent one.
 *
 * An officer with no history sees the catalog, not an empty list — a
 * frequency-ordered list is useless on day one and must not become the
 * only way in.
 */
'use client';

import { deedTypeLabel } from '@/lib/deedTypes';
import { INSTRUMENT_COUNT } from '@/lib/formRegistry';

export interface InstrumentUse {
  deed_type: string;
  count: number;
  period: string;
}

/** The types offered when she has filed nothing yet. */
export const STARTERS = ['grant-deed', 'interspousal-transfer', 'quitclaim-deed'];

export default function StartSomethingNew({ instruments, onStart, onBrowse }: {
  instruments?: InstrumentUse[] | null;
  onStart?: (deedType: string) => void;
  onBrowse?: () => void;
}) {
  const used = instruments ?? [];
  const rows = (used.length
    ? used
    : STARTERS.map((deed_type) => ({ deed_type, count: 0, period: '' }))
  ).slice(0, 2);

  return (
    <section aria-labelledby="start-heading"
             className="mb-6 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-5">
      <h3 id="start-heading"
          className="mr-1 text-[11.5px] font-bold uppercase tracking-[0.075em] text-gray-400">
        Jump into
      </h3>
      {rows.map((row) => (
        <button
          key={row.deed_type}
          type="button"
          onClick={() => onStart?.(row.deed_type)}
          className="inline-flex items-center rounded-full border border-gray-200 bg-white
                     px-3.5 py-1.5 text-[13.5px] font-semibold text-gray-700 shadow-sm
                     transition hover:border-[#C9BCFB] hover:text-[var(--color-brand-hover)]"
        >
          {/* UX2 item 3's vocabulary, on the surface it had not reached.
              This rendered `grant-deed` and `affidavit-death-jt` — our
              storage keys, which she never chose. */}
          {deedTypeLabel(row.deed_type)}
        </button>
      ))}
      <button type="button" onClick={onBrowse}
              className="inline-flex items-center rounded-full border border-dashed
                         border-gray-300 px-3.5 py-1.5 text-[13.5px] font-medium text-gray-500
                         transition hover:bg-white">
        All {INSTRUMENT_COUNT} California instruments →
      </button>
    </section>
  );
}
