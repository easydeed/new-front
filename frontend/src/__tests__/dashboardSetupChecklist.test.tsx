/**
 * The setup checklist, and the four things the mockup asked for that we
 * are not saying.
 *
 * `docs/design/dashboard_day_one.html` drew three steps. Two of them
 * described states this product cannot observe or has already ruled
 * against, and the pins below hold the corrections rather than the
 * drawing — because the drawing is in the repo and the next person to
 * read it will find the original copy, not this file's reasoning.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import SetupChecklist, { setupSteps, activeStep } from '../features/dashboard/SetupChecklist';
import DayOneRail from '../features/dashboard/DayOneRail';

const NOTHING_SET = { county: null, companyName: null, businessAddress: null, deedCount: 0 };

describe('the accordion invariant', () => {
  it('expands exactly one step, and it is the first incomplete one', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR (first of three).
     *
     * Not "the component happens to render one" — `activeStep()` DERIVES
     * it from state, so no prop opens a second and no arrangement of
     * state yields two. Structural, like the officer queue asserting its
     * key set rather than trusting its callers.
     */
    render(<SetupChecklist state={NOTHING_SET} />);
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Add company name' })).toBeInTheDocument();
  });

  it('opens exactly one whatever combination of steps is done', () => {
    /** Every reachable state rather than a sample: sixteen combinations
     *  of four booleans, each rendering one open row or none at all. */
    for (let c = 0; c < 16; c += 1) {
      const { container, unmount } = render(<SetupChecklist state={{
        companyName: c & 1 ? 'X' : null,
        businessAddress: c & 2 ? 'Y' : null,
        county: c & 4 ? 'Z' : null,
        deedCount: c & 8 ? 1 : 0,
      }} />);
      expect(container.querySelectorAll('[aria-current="step"]').length)
        .toBe(c === 15 ? 0 : 1);
      unmount();
    }
  });

  it('carries exactly one button, on the open step', () => {
    /** ONE VIOLET CTA PER SCREEN. A later step renders title-only — no
     *  `why`, no button — because it is not her turn. */
    render(<SetupChecklist state={NOTHING_SET} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('defers the copy rather than deleting it', () => {
    /** Every step still carries its `why`, rendering on that step's
     *  turn. ~90 words on screen became ~18 and nothing was lost. */
    const steps = setupSteps(NOTHING_SET);
    expect(steps.every((s) => s.why.length > 20)).toBe(true);
    render(<SetupChecklist state={NOTHING_SET} />);
    expect(screen.queryByText(/mails the document back/)).not.toBeInTheDocument();
    expect((document.body.textContent || '').trim().split(/\s+/).length)
      .toBeLessThan(70);
  });

  it('renders nothing at all once setup is done', () => {
    /** It does not linger as an all-green trophy. */
    const DONE = { companyName: 'X', businessAddress: 'Y', county: 'Z', deedCount: 1 };
    expect(activeStep(DONE)).toBeNull();
    const { container } = render(<SetupChecklist state={DONE} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the steps are in the order the deed header prints', () => {
  it('runs company, address, county, first deed', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR (second of three), OWNER-RULED.
     *
     * `DeedHeaderPreview`'s lines are in print order — RECORDING
     * REQUESTED BY, AND WHEN RECORDED MAIL TO, COUNTY — so this order
     * makes the preview fill strictly top-down, which is the reward loop
     * the redesign rests on.
     *
     * The reference set led with company but placed county second, and
     * its own COUNTY line then read "fills in at step 2" while sitting
     * third. What shipped before led with county. Neither filled the
     * picture in order.
     */
    expect(setupSteps(NOTHING_SET).map((s) => s.id))
      .toEqual(['company', 'address', 'county', 'first-deed']);
  });

  it('numbers the header lines to match', () => {
    render(<DayOneRail companyName={null} businessAddress={null} county={null} plan="free" />);
    const text = document.body.textContent || '';
    expect(text.indexOf('fills in at step 1')).toBeLessThan(text.indexOf('fills in at step 2'));
    expect(text.indexOf('fills in at step 2')).toBeLessThan(text.indexOf('fills in at step 3'));
  });

  it('sends every step to a route this product actually has', () => {
    /** The reference set invented /settings/company, /settings/county,
     *  /settings/address and /deeds/new. The dead-link class. */
    for (const step of setupSteps(NOTHING_SET)) {
      expect(['/account-settings', '/deed-builder']).toContain(step.href);
    }
  });
});

describe('the colour rule, in our vocabulary', () => {
  it('puts no doctrinal colour on the card', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR (third of three).
     *
     * AMBER is reserved for unconfirmed external data — "a machine
     * suggested this; a human has not yet said yes". Nothing here is
     * county-sourced. RED is failure, and nothing here has failed: an
     * unfilled field is an absence, and BRAND.md is explicit that
     * absence is neutral grey.
     *
     * The reference set gave amber "a real problem the user must fix —
     * rejected recording, failed signature": two meanings in one row,
     * both wrong here. The first is red in our system; the second names
     * recording-lifecycle states this product does not have.
     *
     * VIOLET is doctrinal too and went unflagged — "proposed legal
     * choice". BRAND.md resolves it one surface over, in the
     * admin-console section: where there are no officer decisions it
     * "has nothing to attach to and purple is simply the accent". A
     * company name is not a vesting proposal.
     */
    const { container } = render(<SetupChecklist state={NOTHING_SET} />);
    for (const forbidden of ['amber', 'orange', 'red-', 'yellow']) {
      expect(container.innerHTML).not.toContain(forbidden);
    }
  });

  it('keeps the rail free of them too, with every field empty', () => {
    const { container } = render(
      <DayOneRail companyName={null} businessAddress={null} county={null} plan="free" />);
    for (const forbidden of ['amber', 'orange', 'red-', 'yellow']) {
      expect(container.innerHTML).not.toContain(forbidden);
    }
  });
});

describe('the copy the mockup asked for and did not get', () => {
  it('never claims she picked a county we have no record of', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR (first of two).
     *
     * Drawn: "You picked Los Angeles County during setup, but it never
     * reached us." If it never reached us there is no Los Angeles to
     * name — the mockup's own annotation says the items derive from
     * `default_county` being null, and null yields "not set".
     */
    render(<SetupChecklist state={{ ...NOTHING_SET, companyName: 'X', businessAddress: 'Y' }} />);
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/never reached us|didn'?t save|Retry/i);
    expect(screen.getByText('Set your recording county')).toBeInTheDocument();
  });

  it('asks for her company name and not for a partner', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR (second of two).
     *
     * Drawn as "Add {company} as a partner". `requestedByDefault.ts`
     * rules against filing yourself in the rolodex — "a partner is a
     * counterparty" — and already defaults the box from
     * `users.company_name`, so zero partners does not mean a blank box.
     * The real gap is a blank company name, which is a real population
     * because the field is optional at registration.
     */
    render(<SetupChecklist state={NOTHING_SET} />);
    const text = document.body.textContent || '';
    expect(text).toContain('Add your company name');
    expect(text).not.toMatch(/partner/i);
  });

  it('makes no claim about what a county recorder will do', () => {
    /** §1 — a legal assertion printed in our own UI. Drawn as "the
     *  county will reject the document". */
    render(<SetupChecklist state={NOTHING_SET} />);
    const text = (document.body.textContent || '').toLowerCase();
    for (const claim of ['reject', 'refuse', 'will not record', 'invalid']) {
      expect(text).not.toContain(claim);
    }
  });

  it('carries no status pills, because nothing has failed', () => {
    /** OWNER-RULED rather than defaulted: a pill implies a status
     *  CHANGE occurred. Both steps are "not set", which is not an
     *  event. A real failure would earn a pill and its own copy. */
    render(<SetupChecklist state={NOTHING_SET} />);
    const text = (document.body.textContent || '').toLowerCase();
    for (const pill of ['blocks recording', "didn't save", 'didn’t save', 'error', 'failed']) {
      expect(text).not.toContain(pill);
    }
  });

  it('marks a finished step with a word and not only a colour', () => {
    /** The one rule from the mockup's pill design that survives it:
     *  status never rides on hue alone, so it holds up in greyscale,
     *  forced-colors and a screen reader. */
    render(<SetupChecklist state={{ ...NOTHING_SET, companyName: 'All Good Escrow' }} />);
    expect(screen.getByText('— done')).toBeInTheDocument();
  });
});

