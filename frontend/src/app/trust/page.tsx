/**
 * ENGINE1 — the trust centre, built as an honest inventory.
 *
 * ═══ WHY THIS PAGE IS NOT THE MOCKUP ═══
 *
 * `docs/design/trust.html` opens "Everything your security review will ask
 * for, on one page" and then answers it with an Availability panel, a
 * Support-and-SLA table, an insurance tile, a security mailbox and a
 * certification roadmap. **Every one of those is a thing we do not have.**
 *
 * The mockup was structured roughly 80% capability, 20% candour, with
 * "What we do not have yet" as a closing note. Bracketing the missing
 * values would have left a panel of empty charts under the words "All
 * systems operational" — which says "we measure nothing" more loudly than
 * omitting the panel does, and says it while looking like a product page.
 *
 * Owner-ruled: cut those sections rather than empty them, and **replace the
 * thesis instead**. The headline was false by subtraction — a page that
 * cannot answer availability, SLA, insurance or certification is not
 * "everything your security review will ask for".
 *
 * So the ratio inverts, and that is the design rather than the damage. An
 * integrator who has been burned trusts a vendor that publishes its gaps
 * before being asked more than one that publishes certifications, because
 * the second tells you nothing about what is being withheld.
 *
 * ═══ THE REGISTER, AND IT IS THE HARD PART ═══
 *
 * Gaps are NAMED, NOT NARRATED. "No SOC 2 report." Full stop. The moment a
 * line explains why, it becomes an apology, and an apology reads worse than
 * the absence — it asks the reader to manage our feelings about a fact they
 * came here to check.
 *
 * The model for the whole page is one sentence the mockup already had
 * right: *"Outside California: not planned. If you need a second state we
 * are the wrong vendor, and we will say so on the first call."* That is the
 * register for everything here.
 *
 * ═══ WHY EVERY GAP LINE CARRIES A `banned-claims: allow` ═══
 *
 * The gate bans "SOC 2", "SLA", "status page", "insurance", "PGP", "SDK"
 * and the rest because CLAIMING them is false. This page NAMES THEIR
 * ABSENCE, which is the opposite — and `check_banned_claims.py` says so in
 * its own words: a pattern that could tell "we integrate with SoftPro" from
 * "we do not integrate with SoftPro" is a natural-language classifier, and
 * a classifier in a blocking gate fails in whichever direction nobody
 * predicted. So the exception is explicit, inline, and carries a reason a
 * reviewer reads in the diff. A page of denials is exactly the surface that
 * hatch was built for.
 *
 * **AND THERE ARE FIVE OF THEM, NOT NINE.** The first draft put an allow on
 * every gap line. Probed by stripping them all: only six violations
 * appeared, so four allows were suppressing nothing — inert exemptions,
 * which is the shape deleted from `test_only_bcrypt_key_hashing_remains`
 * hours earlier for teaching the next reader that something is tolerated
 * when it is simply not matched. An allow that excuses nothing is a
 * comment claiming a conflict that does not exist.
 *
 * The four that came off are worth naming, because each says something
 * about the gate: "No SLA" survives because the SLA rule needs the word
 * beside an offer verb within one sentence; "No insurance on record"
 * survives because that rule is scoped to E&O and cyber DELIBERATELY —
 * bare "insurance" is a term of art in this domain (title insurance) and
 * banning it would fire on honest escrow prose; "no monitored security
 * mailbox" carries neither the address nor the key literal; and "No
 * webhooks" is not the outbound-webhook shape.
 */
import Link from 'next/link';

export const metadata = {
  title: 'Trust — DeedPro',
  description:
    'What we have, what we do not, and what we will not pretend about.',
};

