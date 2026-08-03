/**
 * A4 — the developer documentation says what the API does.
 *
 * /docs was ten cards linking to routes that were never built, and the
 * endpoints it advertised did not match the real API. Documentation that
 * drifts is worse than none: a partner builds against the page, not the
 * source. These pins hold the page to the API.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const page = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'developers', 'page.tsx'), 'utf8'
);
const homepage = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'page.tsx'), 'utf8'
);
const nextConfig = fs.readFileSync(
  path.join(__dirname, '..', '..', 'next.config.js'), 'utf8'
);
const pyCatalog = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'backend', 'services', 'api_catalog.py'), 'utf8'
);
const pySchema = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'backend', 'schemas', 'api_v1', 'deeds.py'), 'utf8'
);
const openapi = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'backend', 'tests', 'snapshots', 'openapi_routes.json'), 'utf8'
)) as Array<[string, string]>;

/**
 * Placement and copy pins must read what a VISITOR sees, not what the
 * file contains: a comment explaining why a link was removed necessarily
 * names the link, and a naive source match then fails on its own
 * explanation.
 */
function withoutComments(src: string) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')  // JSX comments
    .replace(/\/\*[\s\S]*?\*\//g, '')       // block comments
    .replace(/^\s*\/\/.*$/gm, '');          // line comments
}

import { API_DEED_TYPES, HELD_FAMILIES } from '@/lib/apiDocs';

describe('documented deed types mirror the backend catalog', () => {
  it('every documented type has a requirements entry in api_catalog.py', () => {
    for (const t of API_DEED_TYPES) {
      expect(pyCatalog).toContain(`"${t.slug}": TypeRules(`);
    }
  });

  it('documents every type the backend exposes — none omitted', () => {
    const backendSlugs = [...pyCatalog.matchAll(/"([a-z_]+)": TypeRules\(/g)].map((m) => m[1]);
    expect([...API_DEED_TYPES.map((t) => t.slug)].sort()).toEqual(backendSlugs.sort());
  });

  it('the fixed-vesting instruments are documented as fixed', () => {
    const fixed = API_DEED_TYPES.filter((t) => t.vesting === 'fixed-by-instrument').map((t) => t.slug);
    expect(fixed.sort()).toEqual(['grant_deed_cp_ros', 'grant_deed_jt']);
    for (const slug of fixed) {
      // ...and the backend really does refuse a supplied vesting for them.
      const block = pyCatalog.slice(pyCatalog.indexOf(`"${slug}": TypeRules(`));
      expect(block.slice(0, 200)).toContain('fixed_vesting=True');
    }
  });

  it('the entity facts documented match the ones the backend requires', () => {
    for (const t of API_DEED_TYPES) {
      if (!t.entityFacts?.length) continue;
      const block = pyCatalog.slice(pyCatalog.indexOf(`"${t.slug}": TypeRules(`));
      for (const fact of t.entityFacts) {
        expect(block.slice(0, 300)).toContain(`"${fact}"`);
      }
    }
  });
});

describe('documented endpoints exist', () => {
  it('the endpoints the page teaches are all in the recorded route surface', () => {
    // Named explicitly rather than scraped: the page shows example ids
    // and truncated URLs, so a regex sweep tests the scraper, not the
    // docs. Adding an endpoint to the page means adding it here, which
    // is the point — it forces a check that the route exists.
    const routes = new Set(openapi.map(([method, p]) => `${method} ${p}`));
    for (const endpoint of [
      'POST /api/v1/deeds',
      'GET /api/v1/deeds/{deed_id}/pdf',
      'POST /api/v1/transfer-tax/calculate',
      'GET /api/v1/verify/{document_id}',
    ]) {
      expect(routes.has(endpoint)).toBe(true);
    }
  });

  it('documents the endpoints a partner actually needs', () => {
    expect(page).toContain('/api/v1/deeds');
    expect(page).toContain('transfer-tax/calculate');
    expect(page).toContain('Idempotency-Key');
  });
});

describe('the doctrine boundary is stated, not buried', () => {
  it('says plainly that the API does not decide legal choices', () => {
    expect(page).toMatch(/will not decide legal choices/i);
  });

  it('explains the held families as deliberate, not a roadmap gap', () => {
    expect(page).toMatch(/deliberate boundary, not a gap/i);
    expect(HELD_FAMILIES.map((f) => f.family)).toEqual(['Affidavits', 'Declarations']);
    // The reason, in the page's own words.
    expect(page).toMatch(/execution-act machinery/i);
  });

  it('states the refusal behaviour a partner will hit', () => {
    // A2's principle, customer-facing: an ignored input would be a
    // fabricated influence.
    expect(page).toMatch(/will not quietly ignore an input/i);
    expect(page).toMatch(/422/);
  });

  it('makes no legal-outcome or certification claims', () => {
    expect(page).not.toMatch(/SOC\s?2|HIPAA|ISO 27001/i);
    expect(page).not.toMatch(/legally valid|guarantees? (?:validity|acceptance)/i);
    expect(page).not.toMatch(/bank-grade|military-grade|enterprise-grade security/i);

    // "ready to record" may appear ONLY inside a disclaimer of it — the
    // phrase was removed for cause from the email set (E1) and must not
    // return here as an assertion.
    for (const sentence of page.split(/(?<=\.)\s+/)) {
      if (/ready to record/i.test(sentence)) {
        expect(sentence).toMatch(/\b(?:not|never|no response|does not)\b/i);
      }
    }
  });
});

describe('versioning is promised', () => {
  it('states the v1 scope and the path-versioning commitment', () => {
    expect(page).toMatch(/current version is <strong>v1<\/strong>/i);
    expect(page).toMatch(/\/api\/v2/);
    expect(page).toMatch(/breaking change/i);
  });
});

describe('the access path is public — no login wall', () => {
  const form = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'developers', 'ApiInquiryForm.tsx'), 'utf8'
  );

  it('the page CTAs point at the on-page form, not the authenticated one', () => {
    // A public docs page whose call to action led to /api-key-request
    // (auth-protected) put a login wall in the exact funnel it serves.
    expect(page).toContain('href="#request-access"');
    const ctaToAuthedForm = page.match(/href="\/api-key-request"/g) || [];
    expect(ctaToAuthedForm).toHaveLength(0);
  });

  it('the form posts to the public endpoint with no Authorization header', () => {
    expect(form).toContain('/api-key-inquiries');
    expect(form).not.toContain('Authorization');
    expect(form).not.toContain('access_token');
  });

  it('asks for three fields and no more', () => {
    expect(form).toContain('company_name');
    expect(form).toContain('email');
    expect(form).toContain('use_case');
    for (const extra of ['expected_volume', 'integration_timeline', 'business_type', 'phone']) {
      expect(form).not.toContain(extra);
    }
  });

  it('promises a conversation, not a key, and surfaces failures', () => {
    expect(form).toMatch(/reach out/i);
    expect(form).not.toMatch(/within 24 hours/i);
    expect(form).toContain('role="alert"');
    const successSets = form.match(/setSubmitted\(true\)/g) || [];
    expect(successSets).toHaveLength(1);
  });

  it('still offers the fuller authenticated form to signed-in users', () => {
    expect(form).toContain('/api-key-request');
  });
});