describe('the rail', () => {
  it('shows where the company name lands, and marks the gap when it is blank', () => {
    render(<DayOneRail companyName={null} county={null} plan="free" />);
    expect(screen.getByText('RECORDING REQUESTED BY:')).toBeInTheDocument();
    expect(screen.getByText('fills in at step 1')).toBeInTheDocument();
  });

  it('marks the gaps as text rather than as inputs that do nothing', () => {
    /** Both placeholders were styled as dashed boxes — an affordance
     *  promising a field, inside a preview. The way to fill them is the
     *  checklist step beside them, which is a real button. */
    const { container } = render(<DayOneRail companyName={null} county={null} plan="free" />);
    expect(container.querySelectorAll('input, textarea, [contenteditable]'))
      .toHaveLength(0);
    expect(container.innerHTML).not.toContain('border-dashed');
  });

  it('names no instrument, because on day one there is no document', () => {
    /** It was hardcoded to GRANT DEED beside a catalog offering
     *  twenty-one. This card is about where a NAME lands; picking an
     *  instrument would be choosing her document for her. */
    const { container } = render(<DayOneRail companyName="X" county="LA" plan="free" />);
    expect(container.textContent).not.toMatch(/GRANT DEED/i);
  });

  it('shows the real name once she has one', () => {
    render(<DayOneRail companyName="All Good Escrow" county="Los Angeles" plan="free" />);
    expect(screen.getByText('All Good Escrow')).toBeInTheDocument();
    expect(screen.queryByText('fills in at step 1')).not.toBeInTheDocument();
  });

  it('never states a monthly deed allowance', () => {
    /**
     * MONEY1, and the reason this row is missing from a card the mockup
     * drew it on. That ticket found `max_deeds_per_month: 5` returned
     * from a hardcoded fallback while `check_plan_limits` had zero call
     * sites — a cap nothing enforced, reported as though it were a rule.
     * Free is uncapped and the payload says so with null.
     *
     * Rebuilding "0 of 5" on a screen restores it in the harder place
     * to see: copy gets read by people, payloads do not.
     */
    render(<DayOneRail companyName="X" county="Los Angeles" plan="free" />);
    const text = (document.body.textContent || '').toLowerCase();
    expect(text).not.toMatch(/of 5|deeds this month|per month|allowance|limit/);
  });

  it('states the recording county exactly once on the screen', () => {
    /** It was a row in the plan card AND a line in the preview AND a
     *  checklist step — the restatement problem in miniature. The plan
     *  card's row is gone; the header line and the step remain, and
     *  those are the artifact and the action rather than two labels. */
    render(<DayOneRail companyName="X" county={null} plan="free" />);
    expect(screen.queryByText('Not set')).not.toBeInTheDocument();
    expect(screen.getByText('COUNTY:')).toBeInTheDocument();
  });

  it('states the trial length from the one place it is declared', () => {
    /** TRIAL1's mirror compares `lib/trial.ts` with the server's
     *  TRIAL_PERIOD_DAYS. Retyping the number here would have made it
     *  two claims on this side of the wire, which is the defect that
     *  mirror exists to catch. */
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TRIAL_DAYS } = require('../lib/trial');
    render(<DayOneRail companyName="X" county="Los Angeles" plan="free" />);
    expect(screen.getByText(new RegExp(`${TRIAL_DAYS}-day free trial`)))
      .toBeInTheDocument();
  });

  it('does not sell a trial to somebody already paying', () => {
    render(<DayOneRail companyName="X" county="Los Angeles" plan="professional" />);
    expect(document.body.textContent).not.toMatch(/free trial/);
  });
});