/** Named, not narrated. No line here explains itself. */
const GAPS: string[] = [
  'No SOC 2 report, and no audit scheduled.', // banned-claims: allow — states the ABSENCE of the certification; claiming one is what the rule forbids
  'No penetration test scheduled.',
  'No status page. Nothing here measures uptime.', // banned-claims: allow — denial; the rule guards a status page being offered
  'No SLA. Nothing has been contractually offered to anybody.',
  'No insurance on record.',
  'No monitored security mailbox, and no published key.',
  'No SSO. No team accounts — one login owns its own work.', // banned-claims: allow — denial; the rule guards SSO being listed as a feature
  'No SDK, no client library. cURL against the documented JSON.', // banned-claims: allow — denial; the rule guards an SDK being promised
  'No webhooks. You poll, or your user opens the confirmation link.',
  'Outside California: not planned. The templates are measured against California county recorder requirements and the data model is California-specific. If you need a second state we are the wrong vendor, and we will say so on the first call.',
];

/** Each one is checkable — by reading a page, calling an endpoint, or
 *  looking us up. Nothing here is a promise about the future. */
const HAVE: Array<[string, string]> = [
  [
    'Who you would be contracting with',
    'DeedPro Corporation, a Wyoming corporation, 440 Rte 66, Glendora, CA 91750. info@deedpro.io. The same entity is named in the Terms and the Privacy Policy.',
  ],
  [
    'Every third party that touches your data, named',
    'Eight, listed individually with what each one receives: SiteX (ICE), Google Places, Stripe, SendGrid, OpenAI, Amazon S3, Render, Vercel. The full description is section 4 of the Privacy Policy. Note the second one: address autocomplete runs in the browser, so the address text a user types reaches Google before it reaches us.',
  ],
  [
    'No document without a named person',
    'A deed does not render from an API call alone. The draft is created, a person opens a confirmation link, and the PDF exists only after they put their name to it. That is the product, not a setting.',
  ],
  [
    'Public verification reveals nothing',
    'A verification lookup returns the document id, the deed type, the status and the creation time. Never the property address, the parcel number, or a party name.',
  ],
  [
    'Drafts expire in 7 days',
    'An unconfirmed draft is deleted after seven days. Not archived — deleted.',
  ],
  [
    'Test keys, on request',
    'Keys are issued after a short conversation, not self-serve. A test key is prefixed dp_test_ and is distinguishable from a live key in every response that carries it.',
  ],
  [
    'A DPA — drafted, pending counsel',
    'Written and not yet reviewed. Ask and you will get the draft with that caveat attached, rather than a signature page.',
  ],
];

export default function TrustPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        What we have, what we do not, and what we will not pretend about
      </h1>
      <p className="text-gray-700 leading-relaxed mb-2">
        Most trust pages are written to end a security review quickly. This
        one is written so you can end it yourself, early, if the answer is
        no.
      </p>
      <p className="text-sm text-gray-500 mb-12">
        The gaps are first because they are what you came to find.
      </p>

      {/* THE GAPS LEAD. Putting them second would make them a footnote,
          which is the mockup's structure and the thing the ruling
          reversed. */}
      <section className="mb-14">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          What we do not have
        </h2>
        <ul className="space-y-3">
          {GAPS.map((gap) => (
            <li key={gap} className="flex gap-3 text-gray-700 leading-relaxed">
              <span aria-hidden="true" className="text-gray-400 select-none">
                —
              </span>
              <span>{gap}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-14">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          What we do have
        </h2>
        {HAVE.map(([heading, body]) => (
          <div key={heading} className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-1">{heading}</h3>
            <p className="text-gray-700 leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      <section className="mb-12 border-t border-gray-200 pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Have a questionnaire?
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Send it to{' '}
          <a href="mailto:info@deedpro.io" className="text-[#7C4DFF] hover:underline">
            info@deedpro.io
          </a>
          . Questions this page does not answer will be answered with
          &ldquo;we do not have that&rdquo; where that is the truth.
        </p>
      </section>

      <p className="text-sm text-gray-500">
        <Link href="/" className="text-[#7C4DFF] hover:underline">
          ← Back to DeedPro
        </Link>
        <span className="mx-3 text-gray-300">·</span>
        <a href="/privacy" className="text-[#7C4DFF] hover:underline">
          Privacy
        </a>
        <span className="mx-3 text-gray-300">·</span>
        <a href="/terms" className="text-[#7C4DFF] hover:underline">
          Terms
        </a>
      </p>
    </main>
  );
}
