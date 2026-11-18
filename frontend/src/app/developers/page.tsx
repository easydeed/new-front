/**
 * A4 — the partner-facing API documentation.
 *
 * Recreated from docs/design/missing-pages/design_handoff_docs_trust.
 * The handoff is a visual reference. Deed types, held instruments and
 * the disclosure sentences stay sourced from the registries and from
 * the wording the developer-docs gate already pins.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { API_DEED_TYPES, HELD_FAMILIES } from '@/lib/apiDocs';
import { HELD_INSTRUMENTS } from '@/lib/instrumentAvailability';
import { MarketingFrame } from '@/components/marketing/MarketingFrame';
import ApiInquiryForm from './ApiInquiryForm';
import { BaseBar, CodeBlock, CodeTabs, DocSidebar } from './docsWidgets';

export const metadata: Metadata = {
  title: 'DeedPro API for developers',
  description:
    'Submit California deed facts from your platform. The API returns a draft for a named human to visually approve. Authentication, deed types, confirmation, idempotency, and where DeedPro keeps the human in the loop.',
};

const SECTIONS = [
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'confirmation', label: 'Confirmation' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'deed-types', label: 'Deed types' },
  { id: 'boundary', label: 'What the API will not do' },
  { id: 'idempotency', label: 'Idempotency & retries' },
  { id: 'errors', label: 'Errors' },
  { id: 'verification', label: 'Public verification' },
  { id: 'transfer-tax', label: 'Transfer tax' },
  { id: 'changelog', label: 'Versioning & changelog' },
  { id: 'request-access', label: 'Request access' },
];

const SURFACE = [
  { method: 'POST', path: '/deeds', purpose: 'Create a draft for a named approver' },
  { method: 'GET', path: '/deeds', purpose: 'List the deeds under your key' },
  { method: 'GET', path: '/deeds/{id}', purpose: 'Read one deed and its status' },
  { method: 'GET', path: '/deeds/{id}/pdf', purpose: 'The stored PDF. 409 until approved' },
  { method: 'POST', path: '/transfer-tax/calculate', purpose: 'County and city breakdown' },
  { method: 'GET', path: '/verify/{document_id}', purpose: 'Public check. No key needed' },
  { method: 'GET', path: '/openapi.json', purpose: 'The published contract' },
] as const;

const BASE_URL = 'https://deedpro-main-api.onrender.com/api/v1';

const CURL_CREATE = `curl -X POST https://deedpro-main-api.onrender.com/api/v1/deeds \\
  -H "Authorization: Bearer dp_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-48219" \\
  -d '{
    "deed_type": "grant_deed",
    "property": {
      "address": "1234 Sycamore Lane",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90001",
      "county": "Los Angeles",
      "apn": "5432-001-012",
      "legal_description": "LOT 15, BLOCK 3, TRACT 12345, IN THE CITY OF LOS ANGELES..."
    },
    "grantor": { "name": "JOHN A. DOE AND JANE B. DOE, HUSBAND AND WIFE" },
    "grantee": { "name": "ROBERT C. ROE", "vesting": "a single man" },
    "transfer_tax": {
      "exempt": false,
      "value": 750000,
      "computed_amount": "825.00",
      "basis": "full_value",
      "city_tax": true,
      "city_name": "Los Angeles"
    },
    "recording": {
      "requested_by": "Pacific Coast Escrow",
      "title_order_no": "TO-88231",
      "escrow_no": "ESC-44120",
      "return_to": {
        "name": "ROBERT C. ROE",
        "address": "1234 Sycamore Lane",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90001"
      }
    },
    "approver": {
      "name": "Jane Roe",
      "role": "escrow officer",
      "email": "jane@escrow.example"
    }
  }'`;

const CREATE_RESPONSE = `{
  "success": true,
  "data": {
    "deed_id": "deed_8Kd2mQxR4vLp",
    "document_id": "DOC-2026-H7K3M",
    "deed_type": "grant_deed",
    "status": "pending_confirmation",
    "expires_at": "2026-09-03T18:22:41Z",
    "urls": {
      "confirmation": "https://deedpro.io/confirm/…",
      "pdf": null,
      "verification": null
    },
    "approver": { "name": "Jane Roe", "role": "escrow officer" },
    "property": { "address": "1234 Sycamore Lane, Los Angeles, CA 90001", ... },
    "parties": { "grantor": "JOHN A. DOE AND JANE B. DOE", "grantee": "ROBERT C. ROE" }
  }
}`;

const PYTHON_EXAMPLE = `import requests

resp = requests.post(
    "https://deedpro-main-api.onrender.com/api/v1/deeds",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Idempotency-Key": order_id,   # safe to retry
    },
    json=deed_payload,
    timeout=60,                        # PDFs render server-side
)
resp.raise_for_status()
deed = resp.json()["data"]
# Deliver deed["urls"]["confirmation"] to the named approver.
# A stored PDF exists only after they approve.`;

const NODE_EXAMPLE = `const res = await fetch("https://deedpro-main-api.onrender.com/api/v1/deeds", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${apiKey}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": orderId,   // safe to retry
  },
  body: JSON.stringify(deedPayload),
});

if (!res.ok) {
  const { detail } = await res.json();
  throw new Error(\`\${detail.code}: \${detail.message}\`);
}

const { data } = await res.json();`;

const ERROR_SHAPE = `{
  "detail": {
    "code": "RATE_LIMITED",
    "message": "Hourly rate limit exceeded"
  }
}`;

function Breaks({ text }: { text: string }) {
  const bits = text.split(/([_.])/);
  return (
    <>
      {bits.map((bit, index) => (
        bit === '_' || bit === '.'
          ? <span key={index}>{bit}<wbr /></span>
          : <span key={index}>{bit}</span>
      ))}
    </>
  );
}

function vestingChip(vesting: 'required' | 'optional' | 'fixed-by-instrument') {
  if (vesting === 'fixed-by-instrument') return { className: 'mkt-vest fixed', label: 'fixed by the instrument' };
  if (vesting === 'optional') return { className: 'mkt-vest optional', label: 'optional' };
  return { className: 'mkt-vest required', label: 'required' };
}

const ERRORS: Array<{ status: string; tone: 'warn' | 'bad'; code: string; meaning: string }> = [
  { status: '401', tone: 'warn', code: 'UNAUTHORIZED', meaning: 'Missing, malformed, or unrecognized key.' },
  { status: '403', tone: 'warn', code: 'FORBIDDEN', meaning: 'The key exists but has been deactivated.' },
  { status: '404', tone: 'warn', code: 'NOT_FOUND', meaning: 'No deed with that id belongs to your key. Deeds are scoped per key.' },
  { status: '409', tone: 'warn', code: 'CONFIRMATION_REQUIRED', meaning: 'The PDF was requested before the named approver confirmed the rendered deed. Deliver the confirmation URL; download after approval.' },
  { status: '422', tone: 'warn', code: 'VALIDATION_ERROR', meaning: 'A required fact is missing, or an input conflicts with the instrument: a vesting clause sent to a fixed-vesting deed, or an entity deed without its organizing state. The message names the field.' },
  { status: '429', tone: 'warn', code: 'RATE_LIMITED', meaning: 'Hourly or daily ceiling reached. Check the rate-limit headers.' },
  { status: '500', tone: 'bad', code: 'INTERNAL_ERROR', meaning: 'Something failed on our side. No deed was stored. Retry with the same idempotency key.' },
];

export default function DevelopersPage() {
  return (
    <MarketingFrame here="Docs" ctaHref="#request-access" kind="docs">
      <section className="mkt-band">
        <div className="mkt-wrap" style={{ paddingTop: 'clamp(40px, 6vw, 72px)', paddingBottom: 'clamp(40px, 6vw, 72px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px 56px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <span className="mkt-eyebrow">API reference · v1</span>
            <h1>Send the facts. A named person approves the deed.</h1>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.65, color: 'var(--body)' }}>
              Submit the facts of a California deed from your platform. The API returns a draft: an id, a status and a confirmation URL, not a stored PDF. A person you name opens that URL, sees the deed as it will print, and approves or sends it back. DeedPro does not confirm facts and never will. This is the mechanism by which your human does.
            </p>
            <BaseBar url={BASE_URL} />
            <div className="mkt-row">
              <a href="#request-access" className="mkt-cta lg">Request a sandbox key</a>
              <Link href="/try" className="mkt-cta lg ghost">Run it live</Link>
            </div>
          </div>
          <div className="mkt-surface">
            <div style={{ padding: '14px 0 12px', borderBottom: '1px solid #262A33', display: 'flex', justifyContent: 'space-between', gap: 10 }} className="mono">
              <span style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-dark-muted)' }}>The whole surface</span>
              <span style={{ color: 'var(--violet)' }}>{SURFACE.length} routes</span>
            </div>
            {SURFACE.map((route) => (
              <div key={`${route.method} ${route.path}`} className="mkt-route">
                <span className="mono" style={{ fontWeight: 600, fontSize: 12, color: route.method === 'POST' ? '#C4B5FD' : '#86EFAC' }}>{route.method}</span>
                <span className="mono" style={{ fontWeight: 500, fontSize: 13, color: '#fff', overflowWrap: 'anywhere' }}><Breaks text={route.path} /></span>
                <span />
                <span style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--on-dark-muted)' }}>{route.purpose}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mkt-doc-grid">
        <DocSidebar items={SECTIONS} />
        <div style={{ minWidth: 0, paddingBottom: 56 }}>
          <section id="quickstart" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">01</span>
              <h2>Four steps from a key to a stored PDF. The third step is a human.</h2>
            </div>
            <div className="mkt-steps">
              <div className="mkt-step">
                <span className="mkt-eyebrow">01</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Get a test key</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted)' }}>
                  <a href="#request-access">Request access</a>. Three fields, no account. Keys are issued after a short conversation and start with <code className="mkt-ic">dp_test_</code>.
                </div>
              </div>
              <div className="mkt-step">
                <span className="mkt-eyebrow">02</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>POST the transaction</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted)' }}>Property, parties, transfer tax declaration, recording block and the named approver. Incomplete facts fail here.</div>
              </div>
              <div className="mkt-step on">
                <span className="mkt-eyebrow">03</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Deliver the confirmation URL</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted)' }}>The person you named sees the rendered deed, not a summary, and approves or rejects it with a reason.</div>
              </div>
              <div className="mkt-step">
                <span className="mkt-eyebrow">04</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Download after approval</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted)' }}>Until then <code className="mkt-ic">GET /deeds/{'{id}'}/pdf</code> returns 409.</div>
              </div>
            </div>
            <CodeTabs samples={[
              { id: 'curl', label: 'cURL', code: CURL_CREATE },
              { id: 'python', label: 'Python', code: PYTHON_EXAMPLE },
              { id: 'node', label: 'Node', code: NODE_EXAMPLE },
            ]} />
            <CodeBlock label="Response · 201" code={CREATE_RESPONSE} />
          </section>

          <section id="confirmation" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">02</span>
              <h2>Nothing reaches a stored instrument unseen.</h2>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>
              This is why the API exists in this shape. DeedPro formats and records. It does not confirm facts. The old one-call generate — POST, get a stored PDF, done — is dead. That path let a machine produce a recordable instrument with no human in the loop, which voided the product&rsquo;s central promise.
            </p>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>
              What this preserves: nothing reaches a stored instrument unseen. What it costs: you cannot treat generate as a synchronous one-call download. You hold the source data. If the human says the deed is wrong, you correct it in your system and POST again with a new <code className="mkt-ic">Idempotency-Key</code>. Replaying a rejected key returns the rejected draft. It does not mint a new one.
            </p>
            <div className="mkt-points">
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Named for the record, token for auth</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>Send <code className="mkt-ic">approver.name</code> and <code className="mkt-ic">approver.role</code>. Optional email is stored, never mailed in v1, and purged after the same contact-retention window as signer contact. You deliver the link.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Seven days</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>An unapproved draft expires. Preview bytes are dropped. The token then shows expired.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>The bytes they approved are the bytes stored</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>The deed is rendered once at create. Approval promotes those preview bytes and stamps the hash. Re-rendering would store a different document than the one they saw.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Reject, do not edit</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>The confirmation page is not a second builder. The human sends a reason. You change the facts where they live.</div>
              </div>
            </div>
          </section>

          <section id="authentication" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">03</span>
              <h2>Every request carries your key as a bearer token.</h2>
            </div>
            <CodeBlock label="Header" code={'Authorization: Bearer dp_live_...'} />
            <div className="mkt-points">
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Test and live keys</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}><code className="mkt-ic">dp_test_</code> and <code className="mkt-ic">dp_live_</code>. Both generate real PDFs on the same templates; test keys exist so you can build and demo without your traffic mixing into live records.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Shown once</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>Keys are stored hashed. The full value appears exactly once, when it is created. If it is lost, we issue a new one rather than recovering the old.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Rate limits</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>Per-key hourly and daily ceilings. Responses carry <code className="mkt-ic">X-RateLimit-Limit</code> and <code className="mkt-ic">X-RateLimit-Remaining</code>; exceeding one returns 429. Tell us your expected volume and we will set the ceiling to match.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Revocation</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>A key can be deactivated at any time; calls with it stop immediately and return 403.</div>
              </div>
            </div>
          </section>

          <section id="deed-types" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">04</span>
              <h2>{API_DEED_TYPES.length} instruments, each rendered from its own template.</h2>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>
              Read the vesting column closely: two instruments state their vesting on their own face, and for those the API rejects a supplied value instead of ignoring it.
            </p>
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>deed_type</th>
                  <th>Instrument</th>
                  <th>grantee.vesting</th>
                  <th>Also required</th>
                </tr>
              </thead>
              <tbody>
                {API_DEED_TYPES.map((type) => {
                  const chip = vestingChip(type.vesting);
                  return (
                    <tr key={type.slug}>
                      <td><code><Breaks text={type.slug} /></code></td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{type.label}</div>
                        {type.note && <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted)', marginTop: 4 }}>{type.note}</div>}
                      </td>
                      <td><span className={chip.className}>{chip.label}</span></td>
                      <td>
                        {type.entityFacts?.length
                          ? type.entityFacts.map((fact) => (
                            <div key={fact}><code><Breaks text={`grantor.entity.${fact}`} /></code></div>
                          ))
                          : <span style={{ color: '#6b7280' }}>none</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {HELD_INSTRUMENTS.length > 0 && (
              <div className="mkt-hold">
                <strong>On hold: </strong>
                {HELD_INSTRUMENTS.map((hold, index) => (
                  <span key={hold.slug}>
                    {index > 0 ? ' ' : ''}
                    <code className="mkt-ic"><Breaks text={hold.slug} /></code>
                    {' — '}
                    {hold.reason}
                  </span>
                ))}
                {' '}See the <a href="#changelog">changelog</a>.
              </div>
            )}
          </section>

          <section id="boundary" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">05</span>
              <h2>What the API will not do.</h2>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>Worth reading before you integrate, and worth handing to your counsel.</p>
            <div className="mkt-points">
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>It will not decide legal choices for you</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>Vesting, the transfer-tax basis, whether an exemption applies, which instrument fits the transaction: these arrive as facts you send, and they are recorded as your declarations. DeedPro formats and records; it does not choose. Nothing the API returns is legal advice, and no response asserts that a document is valid, effective, or ready to record.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>It will not quietly ignore an input it cannot use</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>
                  Send a vesting clause to a joint-tenancy deed and you get a 422 naming the conflict, not a 200 and a document that disregarded it. If your input did not shape the instrument, you hear about it. Required text must contain more than whitespace. International names and multiline legal descriptions are accepted without truncation; character limits are published in the OpenAPI schema. Numeric inputs must be finite, and supplied decimal amounts must fit the documented precision. Invalid input returns a field-specific 422 before a deed preview is rendered or stored. These checks do not verify a person&rsquo;s identity, a property fact, or the legal sufficiency of an instruction.
                </div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Some instruments require a human flow by design</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>
                  v1 covers the deed family only. Affidavits and declarations —{' '}
                  {HELD_FAMILIES.map((family, index) => (
                    <span key={family.family}>
                      {index > 0 && ', '}
                      {family.examples}
                    </span>
                  ))}
                  {' '}— carry execution-act machinery: statements sworn under jurat, initial lines, checkbox elections. Their whole premise is a human hand at the moment of execution, and a machine-to-machine call has no hand. Those instruments stay in the DeedPro app, where a person makes the elections and signs. This is a deliberate boundary, not a gap in the roadmap.
                </div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>California only</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>Templates are measured to California county recorder requirements. <code className="mkt-ic">property.state</code> must be <code className="mkt-ic">CA</code>.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Recorded pages carry no verification chrome</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>Every API deed includes a blank California acknowledgment page for the notary to complete. That page is part of the deed chassis, not an option. The PDF does not print a QR code, verification URL, or DeedPro document ID; verification stays in the API response.</div>
              </div>
            </div>
          </section>

          <section id="idempotency" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">06</span>
              <h2>A retried request must not produce a second deed.</h2>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>
              A deed is a legal instrument, and a retried request must not produce a second one. Send an <code className="mkt-ic">Idempotency-Key</code> header — your order or file number works well — and a repeat with the same key returns the original draft. If that draft was rejected or expired, you get that record back. A replay does not resurrect a rejected body as a new draft.
            </p>
            <CodeBlock label="Header" code="Idempotency-Key: order-48219" />
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>Keys are scoped to your API key. PDF rendering happens server-side, so allow a generous timeout (60s) and retry with the same idempotency key rather than a fresh one.</p>
          </section>

          <section id="errors" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">07</span>
              <h2>Errors carry a stable code and a message you can act on.</h2>
            </div>
            <CodeBlock label="Error shape" code={ERROR_SHAPE} />
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Code</th>
                  <th>What it means</th>
                </tr>
              </thead>
              <tbody>
                {ERRORS.map((row) => (
                  <tr key={row.status}>
                    <td><span className={row.tone === 'bad' ? 'mkt-status bad' : 'mkt-status warn'}>{row.status}</span></td>
                    <td><code><Breaks text={row.code} /></code></td>
                    <td>{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section id="verification" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">08</span>
              <h2>Anyone holding a document ID can check it. It reveals nothing else.</h2>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>
              <code className="mkt-ic">GET /verify/{'{document_id}'}</code> needs no API key so a person holding the ID can check it. A valid response contains only the document ID, deed type, status, and creation time. It does not publish the property address, APN, or party names.
            </p>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>
              Public verification is limited to 60 attempts per client address per hour. A 429 response includes <code className="mkt-ic">Retry-After</code> and rate-limit headers.
            </p>
          </section>

          <section id="transfer-tax" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">09</span>
              <h2>A calculator for your declaration, not a decision.</h2>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>
              <code className="mkt-ic">POST /transfer-tax/calculate</code> returns a county and city breakdown for a value and location. It is a convenience for populating your own declaration. The amount that prints on the deed is the one you send in <code className="mkt-ic">transfer_tax</code>.
            </p>
            <div className="mkt-points">
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>County</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>One rate statewide: $0.55 per $500 increment or fraction of the supplied taxable base (R&amp;T §11911).</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>City</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>City rates apply only to cities that levy their own documentary transfer tax. A city that levies none is reported as levying none; no generic rate is applied.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Approximations</div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>City rates approximate tiered municipal schedules. Verify against the current schedule for the recording jurisdiction; the response carries this caveat alongside the number.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}><code className="mkt-ic">transfer_tax.basis</code></div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>The basis you direct the deed to print: <code className="mkt-ic">full_value</code> or <code className="mkt-ic">less_liens</code>. DeedPro does not infer or verify that legal choice. When using the calculator, send the lien amount in its numeric <code className="mkt-ic">less_liens</code> field and send the resulting amount in your deed request.</div>
              </div>
              <div className="mkt-card-top">
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}><code className="mkt-ic">transfer_tax.exempt_code</code></div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}><code className="mkt-ic">transfer_tax.exempt_code</code> is a free-form string. The API does not maintain or validate against a statutory exemption-code list. Send a code only after your professional has determined the applicable wording.</div>
              </div>
            </div>
          </section>

          <section id="changelog" data-doc="1" className="mkt-doc-sec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="mkt-eyebrow">10</span>
              <h2>Versioning and changelog.</h2>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>
              The current version is <strong>v1</strong>, covering the deed family. Additive changes — new deed types, new optional fields, new response keys — ship within v1 without notice. Apart from the explicit safety cutovers recorded below, a later breaking change would ship under a new path (<code className="mkt-ic">/api/v2</code>).
            </p>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: 'var(--body)', maxWidth: 720 }}>
              <strong style={{ color: 'var(--ink)' }}>Model 2 cutover, 2026-08-27.</strong> This broke v1 on purpose. There were no live integrators, keys were still manual, and keeping a generate-without-human path would have been a control that looked like a choice and did not enforce the ruling. The old promise — POST and receive a stored PDF — is dead, not deprecated.
            </p>
            <div>
              <div className="mkt-log">
                <time>2026-11-10</time>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>County calculator rounding repair</div>
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>The county estimate now uses $500 increments or fractions instead of a continuous percentage. Municipal rate logic is unchanged. Calculation does not determine taxability or select an exemption; confirm the applicable jurisdiction and instructions separately.</div>
                </div>
              </div>
              <div className="mkt-log">
                <time>2026-11-10</time>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>v1 interspousal safety hold</div>
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>New interspousal-transfer creation and pending approval are suspended while its tax instructions and legal form await domain review. Seven API deed types remain available. Stored completed PDFs remain accessible; this hold does not rewrite existing documents or choose an exemption for you.</div>
                </div>
              </div>
              <div className="mkt-log">
                <time>2026-11-09</time>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>v1 tax-deed safety hold</div>
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>New tax-deed creation and pending approval are suspended while the county workflow and form are reviewed. Existing stored PDFs remain readable. This is an explicit change to v1 availability; no substitute instrument is selected for you.</div>
                </div>
              </div>
              <div className="mkt-log">
                <time>2026-11-09</time>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>v1 input safety cutover</div>
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>Validation revision P02-2026-11-09 deliberately tightens v1: blank required text, nonfinite numbers and malformed or oversized inputs previously accepted now return 422. Existing integrations must review the published schema before cutover. Routes and response shapes stay unchanged; no tax basis, exemption or other legal choice is made for the caller.</div>
                </div>
              </div>
              <div className="mkt-log">
                <time>2026-08-27</time>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>v1 Model 2 cutover</div>
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}><code className="mkt-ic">POST /api/v1/deeds</code> returns a draft and a confirmation URL. A stored PDF exists only after approval. <code className="mkt-ic">approver.name</code> and <code className="mkt-ic">approver.role</code> are required. Reject-with-reason; a replayed Idempotency-Key does not resurrect a rejected draft.</div>
                </div>
              </div>
              <div className="mkt-log">
                <time>2026-08</time>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>v1</div>
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--muted)' }}>{API_DEED_TYPES.length} currently available deed types (grant, quitclaim, interspousal, warranty, joint tenancy, community property with right of survivorship, corporate and partnership grantors). Idempotency keys. Per-key rate limits and usage reporting. Public document verification.</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section id="request-access" data-doc="1" className="mkt-dark">
        <div className="mkt-wrap" style={{ paddingTop: 'clamp(64px, 8vw, 104px)', paddingBottom: 'clamp(64px, 8vw, 104px)', display: 'flex', flexDirection: 'column', gap: 36 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
            <h2 style={{ fontSize: 'clamp(38px, 5vw, 64px)', lineHeight: 1.04, letterSpacing: '-0.03em' }}>See your first deed before you spend a dollar.</h2>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: 'var(--on-dark-muted)' }}>Three fields. No account, no card, no sales deck.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <div className="mkt-inquiry" style={{ background: '#12141A', border: '1px solid #7C4DFF', borderRadius: 14, padding: 28 }}>
              <div className="mono" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--violet-soft)' }}>I build software</div>
              <ApiInquiryForm />
            </div>
            <div style={{ border: '1px solid #262A33', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="mono" style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--violet-soft)' }}>What happens next</div>
              <div style={{ display: 'flex', gap: 14 }}><span className="mono" style={{ fontWeight: 600, fontSize: 12, color: 'var(--violet-soft)' }}>01</span><span style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--on-dark)' }}>A person reads your request and replies from info@deedpro.io.</span></div>
              <div style={{ display: 'flex', gap: 14 }}><span className="mono" style={{ fontWeight: 600, fontSize: 12, color: 'var(--violet-soft)' }}>02</span><span style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--on-dark)' }}>You get a dp_test_ key: real PDFs and the full approval flow.</span></div>
              <div style={{ display: 'flex', gap: 14 }}><span className="mono" style={{ fontWeight: 600, fontSize: 12, color: 'var(--violet-soft)' }}>03</span><span style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--on-dark)' }}>You build and demo. A live key is a later conversation, not a checkout on this page.</span></div>
              <div style={{ marginTop: 'auto', borderTop: '1px solid #262A33', paddingTop: 16, fontSize: 15, color: 'var(--on-dark-muted)' }}>Not building software? <Link href="/escrow" style={{ color: 'var(--violet-soft)', fontWeight: 600 }}>DeedPro for escrow desks →</Link></div>
            </div>
          </div>
        </div>
      </section>
    </MarketingFrame>
  );
}
