/**
 * A3 — the API access funnel tells the truth, and the admin can reach it.
 *
 * Two things were wrong on this surface:
 *
 * 1. The request form's submit handler was a two-second timeout followed
 *    by a success screen promising a review within 24 hours. Nothing was
 *    sent, nothing stored, and nobody could perform that review — a
 *    fabricated success (invariant #4) aimed at prospective customers.
 * 2. The page claimed "SOC2 compliant" security. That is a compliance
 *    certification, not a feature description, and it was not earned.
 *    Stating it to enterprise buyers is the most consequential untrue
 *    sentence that was on the site.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

function readSource(...segments: string[]) {
  return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');
}

/**
 * Copy pins must read what a VISITOR sees, not what the file contains —
 * the comments explaining why a claim was removed necessarily quote it,
 * and a naive source match then fails on its own explanation.
 */
function withoutComments(src: string) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block and JSX comments
    .replace(/^\s*\/\/.*$/gm, '');       // line comments
}

const requestPage = readSource('app', 'api-key-request', 'page.tsx');
const adminPage = readSource('app', 'admin', 'page.tsx');
const adminLayout = readSource('app', 'admin', 'layout.tsx');
const apiTab = readSource('app', 'admin', 'components', 'ApiTab.tsx');
const adminApi = readSource('lib', 'adminApi.ts');

describe('API access request — the submit is real', () => {
  it('posts to the backend instead of faking a delay', () => {
    expect(requestPage).toContain("apiFetch('/api-key-requests'");
    expect(requestPage).toContain("method: 'POST'");
  });

  it('has no simulated submission left', () => {
    // The exact shape of the old lie: a timeout standing in for a request.
    expect(requestPage).not.toMatch(/setTimeout\(resolve/);
    expect(requestPage).not.toContain('Simulate API call');
    expect(requestPage).not.toMatch(/In production, send to backend/);
  });

  it('surfaces a failed submit instead of showing success anyway', () => {
    expect(requestPage).toContain('setError');
    expect(requestPage).toContain('role="alert"');
    // Success is set only on a successful response.
    const successSets = requestPage.match(/setSubmitted\(true\)/g) || [];
    expect(successSets).toHaveLength(1);
  });
});

describe('API access request — the copy is true', () => {
  const copy = withoutComments(requestPage);

  it('makes no compliance certification claim', () => {
    expect(copy).not.toMatch(/SOC\s?2/i);
    expect(copy).not.toMatch(/HIPAA|ISO 27001|PCI[- ]DSS/i);
  });

  it('promises no turnaround time it cannot keep', () => {
    expect(copy).not.toMatch(/within 24 hours/i);
    expect(copy).not.toMatch(/within 4 hours/i);
    expect(copy).not.toMatch(/delivered within/i);
  });

  it('describes the manual issuance process honestly', () => {
    expect(copy).toMatch(/reach out/i);
    expect(copy).toMatch(/conversation/i);
  });

  it('does not advertise staff it does not have', () => {
    expect(copy).not.toMatch(/Dedicated Support/i);
    expect(copy).not.toMatch(/Personal onboarding/i);
  });
});

describe('admin API tab', () => {
  it('is registered as a tab and linked in the nav', () => {
    // The key-admin screens existed before but nothing linked to them —
    // they could only be found by typing a URL.
    expect(adminPage).toContain('ApiTab');
    expect(adminPage).toMatch(/api:\s*\{/);
    expect(adminLayout).toContain("id: 'api'");
    expect(adminLayout).toContain('/admin?tab=api');
  });

  it('talks to the main API through the authenticated admin client', () => {
    expect(apiTab).toContain("from '@/lib/adminApi'");
    // The previous key UI used a shared setup secret against a separate
    // service and dropped the admin's own JWT.
    expect(apiTab).not.toMatch(/X-Admin-Setup-Secret/i);
    expect(apiTab).not.toMatch(/EXTERNAL_API/i);
    expect(adminApi).toContain("'/admin/api-keys");
  });

  it('warns that a minted key is shown once', () => {
    expect(apiTab).toMatch(/cannot be shown again/i);
  });

  it('shows an inquiry whose notification email failed', () => {
    // Storing before sending is pointless if the UI hides the ones that
    // did not send.
    expect(apiTab).toContain('notify_error');
  });

  it('reports load failures instead of rendering an empty state', () => {
    expect(apiTab).toContain('setError');
    expect(apiTab).toMatch(/Failed to load API data/);
  });
});
