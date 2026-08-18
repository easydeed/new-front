/**
 * The rail beside the setup checklist: where her company name lands, and
 * what her plan is.
 *
 * ═══ WHAT THIS REPLACED ═══
 *
 * Four bullets headed "what I can help with", which were landing-page
 * copy shown to somebody who had already signed up. The mockup's
 * argument for the swap is that a picture of where her own company name
 * prints does the same persuading and doubles as the explanation for the
 * step asking for it.
 *
 * ═══ THE PLAN CARD, MINUS ONE ROW ═══
 *
 * The mockup draws "Deeds this month — 0 of 5". Cut, owner-ruled, and
 * the ruling already existed: MONEY1 found `max_deeds_per_month: 5`
 * being returned from a hardcoded fallback while `check_plan_limits` had
 * zero call sites, so nothing had ever counted a deed against a cap. An
 * officer on Free was being told she had five a month by an API, and it
 * was untrue in both directions — nothing stopped her at five, and
 * nothing had decided she should be stopped. Free is uncapped and the
 * payload says so with `null`.
 *
 * Rebuilding the row on a screen would restore exactly that, in the
 * harder place to see: copy gets read by people, payloads do not.
 *
 * The trial line stays, because it is true — `TRIAL_PERIOD_DAYS = 14`
 * on the server, mirrored by a test — and because today the trial is
 * only ever discovered AFTER clicking Upgrade.
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
  const company = (companyName || '').trim();
  const address = (businessAddress || '').trim();
  const planName = (plan || '').trim();
  const isFree = !planName || planName.toLowerCase() === 'free';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-bold text-gray-900">Where your company lands</h3>

        {/* A deed face, not a picture of one: these are the two lines
            that print at the top of every recorded instrument, in the
            order they print. */}
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11px] leading-relaxed">
          <div className="font-semibold tracking-wide text-gray-500">
            RECORDING REQUESTED BY:
          </div>
          {company ? (
            <div className="font-medium text-gray-900">{company}</div>
          ) : (
            /* Same treatment: a marker for a gap, not an input. It
               keeps its tint because it is the box the step beside it
               fills, and loses the border that made it look editable. */
            <div className="italic text-emerald-700">your company name</div>
          )}
          <div className="mt-2 font-semibold tracking-wide text-gray-500">
            AND WHEN RECORDED MAIL TO:
          </div>
          {address ? (
            <div className="text-gray-900">{address}</div>
          ) : (
            /* A MARKER, NOT A CONTROL. This was styled as a dashed input
               box and was not clickable — an affordance promising a
               field, on a preview. It reads as text now, and the way to
               fill it is the checklist step beside it, which is a real
               button that goes to a real form. */
            <div className="italic text-gray-400">not set yet</div>
          )}
          {/* THE INSTRUMENT TITLE IS GONE. It was hardcoded to GRANT
              DEED regardless of what she files — an audit found it
              beside a catalog offering twenty-one instruments. This card
              is about WHERE A NAME LANDS, and on day one there is no
              document to name: showing one instrument would be picking
              hers for her, and the honest version of a fact we do not
              have is not a smaller fact, it is no line. */}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          {company
            ? 'This is where it prints, on every deed you make.'
            : 'The dashed box is what the setup step fills in. It is the whole reason we ask.'}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-bold text-gray-900">Your plan</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-500">Plan</dt>
            <dd className="font-semibold text-gray-900">
              {planName ? planName[0].toUpperCase() + planName.slice(1) : 'Free'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-500">Recording county</dt>
            {/* "Not set" is the word doing the work. The colour is a
                second signal, never the only one. */}
            <dd className={`font-semibold ${(county || '').trim() ? 'text-gray-900' : 'text-amber-700'}`}>
              {(county || '').trim() || 'Not set'}
            </dd>
          </div>
        </dl>
        {isFree && (
          <p className="mt-3 text-xs text-gray-500">
            Professional includes a {TRIAL_DAYS}-day free trial — no charge today.{' '}
            <button type="button" onClick={onSeePlans}
                    className="font-semibold text-emerald-700 underline underline-offset-2">
              See what&apos;s included
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
