/**
 * The dashboard's accuracy surface, RENDERED.
 *
 * ═══ WHY RENDERED ═══
 *
 * The hero number is the product's promise made countable, and its
 * failure modes are all things a source pin cannot see: a zero drawn
 * before the data arrives, a count that disagrees with the list beneath
 * it, a thumbnail that says settled while the sentence says outstanding.
 *
 * For a page the fix is rendering — the seventh time this suite has
 * needed that rule.
 */
import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/jest-globals';

import AccuracySection, { checkSentence } from '@/features/dashboard/AccuracySection';
import type { AccuracyCheck } from '@/features/dashboard/AccuracySection';
import ResumeCard from '@/features/dashboard/ResumeCard';
import StartSomethingNew from '@/features/dashboard/StartSomethingNew';

const check = (over: Partial<AccuracyCheck> = {}): AccuracyCheck => ({
  field: 'apn', label: 'APN', population: 'unconfirmed', ...over,
});

describe('the hero number', () => {
  it('never renders a figure it did not receive', () => {
    /**
     * THE PIN THIS FILE EXISTS FOR. A zero drawn while the request is in
     * flight is the same lie as the inverted count, arriving earlier —
     * it tells her nothing is outstanding before anything has been
     * counted.
     */
    const { container } = render(<AccuracySection accuracy={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says how many fields across how many documents', () => {
    render(<AccuracySection accuracy={{
      fields: 7, documents: 4,
      items: [{ deed_id: 1, property: '1358 5th St', checks: [check()] }],
    }} />);
    expect(screen.getByTestId('accuracy-figure')).toHaveTextContent('7');
    expect(screen.getByText(/across 4 documents/)).toBeInTheDocument();
  });

  it('says so plainly when nothing is outstanding', () => {
    /** Zero is a real answer once it has been counted — and it is worth
     *  saying, because "no list" and "nothing left" look identical. */
    render(<AccuracySection accuracy={{ fields: 0, documents: 0, items: [] }} />);
    expect(screen.getByText(/Every field on every open document is confirmed/))
      .toBeInTheDocument();
  });
});

describe('what each check says', () => {
  it('reports a name difference without saying which is right', () => {
    /**
     * §0. Both are legitimate — the record may be stale, she may be
     * conveying from a name it does not carry, or one is a typo.
     */
    const sentence = checkSentence(check({
      field: 'grantor', population: 'disagreement',
      typed: 'MARIA L. RUIZ', record: 'RUIZ, MARIA LUCIA',
    }));
    expect(sentence).toContain('MARIA L. RUIZ');
    expect(sentence).toContain('RUIZ, MARIA LUCIA');
    for (const claim of [/should be/i, /correct/i, /wrong/i, /instead/i]) {
      expect(sentence).not.toMatch(claim);
    }
  });

  it('distinguishes never-answered from not-yet-confirmed', () => {
    /**
     * A blank grantee is a field nobody filled in; an unconfirmed APN is
     * a county value she has not vouched for. Same count, different act,
     * and collapsing them would tell her to type where she should read.
     */
    expect(checkSentence(check({ population: 'substance', label: 'Grantee stated' })))
      .toMatch(/still empty/);
    expect(checkSentence(check({ population: 'unconfirmed' })))
      .toMatch(/not yet confirmed by you/);
    expect(checkSentence(check({ population: 'decision', label: 'Transfer tax decided' })))
      .toMatch(/not chosen yet/);
  });
});

describe('the resume card', () => {
  const target = {
    deed_id: 9, deed_type: 'Interspousal Transfer', property: '4420 Cahuenga Blvd',
    escrow_no: '24-0902',
    checks: [check({ field: 'legal_description', label: 'Legal description',
                     population: 'unconfirmed' }),
             check({ field: 'dtt', label: 'Transfer tax decided',
                     population: 'decision' })],
  };

  it('names the remaining checks rather than only counting them', () => {
    render(<ResumeCard target={target} />);
    expect(screen.getByText(/Legal description — from county records/)).toBeInTheDocument();
    expect(screen.getByText(/Transfer tax decided — not chosen yet/)).toBeInTheDocument();
    expect(screen.getByText(/Continue — 2 checks left/)).toBeInTheDocument();
  });

  it('marks the thumbnail from the same list as the sentences', () => {
    /**
     * The picture and the words cannot disagree, because they are one
     * source. A thumbnail drawn from separate state is a thumbnail that
     * eventually says settled while the line beneath says outstanding.
     */
    render(<ResumeCard target={target} />);
    expect(screen.getByTestId('thumb-legal_description'))
      .toHaveAttribute('data-state', 'outstanding');
    expect(screen.getByTestId('thumb-dtt'))
      .toHaveAttribute('data-state', 'outstanding');
    expect(screen.getByTestId('thumb-grantor'))
      .toHaveAttribute('data-state', 'confirmed');
  });

  it('counts one check in the singular', () => {
    render(<ResumeCard target={{ ...target, checks: [check()] }} />);
    expect(screen.getByText(/Continue — 1 check left/)).toBeInTheDocument();
  });

  it('renders nothing when there is nothing to resume', () => {
    const { container } = render(<ResumeCard target={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('start something new', () => {
  it('orders by what she files and shows the count with its period', () => {
    render(<StartSomethingNew instruments={[
      { deed_type: 'grant-deed', count: 31, period: 'this year' },
      { deed_type: 'interspousal-transfer', count: 14, period: 'this year' },
    ]} />);
    expect(screen.getByText('most used')).toBeInTheDocument();
    expect(screen.getByText('14 this year')).toBeInTheDocument();
  });

  it('offers the catalog on day one instead of an empty list', () => {
    /**
     * A frequency-ordered list is useless before there is any frequency,
     * and must not become the only way in.
     */
    render(<StartSomethingNew instruments={[]} />);
    expect(screen.getByText('grant-deed')).toBeInTheDocument();
    expect(screen.queryByText('most used')).not.toBeInTheDocument();
  });
});