describe('placement — footer only during the design-partner phase', () => {
  it('/docs retires with a permanent redirect', () => {
    expect(nextConfig).toContain("source: '/docs'");
    expect(nextConfig).toContain("destination: '/developers'");
    expect(nextConfig).toContain('permanent: true');
    expect(fs.existsSync(path.join(__dirname, '..', 'app', 'docs'))).toBe(false);
  });

  it('the homepage footer links to it', () => {
    const footer = homepage.slice(homepage.indexOf('<footer'));
    expect(footer).toContain('href="/developers"');
  });

  it('the homepage body does NOT — footer is the only entry point', () => {
    // The integrations section carried a prominent "View API Docs"
    // button. While keys are issued manually, a link into docs you
    // cannot self-serve a key from is a dead-end funnel.
    // Comments explaining the removal necessarily name the thing
    // removed, so read what renders, not what the file contains.
    const body = withoutComments(homepage.slice(0, homepage.indexOf('<footer')));
    expect(body).not.toContain('/developers');
    expect(body).not.toMatch(/View API Docs/i);
    // ...but the integrations prose itself stays.
    expect(body).toMatch(/SoftPro, Qualia/);
  });

  it('nothing still points at the retired /docs routes', () => {
    const srcDir = path.join(__dirname, '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx?|jsx?)$/.test(entry.name) && !full.includes('__tests__')) {
          if (/href=["']\/docs/.test(fs.readFileSync(full, 'utf8'))) offenders.push(full);
        }
      }
    };
    walk(srcDir);
    expect(offenders).toEqual([]);
  });
});
