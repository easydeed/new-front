/**
 * ADMIN1.5 remainder — the console says what it is showing.
 *
 * The browser audit read four numbers off the admin console and got four
 * wrong impressions, none of them from a wrong number:
 *
 *   "Deeds This Month: 0"   — a calendar count, read on the 2nd
 *   "0ms latency"           — a sub-millisecond probe, truncated
 *   a percentage bar chart  — drawn over a handful of rows
 *   "Total Documents: 0"    — a failed fetch, rendered as a fact
 *
 * Every one is the ADMIN1 defect class surviving in a place ADMIN1 did
 * not look. These pins assert the labels and the absences, because the
 * numbers themselves were never the problem.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

function readAdmin(...segments: string[]): string {
  return fs.readFileSync(
    path.join(__dirname, '..', 'app', 'admin', ...segments), 'utf8');
}

/** Comments explaining a removed pattern quote that pattern. */
function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('the two deed windows are labelled and reconciled', () => {
  const src = readAdmin('components', 'Overview.tsx');

  it('names the window each count measures', () => {
    expect(src).toContain('Deeds — last 30 days');
    expect(src).toContain('Deeds — this calendar month');
    // The bare label that produced the "we collapsed" reading.
    expect(withoutComments(src)).not.toContain('"Deeds This Month"');
  });

  it('states the calendar window\'s start date rather than implying today', () => {
    expect(src).toContain('deeds_this_month_since');
    expect(src).toContain('since ${since}');
  });

  it('explains that the two figures are expected to disagree', () => {
    expect(src).toMatch(/expected to\s*\n?\s*disagree/);
  });
});

describe('the verification count carries its provenance', () => {
  const src = readAdmin('components', 'Overview.tsx');

  it('no longer claims to count platform-wide QR scans', () => {
    expect(withoutComments(src)).not.toContain('QR Scans (Week)');
  });

  it('says the count is partner-API only and why', () => {
    expect(src).toContain('Partner-API documents only');
    expect(src).toMatch(/wizard are not\s*\n?\s*issued verification codes/);
  });
});

