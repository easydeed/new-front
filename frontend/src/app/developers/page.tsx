/**
 * A4 — the partner-facing API documentation.
 *
 * Replaces /docs, which was ten cards linking to routes that were never
 * built. This page documents the API that exists: nine deed types
 * derived from the FORMS registry, the auth and idempotency contracts
 * A1 added, and the doctrine boundary stated as disclosure rather than
 * apology — a title company's counsel should be able to read section
 * "What the API will not do" and know exactly where the human stays in
 * the loop.
 *
 * Voice per docs/BRAND.md: specific over vague, suggests/decides/records
 * kept distinct, no compliance theater, no legal-outcome claims.
 *
 * Placement (owner-ruled): live and indexable, linked from the footer
 * only — not the main nav — while key issuance is manual.
 */
import type { Metadata } from 'next';
import { API_DEED_TYPES, HELD_FAMILIES } from '@/lib/apiDocs';
import { LogoLockup } from '@/components/brand/Logo';

export const metadata: Metadata = {
  title: 'DeedPro API for developers',
  description:
    'Generate recorder-formatted California deeds from your platform. Authentication, deed types, idempotency, errors, and where DeedPro deliberately keeps a human in the loop.',
};

const SECTIONS = [
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'deed-types', label: 'Deed types' },
  { id: 'boundary', label: 'What the API will not do' },
  { id: 'idempotency', label: 'Idempotency & retries' },
  { id: 'errors', label: 'Errors' },
  { id: 'transfer-tax', label: 'Transfer tax' },
  { id: 'changelog', label: 'Versioning & changelog' },
];

