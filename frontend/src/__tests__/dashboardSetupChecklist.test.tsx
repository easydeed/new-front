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

import SetupChecklist, { setupSteps } from '../features/dashboard/SetupChecklist';
import DayOneRail from '../features/dashboard/DayOneRail';

const NOTHING_SET = { county: null, companyName: null, businessAddress: null, deedCount: 0 };

describe('what the checklist derives', () => {
  it('reads four steps off state the product already holds', () => {
    /** The fourth arrived from an audit: the list counted itself
     *  complete at 2 of 3 while `business_address` was empty, and the
     *  rail beside it was drawing a gap in AND WHEN RECORDED MAIL TO —
     *  a box that PRINTS. It qualifies on this list's own test: every
     *  step is something the deed itself needs. */
    const steps = setupSteps(NOTHING_SET);
    expect(steps.map((s) => s.id)).toEqual(['county', 'company', 'address', 'first-deed']);
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it('counts a step done from the field that backs it', () => {
    const steps = setupSteps({
      county: 'Los Angeles', companyName: 'All Good Escrow',
      businessAddress: '1200 Wilshire Blvd, Ste 400', deedCount: 2,
    });
    expect(steps.every((s) => s.done)).toBe(true);
  });

  it('treats whitespace as unset, because a space is not a company name', () => {
    expect(setupSteps({ ...NOTHING_SET, companyName: '   ' })[1].done).toBe(false);
  });

  it('renders nothing once there is nothing left to set up', () => {
    /** A checklist with every box ticked is the same guaranteed-empty
     *  module its predecessor removed three of. */
    const { container } = render(<SetupChecklist state={{
      county: 'Los Angeles', companyName: 'All Good Escrow',
      businessAddress: '1200 Wilshire Blvd', deedCount: 1,
    }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says how many are done, in words', () => {
    render(<SetupChecklist state={{ ...NOTHING_SET, county: 'Orange' }} />);
    expect(screen.getByTestId('setup-progress')).toHaveTextContent('1 of 4 done');
  });

  it('routes each step to the thing that fixes it', () => {
    const onAct = jest.fn();
    render(<SetupChecklist state={NOTHING_SET} onAct={onAct} />);
    screen.getByRole('button', { name: 'Set county' }).click();
    expect(onAct).toHaveBeenCalledWith('county');
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
    render(<SetupChecklist state={NOTHING_SET} />);
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
    render(<SetupChecklist state={{ ...NOTHING_SET, county: 'Los Angeles' }} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});

describe('the rail', () => {
  it('shows where the company name lands, and marks the gap when it is blank', () => {
    render(<DayOneRail companyName={null} county={null} plan="free" />);
    expect(screen.getByText('RECORDING REQUESTED BY:')).toBeInTheDocument();
    expect(screen.getByText('your company name')).toBeInTheDocument();
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
    expect(screen.queryByText('Your company name')).not.toBeInTheDocument();
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

  it('says the county is not set in words, not only in red', () => {
    render(<DayOneRail companyName="X" county={null} plan="free" />);
    expect(screen.getByText('Not set')).toBeInTheDocument();
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
