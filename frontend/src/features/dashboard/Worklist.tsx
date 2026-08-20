/**
 * The queue as the whole body — DASH3.
 *
 * ═══ WHAT THIS REPLACES, AND WHY ═══
 *
 * Four stat tiles, a green "Create New Deed" bar, "Recently worked on",
 * a green all-clear banner and a three-column "What's waiting" split.
 * Every DASH ticket added or corrected a module and none removed a
 * category, so the screen accumulated into a metrics dashboard for a
 * reader who opens it to find the next task. Metrics dashboards answer
 * "how am I doing?"; a worklist answers "what's next?".
 *
 * ═══ ONE UNIT ON THE SCREEN ═══
 *
 * The hero counts ROWS and each group header counts ROWS. "3 things need
 * you" over three rows is a promise the screen keeps; a headline counting
 * fields above a header counting documents is two units on one surface,
 * which is what DASH-FIX spent itself killing.
 *
 * The number is not computed here. `worklist.count` arrives from the
 * server, where `hero_count()` sums the same groups this renders — so the
 * headline and the body cannot disagree, rather than agreeing by
 * coincidence and diligence.
 *
 * ═══ COLOUR IS NEUTRAL, DELIBERATELY (owner-ruled) ═══
 *
 * The design gives amber spines to "waiting" and violet to "your turn".
 * Both are DOCTRINAL colours — amber is unconfirmed external data, violet
 * is a proposed legal choice (docs/BRAND.md) — and repurposing them as
 * queue-state colour is precisely the correction ADMIN-BRAND already
 * made once. One mockup row lands on violet correctly (an unconfirmed
 * transfer-tax exemption) and that is coincidence, not compliance.
 *
 * So queue state is carried by NEUTRAL spines and by the tag's words.
 * Status never rides on colour alone here for the same reason it never
 * did on the setup checklist.
 */
'use client';

export interface WorklistRow {
  kind: 'chase' | 'you' | 'stale';
  band: number;
  tag: string;
  age: string;
  title: string;
  doc: string;
  say: string;
  sub: string;
  primary: string;
  secondary: string;
  href: string;
  deed_id: number | null;
  deed_ids: number[];
  property: string;
  county: string;
  sort_age: number | null;
}

export interface WorklistGroup {
  property: string;
  county: string;
  /** ROWS in this group — the same unit the hero counts. */
  open: number;
  /** Documents on this property the officer has RECORDED.
   *  Server-side this reads `recorded_at IS NOT NULL`, never
   *  `status = 'completed'` — see `services/worklist.py`. */
  recorded: number;
  items: WorklistRow[];
}

export interface Worklist {
  groups: WorklistGroup[];
  count: number;
}

/** Neutral, per the colour ruling. The KIND is said in words. */
const SPINE: Record<WorklistRow['kind'], string> = {
  chase: 'bg-gray-400',
  you: 'bg-gray-700',
  stale: 'bg-gray-200',
};

const TAG: Record<WorklistRow['kind'], string> = {
  chase: 'bg-gray-100 text-gray-700',
  you: 'bg-gray-900 text-white',
  stale: 'bg-gray-50 text-gray-500',
};

export default function Worklist({ worklist, onOpen }: {
  worklist?: Worklist | null;
  onOpen?: (href: string) => void;
}) {
  // NOT an empty state here. "You're clear" and "you have not started"
  // are different results and the page decides which it is holding —
  // collapsing them would reverse #206, and `open_documents` exists to
  // tell them apart.
  if (!worklist || !worklist.groups.length) return null;

  return (
    <div className="space-y-3.5">
      {worklist.groups.map((group) => (
        <section key={`${group.property}-${group.county}`}
                 aria-label={group.property}
                 className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <header className="flex flex-wrap items-center gap-3 border-b border-gray-100
                             bg-gradient-to-b from-white to-gray-50/70 px-4 py-3 md:px-5">
            <h3 className="text-[14.5px] font-bold tracking-tight text-gray-900">
              {group.property}
            </h3>
            {group.county && (
              <span className="text-xs font-medium text-gray-400">{group.county}</span>
            )}
            {/* COUNTS ROWS, and says so. The unit is named rather than
                left to be inferred from a number beside a heading. */}
            {/* EVERY COUNT GOES SOMEWHERE — DASH1's ruling, surviving the
                tiles it was written for. "A count with no drill-down is
                trivia: '4 Drafts' that cannot be pressed tells her a
                number and makes her go and find the four." The tiles are
                gone; these are the counts that replaced them, so these
                are the counts that have to be pressable.

                The open count needs none: the rows it counts are
                directly below it. */}
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
              <span>{group.open === 1 ? '1 open item' : `${group.open} open items`}</span>
              {group.recorded > 0 && (
                <>
                  <span aria-hidden>·</span>
                  {/* "Recorded" is the officer's own statement, never a
                      rendered PDF. The count comes from `recorded_at`. */}
                  <button type="button"
                          onClick={() => onOpen?.(
                            `/past-deeds?recorded=1&property=${encodeURIComponent(group.property)}`)}
                          className="underline decoration-gray-300 underline-offset-2
                                     transition hover:text-[var(--color-brand)]">
                    {group.recorded} recorded
                  </button>
                </>
              )}
            </div>
          </header>

          <ol>
            {group.items.map((row, i) => (
              <li key={`${row.kind}-${row.deed_id}-${i}`}
                  className="flex gap-3.5 border-t border-gray-100 py-4 pr-4 first:border-t-0 md:pr-5">
                <span aria-hidden
                      className={`w-1 shrink-0 rounded-r ${SPINE[row.kind]}`} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-bold
                                      uppercase tracking-wider ${TAG[row.kind]}`}>
                      {row.tag}
                    </span>
                    {row.age && <span className="text-xs text-gray-400">{row.age}</span>}
                  </div>
                  <div className="text-[15px] font-semibold tracking-tight text-gray-900">
                    {row.title}
                    {row.doc && (
                      <span className="ml-1.5 text-[13px] font-normal text-gray-400">
                        {row.doc}
                      </span>
                    )}
                  </div>
                  {/* ONE SENTENCE. The server composes it (§13 rule 3);
                      this screen does not get a second opinion about
                      what a state means. */}
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-gray-700">
                    {row.say}
                  </p>
                  {row.sub && (
                    <p className="mt-1 break-words text-[12.5px] leading-relaxed text-gray-400">
                      {row.sub}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-2 pt-0.5">
                  {row.secondary && (
                    <button type="button"
                            onClick={() => onOpen?.(row.href)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5
                                       text-[12.5px] font-semibold text-gray-700
                                       transition hover:bg-gray-50">
                      {row.secondary}
                    </button>
                  )}
                  <button type="button"
                          onClick={() => onOpen?.(row.href)}
                          className="rounded-lg bg-[var(--color-brand)] px-3.5 py-1.5
                                     text-[12.5px] font-semibold text-white shadow-sm
                                     transition hover:bg-[var(--color-brand-hover)]
                                     focus-visible:outline focus-visible:outline-2
                                     focus-visible:outline-offset-2">
                    {row.primary}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