describe('the Verification tab scopes itself before it counts', () => {
  const src = readAdmin('components', 'VerificationTab.tsx');

  it('leads with the lane it covers', () => {
    expect(src).toContain('Partner-API documents only');
    expect(src).toContain('VERIFY1');
  });

  it('renders an em-dash, not a zero, when the stats call failed', () => {
    const code = withoutComments(src);
    expect(code).not.toMatch(/stats\?\.\w+\s*\?\?\s*0/);
    expect(code).toMatch(/stats\?\.total_documents\s*\?\?\s*'—'/);
  });

  it('distinguishes an empty list from an unanswered request', () => {
    expect(src).toContain('docsLoaded');
    expect(src).toContain('it is an unanswered request');
    // Both fetches must have an else branch that records the failure.
    expect((src.match(/failures\.push\(/g) || []).length).toBe(2);
  });

  it('stops promising rows that this lane can never produce', () => {
    // The old empty state said documents appear "when deeds are
    // generated with QR codes" — which wizard deeds never are.
    expect(withoutComments(src)).not.toContain('generated with QR codes');
  });
});

describe('system health reports latency honestly', () => {
  const src = readAdmin('components', 'SystemTab.tsx');

  it('renders sub-millisecond probes as such instead of as zero', () => {
    expect(src).toContain('formatLatency');
    expect(src).toContain("'<1ms'");
  });

  it('shows no latency at all when the probe did not complete', () => {
    expect(src).toContain('the probe did not complete');
    expect(withoutComments(src)).not.toContain('{health.database.latency_ms}ms');
  });
});

describe('percentage charts state their denominator', () => {
  const src = readAdmin('components', 'SystemTab.tsx');

  it('names the base the shares are taken from', () => {
    expect(src).toMatch(/Shares of \{base\} stored PDF/);
    expect(src).toContain('{count} of {base}');
  });

  it('warns when the sample is too small to read as a distribution', () => {
    expect(src).toContain('SMALL_SAMPLE_THRESHOLD');
    expect(src).toMatch(/n = \{base\}/);
  });
});

describe('pagination describes a place that exists', () => {
  const pager = readAdmin('components', 'Pager.tsx');

  it('says "No users" rather than "Page 1 of 1" over an empty set', () => {
    expect(pager).toContain('No ${noun}s');
    expect(withoutComments(pager)).not.toContain('Math.max(1, Math.ceil');
  });

  it('shows the total alongside the position', () => {
    expect(pager).toContain('{total} {noun}');
  });

  for (const tab of ['UsersTab.tsx', 'DeedsTab.tsx']) {
    it(`${tab} uses the shared pager instead of its own copy`, () => {
      const src = readAdmin('components', tab);
      expect(src).toContain("from './Pager'");
      expect(withoutComments(src)).not.toMatch(/Page \{page\} \/ \{Math\.max/);
    });
  }
});

describe('search says which of its three states it is in', () => {
  for (const tab of ['UsersTab.tsx', 'DeedsTab.tsx']) {
    const src = readAdmin('components', tab);

    it(`${tab} distinguishes searching, no-matches, and genuinely empty`, () => {
      expect(src).toContain('appliedSearch');
      expect(src).toContain('Searching for');
      expect(src).toContain('noMatches');
      // The single ambiguous string that used to cover all three.
      const code = withoutComments(src);
      expect(code).not.toMatch(/>No users<|>No deeds</);
    });

    it(`${tab} offers a way out of a filter that matched nothing`, () => {
      expect(src).toMatch(/Clear the search|Clear filters/);
    });

    it(`${tab} does not render an empty table for a failed request`, () => {
      expect(src).toContain('loadError');
      expect(src).toContain('not an empty table');
    });

    it(`${tab} loads once on mount, not twice`, () => {
      expect(src).toContain('firstRun');
    });
  }
});

describe('ADMIN3 — the email ledger states what it can and cannot know', () => {
  const src = readAdmin('components', 'EmailsTab.tsx');

  it('says recording is best-effort rather than implying completeness', () => {
    // The recorder must never break a send, so it swallows its own
    // failures. A screen built on a best-effort log that presents itself
    // as complete is a fabricated success one level up.
    expect(src).toContain('not a proof of');
    expect(src).toContain('completeness');
  });

  it('states when recording began', () => {
    // Without this a table created yesterday reads exactly like a quiet
    // month, and "0 failures" over a window that predates the log is not
    // a clean bill of health.
    expect(src).toContain('recording_since');
    expect(src).toContain('Recording began');
  });

  it('surfaces WHY sends failed, not just how many', () => {
    expect(src).toContain('failures_by_reason');
    expect(src).toContain('Why sends failed');
  });

  it('renders an em-dash, not a zero, when stats are unavailable', () => {
    const code = withoutComments(src);
    expect(code).not.toMatch(/stats\?\.\w+\s*\?\?\s*0/);
    expect(code).toContain("stats?.sent ?? '—'");
    expect(code).toContain('Not shown as zero');
  });

  it('does not compute a delivery rate out of nothing', () => {
    // 0/0 renders as NaN% or, worse, 100%. An unattempted window has no
    // rate, and saying so beats inventing one.
    expect(src).toMatch(/stats && stats\.total > 0/);
    expect(src).toContain('no attempts recorded');
  });

  it('distinguishes a failed request from an empty log', () => {
    expect(src).toContain('not an empty log');
  });

  it('is reachable from the sidebar, not only by URL', () => {
    // The A3 lesson: the API screens existed for months and nothing
    // linked to them, so they could only be found by typing a URL.
    const layout = readAdmin('layout.tsx');
    expect(layout).toContain("id: 'emails'");
    expect(layout).toContain('/admin?tab=emails');
    const page = readAdmin('page.tsx');
    expect(page).toContain('emails: {');
  });
});

describe('the lists state their sort', () => {
  it('the sort options mirror the server allowlist', () => {
    const client = fs.readFileSync(
      path.join(__dirname, '..', 'lib', 'adminApi.ts'), 'utf8');
    // Mirror pin: these keys must exist in USER_SORTS/DEED_SORTS in
    // backend/routers/admin_api_v2.py, which rejects anything else with
    // a 400. A key added here and not there is a broken control.
    for (const key of ['newest', 'oldest', 'email', 'deeds', 'last_login']) {
      expect(client).toContain(`key: '${key}'`);
    }
    for (const key of ['updated', 'type']) {
      expect(client).toContain(`key: '${key}'`);
    }
  });

  for (const tab of ['UsersTab.tsx', 'DeedsTab.tsx']) {
    it(`${tab} exposes the sort rather than applying one silently`, () => {
      const src = readAdmin('components', tab);
      expect(src).toMatch(/SORT_OPTIONS/);
      expect(src).toContain('setSort');
    });
  }
});
