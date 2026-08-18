/**
 * Finish setting up — the only content that can be true on day one.
 *
 * ═══ WHY A CHECKLIST AND NOT A WELCOME CARD ═══
 *
 * From `docs/design/dashboard_day_one.html`, whose argument is that
 * every item here is derived from state the product already holds:
 * `default_county` is null, `company_name` is blank, the deed count is
 * zero. A welcome banner cannot notice any of that. This can, and each
 * item is something the DEED needs rather than profile decoration.
 *
 * ═══ THE MOCKUP'S THREE STEPS, TWO OF THEM REWRITTEN ═══
 *
 * STEP 1 was drawn as "Confirm your recording county", with a red
 * "Didn't save" pill, copy reading "You picked Los Angeles County during
 * setup, but it never reached us", and a Retry button.
 *
 * Cut, owner-ruled, and the reason is that the sentence asserts
 * something we cannot know. If the save never reached us there is no
 * record of Los Angeles to name — the mockup's own annotation says the
 * items derive from `default_county` being null, and null yields "not
 * set", not "you picked LA". SETTINGS1 also closed that silent failure
 * at its source: a failed submit keeps her on the onboarding page with
 * the error, and a skip tells her plainly. What is left is the honest
 * state — she has no default county — and that is what this says.
 *
 * STEP 2 was drawn as "Add {company} as a partner", with copy saying the
 * RECORDING REQUESTED BY box "comes out blank and the county will
 * reject the document".
 *
 * Three corrections, all owner-ruled. It targets her COMPANY NAME, not a
 * partner: `requestedByDefault.ts` already falls back to a synthetic
 * own-company option built from `users.company_name`, and adding herself
 * to the rolodex is ruled against there — "a partner is a counterparty,
 * and the rolodex is not a place to file yourself". The real gap is the
 * narrower one where `company_name` is blank, which is a real
 * population because the field is optional at registration. And the
 * county-rejection line is cut under §1: it is a legal assertion about
 * what a recorder will do, printed in our own UI.
 *
 * ═══ NO PILLS, AND THAT IS A RULING RATHER THAN A DEFAULT ═══
 *
 * The mockup gives each step a status pill — "Didn't save", "Blocks
 * recording". Both steps here are "not set" states with nothing having
 * failed, and a pill implies a status CHANGE occurred. It follows from
 * cutting the rejection claim: we do not tell her something is blocked
 * or broken when nothing is blocked or broken. A step is either not done
 * yet or done. If a real failure state ever exists — a save that
 * actually errored — that earns a pill and its own copy at that point.
 *
 * What survives from the mockup is the rule UNDER the pills: status is
 * never carried by colour alone. A finished step is marked with a glyph
 * AND the word "Done", and the meter states the count in words.
 */
'use client';

export interface SetupState {
  /** `user_profiles.default_county`, or null when she has not set one. */
  county?: string | null;
  /** `users.company_name` — optional at registration, hence this step. */
  companyName?: string | null;
  /** Every deed she has, deleted ones excluded. */
  deedCount: number;
  /** `user_profiles.business_address` — see the fourth step. */
  businessAddress?: string | null;
}

export interface SetupStep {
  id: 'county' | 'company' | 'address' | 'first-deed';
  title: string;
  detail: string;
  action: string;
  done: boolean;
}

const blank = (v?: string | null) => !((v || '').trim());

/**
 * The three steps and whether each is finished — exported because the
 * page needs the count for its own line and must not recompute it.
 * §13 rule 3: one place turns state into English.
 */
export function setupSteps(state: SetupState): SetupStep[] {
  return [
    {
      id: 'county',
      title: 'Set your recording county',
      detail: 'The county you record in most often. It becomes the default on '
            + 'every new deed, and you can change it on any one of them.',
      action: 'Set county',
      done: !blank(state.county),
    },
    {
      id: 'company',
      title: 'Add your company name',
      detail: 'This is the name that prints in RECORDING REQUESTED BY at the top '
            + 'of the deed. Without it that box starts empty and you fill it in '
            + 'by hand each time.',
      action: 'Add company',
      done: !blank(state.companyName),
    },
    {
      // ═══ THE FOURTH STEP, ADDED AFTER AN AUDIT ═══
      //
      // The checklist counted itself complete at 2 of 3 while
      // `business_address` was empty — and the rail beside it was
      // rendering a dashed placeholder in AND WHEN RECORDED MAIL TO,
      // which is a box that PRINTS on the instrument. The screen was
      // showing her a gap and not counting it.
      //
      // It qualifies on this list's own stated test: every step is
      // something the deed itself needs. The return address is on the
      // face of the document, which is a stronger claim to a place here
      // than the county default has.
      id: 'address',
      title: 'Add your business address',
      detail: 'This prints under AND WHEN RECORDED MAIL TO, directly below your '
            + 'company name. It is where the recorder sends the document back.',
      action: 'Add address',
      done: !blank(state.businessAddress),
    },
    {
      id: 'first-deed',
      title: 'Make your first deed',
      detail: 'Start from an address. The APN, legal description and current owner '
            + 'come back from county records — you confirm every value before it '
            + 'prints.',
      action: 'Start',
      done: state.deedCount > 0,
    },
  ];
}

export default function SetupChecklist({ state, onAct }: {
  state: SetupState;
  onAct?: (id: SetupStep['id']) => void;
}) {
  const steps = setupSteps(state);
  const done = steps.filter((s) => s.done).length;

  // Nothing left to set up: the card goes. A checklist with every box
  // ticked is the guaranteed-empty module this ticket's predecessor
  // removed three of.
  if (done === steps.length) return null;

  return (
    <section aria-labelledby="setup-heading"
             className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
      <h2 id="setup-heading" className="text-lg font-bold text-gray-900">
        Finish setting up
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Each step below is something the deed itself needs. None of it is
        profile decoration.
      </p>

      <ol className="mt-5 space-y-4">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3">
            {/* STATUS IS NEVER COLOUR ALONE (the mockup's rule, kept).
                A finished step carries a glyph and the word; an
                unfinished one carries its position. Both survive
                greyscale, forced-colors and a screen reader. */}
            <span aria-hidden="true"
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center
                              rounded-full text-xs font-bold ${
                    step.done ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'}`}>
              {step.done ? '✓' : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900">
                {step.title}
                {step.done && (
                  <span className="ml-2 text-xs font-semibold text-emerald-700">
                    Done
                  </span>
                )}
              </div>
              {!step.done && (
                <p className="mt-0.5 text-sm text-gray-500">{step.detail}</p>
              )}
            </div>
            {!step.done && (
              <button
                type="button"
                onClick={() => onAct?.(step.id)}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5
                           text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                {step.action}
              </button>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-5 text-sm font-semibold text-gray-700"
         data-testid="setup-progress">
        {done} of {steps.length} done
      </p>
    </section>
  );
}