function Code({ children, label }: { children: string; label?: string }) {
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-gray-200 bg-[#0f1419]">
      {label && (
        <div className="border-b border-gray-800 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-100">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-2xl font-bold text-[#1F2B37] sm:text-3xl">
      {children}
    </h2>
  );
}

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
    }
  }'`;

const CREATE_RESPONSE = `{
  "success": true,
  "data": {
    "deed_id": "deed_8Kd2mQxR4vLp",
    "document_id": "DOC-2026-H7K3M",
    "deed_type": "grant_deed",
    "status": "completed",
    "created_at": "2026-08-03T18:22:41Z",
    "urls": {
      "pdf": ".../api/v1/deeds/deed_8Kd2mQxR4vLp/pdf",
      "verification": ".../verify/DOC-2026-H7K3M"
    },
    "property": { "address": "1234 Sycamore Lane, Los Angeles, CA 90001", ... },
    "parties": { "grantor": "JOHN A. DOE AND JANE B. DOE", "grantee": "ROBERT C. ROE" },
    "transfer_tax": { "amount": "$825.00", "exempt": false }
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

pdf = requests.get(deed["urls"]["pdf"],
                   headers={"Authorization": f"Bearer {API_KEY}"})
open(f"{deed['document_id']}.pdf", "wb").write(pdf.content)`;

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

export default function DevelopersPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" aria-label="DeedPro home">
            <LogoLockup size={30} />
          </a>
          <a
            href="/api-key-request"
            className="rounded-lg bg-[#7C4DFF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6a3ff0]"
          >
            Request access
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12 lg:flex lg:gap-12">
        {/* Section nav */}
        <nav className="mb-10 lg:sticky lg:top-8 lg:mb-0 lg:h-fit lg:w-56 lg:shrink-0">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            On this page
          </div>
          <ul className="space-y-2 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-gray-600 transition-colors hover:text-[#7C4DFF]">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          {/* Intro */}
          <div className="mb-14">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1F2B37] sm:text-4xl">
              DeedPro API
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-600">
              Generate recorder-formatted California deeds from your platform. You send
              the facts of the transaction; the API returns a stored PDF measured to
              county recorder margins — the same templates and page geometry the
              DeedPro app itself renders.
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-gray-600">
              Base URL{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[13px]">
                https://deedpro-main-api.onrender.com/api/v1
              </code>
            </p>
          </div>

          {/* Quickstart */}
          <section className="mb-16">
            <H2 id="quickstart">Quickstart</H2>
            <p className="mt-4 leading-relaxed text-gray-600">
              Three steps from a key to a recordable PDF.
            </p>
            <ol className="mt-6 space-y-3 text-gray-600">
              <li>
                <strong className="text-[#1F2B37]">1. Get a test key.</strong>{' '}
                <a href="/api-key-request" className="text-[#7C4DFF] hover:underline">
                  Request access
                </a>{' '}
                — we issue keys after a short conversation about what you&rsquo;re building.
                The form sits behind a DeedPro account, so you&rsquo;ll sign in or create
                one first. Test keys start with{' '}
                <code className="rounded bg-gray-100 px-1 text-[13px]">dp_test_</code>.
              </li>
              <li>
                <strong className="text-[#1F2B37]">2. POST the transaction.</strong> One
                request carries the property, the parties, the transfer tax declaration,
                and the recording block.
              </li>
              <li>
                <strong className="text-[#1F2B37]">3. Download the PDF.</strong> The
                response includes an authenticated PDF URL and a public verification URL.
              </li>
            </ol>

            <Code label="Create a deed">{CURL_CREATE}</Code>
            <Code label="Response">{CREATE_RESPONSE}</Code>

            <h3 className="mt-8 text-lg font-bold text-[#1F2B37]">Python</h3>
            <Code>{PYTHON_EXAMPLE}</Code>

            <h3 className="mt-8 text-lg font-bold text-[#1F2B37]">Node</h3>
            <Code>{NODE_EXAMPLE}</Code>
          </section>

          {/* Authentication */}
          <section className="mb-16">
            <H2 id="authentication">Authentication</H2>
            <p className="mt-4 leading-relaxed text-gray-600">
              Every request carries your key as a bearer token:
            </p>
            <Code>{`Authorization: Bearer dp_live_...`}</Code>

            <ul className="mt-6 space-y-3 text-gray-600">
              <li>
                <strong className="text-[#1F2B37]">Test and live keys.</strong>{' '}
                <code className="rounded bg-gray-100 px-1 text-[13px]">dp_test_</code> and{' '}
                <code className="rounded bg-gray-100 px-1 text-[13px]">dp_live_</code>. Both
                generate real PDFs on the same templates; test keys exist so you can build
                and demo without your traffic mixing into live records.
              </li>
              <li>
                <strong className="text-[#1F2B37]">Shown once.</strong> Keys are stored
                hashed. The full value appears exactly once, when it is created — if it is
                lost, we issue a new one rather than recovering the old.
              </li>
              <li>
                <strong className="text-[#1F2B37]">Rate limits.</strong> Per-key hourly and
                daily ceilings. Responses carry{' '}
                <code className="rounded bg-gray-100 px-1 text-[13px]">X-RateLimit-Limit</code>{' '}
                and{' '}
                <code className="rounded bg-gray-100 px-1 text-[13px]">X-RateLimit-Remaining</code>;
                exceeding one returns <strong>429</strong>. Tell us your expected volume and
                we will set the ceiling to match.
              </li>
              <li>
                <strong className="text-[#1F2B37]">Revocation.</strong> A key can be
                deactivated at any time; calls with it stop immediately and return{' '}
                <strong>403</strong>.
              </li>
            </ul>
          </section>

          {/* Deed types */}
          <section className="mb-16">
            <H2 id="deed-types">Deed types</H2>
            <p className="mt-4 max-w-2xl leading-relaxed text-gray-600">
              Nine instruments, each rendered from its own template. The vesting column is
              worth reading closely: two instruments state their vesting on their own face,
              and for those the API rejects a supplied value rather than ignoring it.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-3 pr-4 font-semibold text-[#1F2B37]">deed_type</th>
                    <th className="py-3 pr-4 font-semibold text-[#1F2B37]">Instrument</th>
                    <th className="py-3 pr-4 font-semibold text-[#1F2B37]">grantee.vesting</th>
                    <th className="py-3 font-semibold text-[#1F2B37]">Also required</th>
                  </tr>
                </thead>
                <tbody>
                  {API_DEED_TYPES.map((t) => (
                    <tr key={t.slug} className="border-b border-gray-100 align-top">
                      <td className="py-3 pr-4">
                        <code className="text-[13px] text-[#1F2B37]">{t.slug}</code>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {t.label}
                        {t.note && (
                          <div className="mt-1 text-[13px] text-gray-500">{t.note}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {t.vesting === 'fixed-by-instrument' ? (
                          <span className="font-medium text-[#1F2B37]">
                            fixed by the instrument
                          </span>
                        ) : (
                          t.vesting
                        )}
                      </td>
                      <td className="py-3 text-gray-600">
                        {t.entityFacts?.length
                          ? t.entityFacts.map((f) => (
                              <div key={f}>
                                <code className="text-[13px]">grantor.entity.{f}</code>
                              </div>
                            ))
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Doctrine boundary */}
          <section className="mb-16">
            <H2 id="boundary">What the API will not do</H2>
            <p className="mt-4 max-w-2xl leading-relaxed text-gray-600">
              Worth reading before you integrate, and worth handing to your counsel.
            </p>

            <div className="mt-6 space-y-6 text-gray-600">
              <div>
                <h3 className="font-bold text-[#1F2B37]">
                  It will not decide legal choices for you
                </h3>
                <p className="mt-2 leading-relaxed">
                  Vesting, the transfer-tax basis, whether an exemption applies, which
                  instrument fits the transaction — these arrive as facts you send, and
                  they are recorded as your declarations. DeedPro formats and records; it
                  does not choose. Nothing the API returns is legal advice, and no response
                  asserts that a document is valid, effective, or ready to record.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#1F2B37]">
                  It will not quietly ignore an input it cannot use
                </h3>
                <p className="mt-2 leading-relaxed">
                  Send a vesting clause to a joint-tenancy deed and you get a 422 naming
                  the conflict — not a 200 and a document that disregarded it. If your
                  input did not shape the instrument, you hear about it.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#1F2B37]">
                  Some instruments require a human flow by design
                </h3>
                <p className="mt-2 leading-relaxed">
                  v1 covers the deed family only. Affidavits and declarations —{' '}
                  {HELD_FAMILIES.map((f, i) => (
                    <span key={f.family}>
                      {i > 0 && ', '}
                      {f.examples}
                    </span>
                  ))}{' '}
                  — carry execution-act machinery: statements sworn under jurat, initial
                  lines, checkbox elections. Their whole premise is a human hand at the
                  moment of execution, and a machine-to-machine call has no hand. Those
                  instruments stay in the DeedPro app, where a person makes the elections
                  and signs. This is a deliberate boundary, not a gap in the roadmap.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#1F2B37]">California only</h3>
                <p className="mt-2 leading-relaxed">
                  Templates are measured to California county recorder requirements.{' '}
                  <code className="rounded bg-gray-100 px-1 text-[13px]">property.state</code>{' '}
                  must be <code className="rounded bg-gray-100 px-1 text-[13px]">CA</code>.
                </p>
              </div>
            </div>
          </section>

          {/* Idempotency */}
          <section className="mb-16">
            <H2 id="idempotency">Idempotency &amp; retries</H2>
            <p className="mt-4 max-w-2xl leading-relaxed text-gray-600">
              A deed is a legal instrument, and a retried request must not produce a second
              one. Send an{' '}
              <code className="rounded bg-gray-100 px-1 text-[13px]">Idempotency-Key</code>{' '}
              header — your order or file number works well — and a repeat with the same key
              returns the original deed instead of generating a duplicate.
            </p>
            <Code>{`Idempotency-Key: order-48219`}</Code>
            <p className="leading-relaxed text-gray-600">
              Keys are scoped to your API key. PDF rendering happens server-side, so allow
              a generous timeout (60s) and retry with the same idempotency key rather than
              a fresh one.
            </p>
          </section>

          {/* Errors */}
          <section className="mb-16">
            <H2 id="errors">Errors</H2>
            <p className="mt-4 leading-relaxed text-gray-600">
              Errors carry a stable code and a message meant to be actionable.
            </p>
            <Code>{ERROR_SHAPE}</Code>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-3 pr-4 font-semibold text-[#1F2B37]">Status</th>
                    <th className="py-3 pr-4 font-semibold text-[#1F2B37]">Code</th>
                    <th className="py-3 font-semibold text-[#1F2B37]">What it means</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4">401</td>
                    <td className="py-3 pr-4"><code className="text-[13px]">UNAUTHORIZED</code></td>
                    <td className="py-3">Missing, malformed, or unrecognized key.</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4">403</td>
                    <td className="py-3 pr-4"><code className="text-[13px]">FORBIDDEN</code></td>
                    <td className="py-3">The key exists but has been deactivated.</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4">404</td>
                    <td className="py-3 pr-4"><code className="text-[13px]">NOT_FOUND</code></td>
                    <td className="py-3">
                      No deed with that id belongs to your key. Deeds are scoped per key.
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4">422</td>
                    <td className="py-3 pr-4">validation</td>
                    <td className="py-3">
                      A required fact is missing, or an input conflicts with the instrument
                      — a vesting clause sent to a fixed-vesting deed, or an entity deed
                      without its organizing state. The message names the field.
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4">429</td>
                    <td className="py-3 pr-4"><code className="text-[13px]">RATE_LIMITED</code></td>
                    <td className="py-3">
                      Hourly or daily ceiling reached. Check the rate-limit headers.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">500</td>
                    <td className="py-3 pr-4"><code className="text-[13px]">INTERNAL_ERROR</code></td>
                    <td className="py-3">
                      Something failed on our side. No deed was stored — retry with the same
                      idempotency key.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Transfer tax */}
          <section className="mb-16">
            <H2 id="transfer-tax">Transfer tax</H2>
            <p className="mt-4 max-w-2xl leading-relaxed text-gray-600">
              <code className="rounded bg-gray-100 px-1 text-[13px]">
                POST /transfer-tax/calculate
              </code>{' '}
              returns a county and city breakdown for a value and location. It is a
              convenience for populating your own declaration — the amount that prints on
              the deed is the one you send in{' '}
              <code className="rounded bg-gray-100 px-1 text-[13px]">transfer_tax</code>.
            </p>
            <ul className="mt-5 space-y-2 text-gray-600">
              <li>County rate: $1.10 per $1,000 (R&amp;T §11911).</li>
              <li>
                City rates apply only to cities that levy their own documentary transfer
                tax. A city that levies none is reported as levying none — the endpoint
                does not apply a generic rate.
              </li>
              <li>
                City rates are approximations of tiered municipal schedules. Verify against
                the current schedule for the recording jurisdiction; the response carries
                this caveat alongside the number.
              </li>
            </ul>
          </section>

          {/* Changelog */}
          <section className="mb-8">
            <H2 id="changelog">Versioning &amp; changelog</H2>
            <p className="mt-4 max-w-2xl leading-relaxed text-gray-600">
              The current version is <strong>v1</strong>, covering the deed family. Additive
              changes — new deed types, new optional fields, new response keys — ship within
              v1 without notice. A breaking change would ship under a new path (
              <code className="rounded bg-gray-100 px-1 text-[13px]">/api/v2</code>), and v1
              would keep working; we will not repurpose a field or change what an existing
              one means underneath you.
            </p>
            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <div>
                <span className="font-semibold text-[#1F2B37]">2026-08 · v1</span> — Nine
                deed types (grant, quitclaim, interspousal, warranty, tax, joint tenancy,
                community property with right of survivorship, corporate and partnership
                grantors). Idempotency keys. Per-key rate limits and usage reporting.
                Public document verification.
              </div>
            </div>
          </section>

          {/* Footer CTA */}
          <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-8">
            <h2 className="text-xl font-bold text-[#1F2B37]">Ready to build?</h2>
            <p className="mt-2 max-w-xl leading-relaxed text-gray-600">
              Tell us what you&rsquo;re integrating and we&rsquo;ll set you up with a test key.
              We issue keys after a conversation — it is a short one, and it means the fit is
              clear on both sides. The request form asks you to sign in first.
            </p>
            <a
              href="/api-key-request"
              className="mt-5 inline-block rounded-lg bg-[#7C4DFF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6a3ff0]"
            >
              Request API access
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
