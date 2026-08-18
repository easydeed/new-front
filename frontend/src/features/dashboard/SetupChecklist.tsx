/**
 * Finish setting up — one step at a time.
 *
 * ═══ THE DIAGNOSIS, WHICH IS SHARPER THAN THE REQUEST ═══
 *
 * The question asked was "is this cognitive overload, can we colour it
 * up". The answer this was rebuilt on: the problem is not QUANTITY, it
 * is that nothing tells the eye what to read first — four steps expanded
 * at once, three competing calls to action, and a right-hand column
 * restating the left in different words. The fix is not more colour. It
 * is colour that means something, and one thing to do next.
 *
 * `docs/design/dashboard-soften/` is the reference implementation this
 * was built against, committed whole so the next reader sees what was
 * proposed as well as what was adopted.
 *
 * ═══ THE ACCORDION INVARIANT, ENFORCED STRUCTURALLY ═══
 *
 * Exactly one step is expanded: the first incomplete one. That is not a
 * convention this component follows, it is a value `activeStep()`
 * DERIVES from state — there is no prop that could open a second, and no
 * arrangement of state that yields two. Same instinct as the officer
 * queue asserting its key set rather than trusting its callers.
 *
 * ═══ THE COPY IS DEFERRED, NOT DELETED ═══
 *
 * Every step still carries its `why`. It renders only on that step's
 * turn, so the card holds ~18 words instead of ~90 and the reasoning is
 * all still there, arriving when it is the thing she is doing.
 *
 * ═══ THE COLOUR RULE, IN OUR VOCABULARY ═══
 *
 * The reference set proposed four jobs with stated budgets, which is
 * right, and assigned amber to "a real problem the user must fix —
 * rejected recording, failed signature". Both halves of that are wrong
 * here and BRAND.md already says why.
 *
 * AMBER IS RESERVED for unconfirmed external data — "a machine suggested
 * this; a human has not yet said yes". Nothing on this card is
 * county-sourced, so amber never appears on it. BRAND.md's admin section
 * states the general form: "Absence is neutral gray, not amber: that is
 * a fact about our instrumentation, not a warning about data." That IS
 * the reference set's own "Empty ≠ error", written down before it.
 *
 * FAILURE IS RED, not amber — so the row was carrying two meanings and
 * splits into two. And its examples go rather than being translated:
 * rejected recording and failed signature are recording-lifecycle states
 * this product does not have.
 *
 * VIOLET was the correction nobody had flagged. It is doctrinal too —
 * "proposed legal choice; the system proposes, only the officer's
 * explicit acceptance records it" — and the reference set leans on it
 * harder than on amber, making it the one-CTA colour. BRAND.md resolves
 * it one surface over, in the admin-console section: where there are no
 * officer decisions, violet's meaning "has nothing to attach to and
 * purple is simply the accent there". A company name is not a vesting
 * proposal, so violet is the accent here too.
 *
 * NET: this card uses NO DOCTRINAL COLOUR AT ALL. Violet as accent,
 * green for done, grey for everything else — including every empty
 * field. That is tighter than the four-job rule it came from, and it
 * falls out of our own doctrine rather than being imposed on it.
 */
'use client';

export type SetupStepId = 'company' | 'address' | 'county' | 'first-deed';

export interface SetupState {
  /** `users.company_name` — optional at registration, hence step one. */
  companyName?: string | null;
  /** `user_profiles.business_address`. */
  businessAddress?: string | null;
  /** `user_profiles.default_county`. */
  county?: string | null;
  /** Every deed she has, deleted ones excluded. */
  deedCount: number;
}

export interface SetupStep {
  id: SetupStepId;
  /** Shown when the step is collapsed — done or still to come. */
  title: string;
  /** Shown while the step is the active one. */
  activeTitle: string;
  /** Why it matters, IN DEED TERMS. Rendered only on this step's turn. */
  why: string;
  cta: string;
  href: string;
  done: boolean;
  /** The value she supplied, echoed back on a completed row. */
  value?: string;
}

const blank = (v?: string | null) => !((v || '').trim());
const trim = (v?: string | null) => (v || '').trim() || undefined;

/**
 * The four steps, IN THE ORDER THE DEED HEADER PRINTS THEM.
 *
 * ═══ AND THAT ORDER IS A DECISION, OWNER-RULED ═══
 *
 * Three orders were on the table. What shipped in #207 led with the
 * county. The reference set led with the company name. This leads with
 * company → address → county, which is neither, and the reason is the
 * card beside it.
 *
 * `DeedHeaderPreview` shows the block that prints at the top of every
 * deed, and its lines are in PRINT order: RECORDING REQUESTED BY, AND
 * WHEN RECORDED MAIL TO, COUNTY. Matching the steps to that order makes
 * the preview fill strictly TOP-DOWN as she works, which is the reward
 * loop the whole redesign rests on.
 *
 * The reference set's own copy convicts the alternative: under its
 * order, its COUNTY line reads "fills in at step 2" while sitting third.
 * A design admitting its sequence does not match its own picture.
 *
 * Consistency with onboarding's county-first prompt is worth less than
 * this: she passes through onboarding once, and watches this card
 * assemble every time she comes back.
 */
