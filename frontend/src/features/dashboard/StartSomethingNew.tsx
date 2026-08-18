/**
 * Start something new — ordered by what THIS officer actually files.
 *
 * ═══ WHY NOT ALPHABETICALLY ═══
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
  const rows = used.length
    ? used
    : STARTERS.map((deed_type) => ({ deed_type, count: 0, period: '' }));

  return (
    <section aria-labelledby="start-heading"
             className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 id="start-heading" className="font-semibold text-slate-900">
        Start something new
      </h3>
      <ul className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <li key={row.deed_type}>
            <button
              type="button"
              onClick={() => onStart?.(row.deed_type)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm"
            >
              {/* UX2 item 3's vocabulary, on the surface it had not reached.
                  This rendered `grant-deed` and `affidavit-death-jt` —
                  our storage keys, which she never chose — two clicks
                  from a screen that says "Grant Deed". */}
              <span className="text-slate-800">{deedTypeLabel(row.deed_type)}</span>
              <span className="text-xs text-slate-500">
                {/* "most used" only where it is TRUE — the top row of a
                    list she has actually filed from. On day one there is
                    no most-used and claiming one would be a fact
                    invented out of an empty table. */}
                {row.count > 0
                  ? (i === 0 ? 'most used' : `${row.count} ${row.period}`)
                  : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onBrowse}
              className="mt-3 text-sm text-[#7C4DFF] underline underline-offset-2">
        Browse all 21 California instruments
      </button>
    </section>
  );
}
