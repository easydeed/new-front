/**
 * The deed header, assembling itself.
 *
 * ═══ WHAT THIS REPLACED, AND WHY IT IS THE BEST IDEA IN THE REDESIGN ═══
 *
 * The previous card restated the checklist in different words: a picture
 * of a deed face with "your company name" written where her company name
 * would go, beside a list telling her to add her company name. A new
 * officer read the same three facts twice, and the column earned
 * nothing.
 *
 * This shows the ACTUAL artifact being assembled. Each line fills in as
 * its step completes, so the same pixels flip from redundant noise into
 * feedback — she watches the thing she is building appear. It is also
 * the best answer anybody has given to "where does my company name go?",
 * because it does not answer the question, it shows the place.
 *
 * ═══ THE LINES ARE IN PRINT ORDER, AND THE STEPS FOLLOW THEM ═══
 *
 * RECORDING REQUESTED BY, then AND WHEN RECORDED MAIL TO, then the
 * county. `setupSteps()` is ordered to match, so completing step one
 * fills line one — the card fills strictly top-down.
 *
 * The reference implementation had these two out of step: its COUNTY
 * line read "fills in at step 2" while sitting third. Fixed by moving
 * the STEPS, not the lines, because the lines are not ours to reorder —
 * that is the order a recorder sees.
 *
 * ═══ EMPTY LINES ARE GREY ═══
 *
 * Never amber, never red. Amber is reserved for unconfirmed external
 * data and nothing here is county-sourced; red is failure and nothing
 * here has failed. An unfilled field is an absence, and BRAND.md is
 * explicit that absence is neutral grey — "a fact about our
 * instrumentation, not a warning about data".
 *
 * ═══ AND THE PLAN CARD IS ONE LINE ═══
 *
 * It was three rows and a paragraph, one of them an orange "Not set"
 * firing before she had done anything wrong. What survives is the plan
 * name and the trial, because the trial is true and is otherwise
 * discovered only after clicking Upgrade. The recording county left this
 * card entirely: it is a step in the checklist and a line in the header
 * above, and a third statement of it was the restatement problem in
 * miniature.
 */
'use client';

import { TRIAL_DAYS } from '@/lib/trial';

export default function DayOneRail({ companyName, businessAddress, county, plan, onSeePlans }: {
  companyName?: string | null;
  businessAddress?: string | null;
  county?: string | null;
  plan?: string | null;
  onSeePlans?: () => void;
}) {
  const planName = (plan || '').trim();
  const isFree = !planName || planName.toLowerCase() === 'free';

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <h2 className="text-sm font-bold text-gray-900">Your deed header</h2>

        <dl className="mt-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5
                       text-[12.5px] leading-relaxed">
          <Line label="RECORDING REQUESTED BY" value={companyName}
                fallback="fills in at step 1" />
          <Line label="AND WHEN RECORDED MAIL TO" value={businessAddress}
                fallback="fills in at step 2" />
          <Line label="COUNTY" value={county} fallback="fills in at step 3" />
        </dl>

        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          This block prints at the top of every deed you make.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-gray-900">Your plan</h2>
          <span className="ml-auto text-sm font-semibold text-gray-900">
            {planName ? planName[0].toUpperCase() + planName.slice(1) : 'Free'}
          </span>
        </div>
        {isFree && (
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            Professional includes a {TRIAL_DAYS}-day free trial — no charge today.{' '}
            <button type="button" onClick={onSeePlans}
                    className="font-semibold text-[var(--color-brand)] underline underline-offset-2">
              See what&apos;s included
            </button>
          </p>
        )}
      </section>
    </div>
  );
}

function Line({ label, value, fallback }: {
  label: string; value?: string | null; fallback: string;
}) {
  const filled = (value || '').trim();
  return (
    <div className="mt-2 first:mt-0">
      <dt className="text-[9.5px] font-bold tracking-[0.09em] text-gray-400">{label}:</dt>
      <dd className={filled ? 'font-semibold text-gray-900' : 'italic text-gray-400'}>
        {filled || fallback}
      </dd>
    </div>
  );
}