export function setupSteps(state: SetupState): SetupStep[] {
  return [
    {
      id: 'company',
      title: 'Company name',
      activeTitle: 'Add your company name',
      why: 'Prints on the RECORDING REQUESTED BY line at the top of every deed.',
      cta: 'Add company name',
      href: '/account-settings',
      done: !blank(state.companyName),
      value: trim(state.companyName),
    },
    {
      id: 'address',
      title: 'Business address',
      activeTitle: 'Add your business address',
      why: 'Where the recorder mails the document back after it records.',
      cta: 'Add address',
      href: '/account-settings',
      done: !blank(state.businessAddress),
      value: trim(state.businessAddress),
    },
    {
      id: 'county',
      title: 'Recording county',
      activeTitle: 'Set your recording county',
      why: 'Becomes the default on every new deed. You can change it on any single one.',
      cta: 'Set county',
      href: '/account-settings',
      done: !blank(state.county),
      value: trim(state.county),
    },
    {
      id: 'first-deed',
      title: 'Make your first deed',
      activeTitle: 'Make your first deed',
      why: 'Start from an address — the APN, legal description and current owner '
         + 'come back from county records, and you confirm every value before it prints.',
      cta: 'Start a deed',
      href: '/deed-builder',
      done: state.deedCount > 0,
    },
  ];
}

/**
 * The first incomplete step, or null once there is nothing left.
 *
 * THE INVARIANT LIVES HERE. Every render asks this one function which
 * step is open, so "exactly one is expanded" is a property of the data
 * rather than a rule the JSX remembers to follow.
 */
export function activeStep(state: SetupState): SetupStep | null {
  return setupSteps(state).find((s) => !s.done) ?? null;
}

export function completedCount(state: SetupState): number {
  return setupSteps(state).filter((s) => s.done).length;
}

export default function SetupChecklist({ state, onAct }: {
  state: SetupState;
  onAct?: (id: SetupStepId, href: string) => void;
}) {
  const steps = setupSteps(state);
  const active = activeStep(state);
  const done = completedCount(state);

  // Nothing left to set up: the card GOES. It does not linger as an
  // all-green trophy — a checklist with every box ticked is the
  // guaranteed-empty module whose siblings were removed in #206.
  if (!active) return null;

  return (
    <section aria-labelledby="setup-heading"
             className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
      <div className="flex items-center gap-3">
        <h2 id="setup-heading" className="text-lg font-bold text-gray-900">
          Finish setting up
        </h2>
        {/* PROGRESS AT THE TOP. It was 12px grey at the bottom of the
            card, which put the reward where nobody looks. */}
        <div className="ml-auto flex items-center gap-2">
          <div role="progressbar" aria-valuenow={done} aria-valuemin={0}
               aria-valuemax={steps.length}
               aria-label={`${done} of ${steps.length} steps done`}
               className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all
                            motion-reduce:transition-none"
                 style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums text-gray-500"
                data-testid="setup-progress">
            {done} of {steps.length}
          </span>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {steps.map((step, i) => {
          if (step.done) return <DoneRow key={step.id} step={step} />;
          if (step.id === active.id) {
            return <ActiveRow key={step.id} step={step} index={i + 1} onAct={onAct} />;
          }
          return <PendingRow key={step.id} step={step} index={i + 1} />;
        })}
      </ol>

      {/* The reassurance line, demoted to a footnote. At the top it
          competed with the steps for the eye it was meant to settle. */}
      <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
        Every step here is something the deed itself prints — none of it is
        profile decoration.
      </p>
    </section>
  );
}

function DoneRow({ step }: { step: SetupStep }) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-3.5 py-3 opacity-70">
      <span aria-hidden
            className="flex h-[23px] w-[23px] shrink-0 items-center justify-center
                       rounded-full border border-emerald-200 bg-emerald-50
                       text-[11px] font-bold text-emerald-600">
        ✓
      </span>
      <span className="flex-1 text-sm font-medium text-gray-700">
        {step.title}
        {/* Status never rides on colour alone — the rule that outlived
            the pill design it was written for (#207). */}
        <span className="sr-only"> — done</span>
      </span>
      {step.value && (
        <span className="max-w-[45%] truncate rounded-full bg-emerald-50 px-2 py-0.5
                         text-[11.5px] font-semibold text-emerald-600">
          {step.value}
        </span>
      )}
    </li>
  );
}

function ActiveRow({ step, index, onAct }: {
  step: SetupStep; index: number;
  onAct?: (id: SetupStepId, href: string) => void;
}) {
  return (
    <li aria-current="step"
        className="flex items-start gap-3 rounded-xl border border-[#E4DDFF]
                   bg-[var(--color-brand-light)] p-4">
      <span aria-hidden
            className="mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center
                       rounded-full bg-[var(--color-brand)] text-[11.5px] font-bold text-white">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15.5px] font-semibold text-gray-900">{step.activeTitle}</h3>
        {/* THE ONLY BODY COPY ON THE CARD. */}
        <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-[#4B3B7A]">
          {step.why}
        </p>
        <button
          type="button"
          onClick={() => onAct?.(step.id, step.href)}
          className="mt-3 inline-flex items-center rounded-lg bg-[var(--color-brand)]
                     px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm
                     transition hover:bg-[var(--color-brand-hover)]
                     focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          {step.cta}
        </button>
      </div>
    </li>
  );
}

function PendingRow({ step, index }: { step: SetupStep; index: number }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 px-3.5 py-3">
      <span aria-hidden
            className="flex h-[23px] w-[23px] shrink-0 items-center justify-center
                       rounded-full bg-gray-100 text-[11.5px] font-bold text-gray-400">
        {index}
      </span>
      {/* No `why`, no button. Deliberately: this step is not her turn. */}
      <span className="flex-1 text-sm font-medium text-gray-700">{step.title}</span>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11.5px]
                       font-semibold text-gray-400">
        next
      </span>
    </li>
  );
}
