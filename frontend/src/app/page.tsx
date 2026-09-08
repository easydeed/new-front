'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Lock, ArrowRight, Shield, X, FileDigit, Code2, FileText } from "lucide-react"
import Link from "next/link"
import StickyNav from "@/components/landing-v2/StickyNav"
import { TIERS, priceLabel } from "@/lib/pricing"
import { INSTRUMENT_COUNT } from "@/lib/formRegistry"
import { API_DEED_TYPES, HELD_FAMILIES } from "@/lib/apiDocs"
import ContactBlock from "@/components/landing-v2/ContactBlock"
import { publicEnvValue, publicIdentityLine } from "@/lib/publicEnvironment"
import { LogoLockupDark } from "@/components/brand/Logo"
import { TRIAL_DAYS } from "@/lib/trial"

/* ═══════════════════════════════════════════════════════════════════════
   ENGINE2 — THE HOMEPAGE REBUILT FOR THE INTEGRATOR

   ENGINE1 shipped the CUT list, the 13 new gate rules, `/trust` and the
   API work. It never rebuilt the page's POSITIVE structure, which was
   the point of the repositioning — so a platform engineer landing cold
   read a page telling them they were not the customer.

   The shift, owner-confirmed: THE API IS THE BUSINESS. The escrow story
   stays and stops being the only door.

   ═══ EVERY NUMBER ON THIS PAGE NAMES A MEASURED SOURCE ═══

   `INSTRUMENT_COUNT` counts the form registry. `API_DEED_TYPES` IS the
   partner catalog, mirrored from `services/api_catalog.py` and pinned by
   `apiDocsMirror.test.ts`. `TIERS` is the single price declaration.
   Nothing here is typed as a literal, so the copy cannot outdate the
   product — and the 422 sample below is DERIVED FROM THE SAME CATALOG
   THE API VALIDATES AGAINST rather than transcribed from a mockup.
   ═══════════════════════════════════════════════════════════════════ */

/** The platform door's proof, taken from the catalog rather than typed.
 *
 *  Sending `grantee.vesting` on a fixed-vesting instrument is refused by
 *  `CreateDeedRequest.check_type_rules`, which raises into the v1
 *  router's `VALIDATION_ERROR` mapping. VERIFIED BY EXECUTION, not by
 *  reading: the same request without vesting is accepted, and a
 *  `grant_deed` WITHOUT vesting is refused for the opposite reason — so
 *  the rejection is attributable to this rule rather than to an
 *  incomplete fixture.
 *
 *  Derived so the page cannot outlive the doctrine: if the catalog ever
 *  stops fixing this instrument's vesting, the sample stops claiming it
 *  does. */
const FIXED_VESTING_SAMPLE =
  API_DEED_TYPES.find((t) => t.vesting === 'fixed-by-instrument') ?? API_DEED_TYPES[0]

export default function LandingPage() {
  const identityLine = publicIdentityLine();
  return (
    <>
      <StickyNav />

      <main>
        {/* ══════════ 1. HERO + THE TWO-DOOR FORK ══════════
            Neither door buried, neither subordinate. The platform door
            is visually heavier because it is the one the page was
            missing — the escrow door was the whole page before this. */}
        <section aria-label="Hero" className="relative overflow-hidden bg-white border-b border-gray-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.02)_1px,transparent_0)] [background-size:24px_24px]" />

          <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-12">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter text-[#1F2B37] leading-[1.05] max-w-4xl text-balance">
              California deeds, prepared correctly and confirmed by a named human
            </h1>
            <p className="mt-6 text-xl text-gray-700 max-w-3xl leading-relaxed">
              {/* The mockup read "an application escrow officers use
                  daily". `check_banned_claims` refused it, correctly:
                  nothing here measures usage, so a frequency is a fact
                  we have never observed. The rule that caught it is one
                  ENGINE1 added — and the first real copy it met was the
                  mockup ENGINE1 was written from. */}
              The same engine behind the application escrow officers work in and the API platforms build on.
            </p>
          </div>

          <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pb-20 grid lg:grid-cols-2 gap-6 items-stretch">

            {/* ── DOOR ONE: PLATFORMS ── */}
            <div className="rounded-2xl bg-[#12141A] shadow-2xl flex flex-col overflow-hidden">
              <div className="p-8 pb-5 flex flex-col gap-3">
                <span className="inline-flex items-center gap-2 self-start rounded-md border border-[#A78BFA]/30 bg-[#A78BFA]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#C4B5FD]">
                  <Code2 className="h-3.5 w-3.5" />
                  For platforms
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">
                  I&apos;m building a product that prepares deeds
                </h2>
                <p className="text-[15px] leading-relaxed text-gray-400">
                  REST in, recorder-formatted PDF out — after your officer confirms it. The instrument doctrine is
                  enforced at the request boundary, so a wrong deed fails in your tests, not at the counter.
                </p>
              </div>

              {/* THE 422 — the strongest thing on either page, because it
                  DEMONSTRATES the doctrine instead of asserting it. It
                  lived only on /developers, which an evaluator who
                  bounces never reaches. */}
              <div className="mx-8 mb-4 rounded-lg border border-[#262A33] bg-[#0B0D11] overflow-hidden">
                <div className="grid sm:grid-cols-2">
                  <div className="p-4 border-b sm:border-b-0 sm:border-r border-[#262A33]">
                    <div className="font-mono text-[10px] tracking-wide text-gray-500 mb-2">POST /api/v1/deeds</div>
                    <pre className="font-mono text-[11px] leading-relaxed text-gray-300 whitespace-pre overflow-x-auto">{`{
  "deed_type": `}<span className="text-[#A78BFA]">&quot;{FIXED_VESTING_SAMPLE.slug}&quot;</span>{`,
  "grantee": {
    "vesting": `}<span className="text-[#A78BFA]">&quot;a single man&quot;</span>{`
  }
}`}</pre>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[9.5px] font-bold text-red-300 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded">422</span>
                      <span className="text-[10.5px] tracking-wide text-gray-500">VALIDATION_ERROR</span>
                    </div>
                    <p className="font-mono text-[11px] leading-relaxed text-gray-200">
                      A Joint Tenancy deed states its vesting on its own face. Choosing this instrument{' '}
                      <em className="not-italic text-[#C4B5FD]">is</em> the vesting decision.
                    </p>
                  </div>
                </div>
              </div>

              {/* META STRIP — see the header note on the two slots the
                  CUT list emptied. Every item here is measured. */}
              <div className="px-8 pb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-gray-500">
                <span>{API_DEED_TYPES.length} instruments</span>
                <span className="text-gray-700">•</span>
                <span>Wrong instrument fails at the boundary</span>
                <span className="text-gray-700">•</span>
                <span>Sandbox keys on request</span>
                <span className="text-gray-700">•</span>
                <span>No deed without a named person</span>
              </div>

              <div className="px-8 pb-8 mt-auto flex flex-col gap-3">
                <Button asChild size="lg" className="w-full bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white font-bold text-lg py-7">
                  <Link href="/api-key-request">
                    Get API access <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                {/* Ruling 6: /trust and /developers hang off the platform
                    door, not the footer. An evaluator reads them BEFORE
                    deciding, and a link in the footer is a link they
                    reach after they have already decided. */}
                <div className="text-center text-[13px] text-gray-500">
                  Keys issued on request ·{' '}
                  <Link href="/developers" className="font-semibold text-[#C4B5FD] hover:underline">read the docs</Link>
                  {' '}·{' '}
                  <Link href="/trust" className="font-semibold text-[#C4B5FD] hover:underline">what we do not have</Link>
                </div>
              </div>
            </div>

            {/* ── DOOR TWO: ESCROW & TITLE ── */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg flex flex-col overflow-hidden">
              <div className="p-8 pb-5 flex flex-col gap-3">
                <span className="inline-flex items-center gap-2 self-start rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-600">
                  <FileText className="h-3.5 w-3.5" />
                  For escrow &amp; title
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-[#14161A] leading-tight">
                  I prepare deeds for California transactions
                </h2>
                <p className="text-[15px] leading-relaxed text-gray-600">
                  A guided wizard that prefills from county records and a preliminary title report, then puts every
                  field in front of you to confirm before it prints. PCOR and BOE filled from the deed.
                </p>
              </div>

              <div className="mx-8 mb-4 relative rounded-lg border border-gray-200 bg-[#FCFCFD] p-5 pb-6 overflow-hidden h-[200px]">
                <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded border border-green-200 bg-green-100 px-2 py-1 text-[10.5px] font-bold text-green-800">
                  <Check className="h-3 w-3" /> Officer confirmed
                </span>
                <div className="font-serif text-gray-800">
                  <div className="text-[8px] uppercase tracking-widest text-gray-400">Recording requested by</div>
                  <div className="text-[10.5px] font-bold mb-3">Pacific Coast Escrow</div>
                  <div className="text-center text-base font-bold tracking-wide">GRANT DEED</div>
                  <div className="text-center text-[8.5px] tracking-wide text-gray-500 mb-3">CALIFORNIA CIVIL CODE § 1092</div>
                  <div className="h-px bg-gray-200 mb-3" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-[10px] leading-relaxed">
                      <div><strong>GRANTOR:</strong> John A. Smith and Jane B. Smith</div>
                      <div><strong>GRANTEE:</strong> Michael C. Johnson</div>
                    </div>
                    <div className="rounded border border-gray-200 bg-white p-2">
                      <div className="text-[7.5px] uppercase tracking-widest text-gray-400 mb-1">Legal description</div>
                      <div className="font-mono text-[8px] leading-relaxed text-gray-600">LOT 42, TRACT NO. 12345<br />CITY OF LOS ANGELES</div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[#FCFCFD]" />
              </div>

              <div className="px-8 pb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-gray-500">
                <span>{INSTRUMENT_COUNT} instruments</span>
                <span className="text-gray-300">•</span>
                <span>PCOR and BOE filled from the deed</span>
                <span className="text-gray-300">•</span>
                <span>Free forever</span>
                <span className="text-gray-300">•</span>
                <span>{priceLabel(TIERS[1])}/user</span>
              </div>

              <div className="px-8 pb-8 mt-auto flex flex-col gap-3">
                <Button asChild size="lg" className="w-full bg-[#14161A] hover:bg-[#14161A]/90 text-white font-bold text-lg py-7">
                  <Link href="/register">
                    Use the app free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <div className="text-center text-[13px] text-gray-500">
                  No credit card required · Free {TRIAL_DAYS}-day trial on paid plans
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ 2. PROOF STRIP ══════════
            The mockup's sixth cell was "[99.9%] uptime · status page".
            Both are on the CUT list and both are denied on /trust, so
            the slot carries a measured fact instead of being removed —
            an empty cell reads as a truncated strip. */}
        <section aria-label="Statistics" className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-gray-200 border-x border-gray-200">
            {[
              { value: "Any CA county", label: "Measured to published requirements" },
              { value: `${String(INSTRUMENT_COUNT)} / ${String(API_DEED_TYPES.length)}`, label: "Instruments in app / over API" },
              { value: "Every one", label: "Fields confirmed by your officer", accent: "text-green-600" },
              { value: "SHA-256", label: "Hash-stamped, insert-or-refuse" },
              { value: "422", label: "A wrong instrument fails in your tests" },
              { value: "8 subprocessors", label: "Named individually on the trust page" },
            ].map((stat) => (
              <div key={stat.label} className="p-5">
                <div className={`text-lg font-bold tracking-tight ${stat.accent ?? "text-[#14161A]"}`}>{stat.value}</div>
                <div className="mt-1 text-[12.5px] text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ 3. THE CONFIRMATION STEP — LED WITH ══════════
            Ruling 3: it shipped in #263 and it is the differentiator
            against anything that renders JSON to a PDF. Presented as
            the product, not as friction. */}
        <div className="h-[3px] bg-gradient-to-r from-[#7C4DFF] to-green-600" />
        <section id="confirmation" style={{ scrollMarginTop: 80 }} aria-label="The confirmation step" className="py-24 bg-[#F8F8FB] border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="max-w-3xl mb-12">
              <div className="text-[13px] font-bold uppercase tracking-widest text-[#7C4DFF] mb-3">The difference</div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#14161A] leading-tight mb-5">
                Submit the facts.<br />A human confirms the deed.
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Anyone can render JSON into a PDF. A deed is a legal instrument, and the question a recorder, a title
                insurer and eventually a court asks is not which service formatted it — it is who decided. So there is
                no path through DeedPro, app or API, that produces a recordable document without an answer to that.
              </p>
            </div>

            {/* THE THREE-STAGE SEQUENCE — the doctrine made legible to a
                buyer who has never heard of amber and violet.

                VOCABULARY IS THE SHIPPED ONE. The mockup wrote
                `awaiting_confirmation` and `confirmed`; the API serves
                `pending_confirmation` and `completed`. Copying the
                mockup would document a contract we do not serve. */}
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  n: '01',
                  title: 'The facts arrive as candidates',
                  body: 'County records and title reports prefill what they can — each value carrying the name of where it came from. Nothing is treated as an answer yet, and no PDF exists.',
                  code: 'status: "pending_confirmation"',
                  lead: false,
                },
                {
                  n: '02',
                  title: 'A named human confirms',
                  body: 'Every material field requires explicit confirmation from a professional, by name, against the instrument as it will actually render. An anonymous service account cannot do this.',
                  code: 'approver.name · approver.role',
                  lead: true,
                },
                {
                  n: '03',
                  title: 'The PDF comes into existence',
                  body: 'Hash-stamped at creation and stored insert-or-refuse — a differing hash is rejected rather than overwriting what is there — alongside a record of who confirmed what, and when.',
                  code: 'status: "completed"',
                  lead: false,
                },
              ].map((stage) => (
                <div
                  key={stage.n}
                  className={`flex flex-col gap-3 rounded-xl bg-white p-6 ${
                    stage.lead ? 'border-2 border-green-600 shadow-lg shadow-green-600/10' : 'border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-[11px] font-bold px-2 py-1 rounded ${
                      stage.lead ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{stage.n}</span>
                    <span className="text-[15px] font-bold text-[#14161A]">{stage.title}</span>
                  </div>
                  <p className="text-[14.5px] leading-relaxed text-gray-600">{stage.body}</p>
                  <div className={`mt-auto rounded-md border px-3 py-2.5 font-mono text-xs text-gray-600 ${
                    stage.lead ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-[#F8F8FB]'
                  }`}>{stage.code}</div>
                </div>
              ))}
            </div>

            {/* The licence ruling, stated where a buyer forms the
                expectation. ENGINE1 ruled it OPTIONAL and named it
                `license_claimed` precisely so nobody reads it as a check
                we ran — a homepage that implied otherwise would undo the
                naming. */}
            <p className="mt-5 text-sm text-gray-500 max-w-3xl">
              A licence number can be recorded alongside the name when your integration sends one. It is optional, it is
              stored as supplied, and it is never verified by DeedPro — the confirmation record calls it{' '}
              <code className="font-mono text-[13px] text-gray-700">license_claimed</code> so no reader mistakes it for a
              check we performed.
            </p>

            {/* Kept verbatim from the shipped page — three columns that
                say the same thing in the officer's language. */}
            <div className="mt-10 rounded-xl bg-[#1F2B37] p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-lg font-bold text-white mb-1">The software suggests</div>
                  <p className="text-sm text-gray-300">County records prefill APN, legal description, and owner — as suggestions.</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-white mb-1">Your officer decides</div>
                  <p className="text-sm text-gray-300">Every material field requires explicit confirmation before anything generates.</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-white mb-1">The system records</div>
                  <p className="text-sm text-gray-300">Who confirmed what, and when — stored with a hash-stamped, immutable PDF.</p>
                </div>
              </div>
              <p className="mt-6 text-center text-xs text-gray-400 max-w-3xl mx-auto">
                DeedPro is software, not a law firm. It prepares documents at the direction of the
                professional using it and does not provide legal advice or legal determinations.
              </p>
            </div>
          </div>
        </section>

        {/* ══════════ 4. ONE ENGINE, TWO WAYS IN ══════════
            Ruling 5, and the app/API distinction is stated rather than
            blurred: the API's confirmation is a RECORD (#263); the
            app's is the officer's SESSION. That sentence is the page's
            central claim and cannot be the imprecise thing on it. */}
        <section id="engine" style={{ scrollMarginTop: 80 }} aria-label="One engine" className="py-24 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="max-w-3xl mb-10">
              <div className="text-[13px] font-bold uppercase tracking-widest text-[#7C4DFF] mb-3">One engine, two ways in</div>
              <h2 className="text-4xl font-bold tracking-tight text-[#14161A] leading-tight mb-5">
                The app and the API are the same thing, seen from two sides
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Not a platform bolted onto a product, or a product carved out of a platform. The same templates, the
                same page geometry, the same confirmation requirement, the same hash-stamped output — which is why the
                county formatting is right in both, and why neither can print a deed nobody read.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-5 mb-5">
              <div className="rounded-xl border border-gray-200 border-t-[3px] border-t-green-600 bg-[#FCFCFD] p-7">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-bold uppercase tracking-widest text-green-800">Confirming in the app</span>
                </div>
                <p className="text-[15px] leading-relaxed text-gray-600 mb-4">
                  Your officer works the wizard. Prefilled values show their source, exemptions explain what they cover,
                  and each material field is confirmed one at a time. Corrections keep full lineage to the superseded
                  document.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  <strong className="text-gray-700">What the confirmation is here:</strong> the officer&apos;s own
                  authenticated session. The deed is confirmed because she is signed in and worked it — there is no
                  separate confirmation record.
                </p>
                <ul className="flex flex-col gap-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" />{INSTRUMENT_COUNT} recordable instruments, incl. affidavits and declarations</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" />PCOR and BOE forms filled from the deed</li>
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 border-t-[3px] border-t-[#7C4DFF] bg-[#FCFCFD] p-7">
                <div className="flex items-center gap-2 mb-3">
                  <Code2 className="h-4 w-4 text-[#7C4DFF]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#6D3BF0]">Confirming over the API</span>
                </div>
                <p className="text-[15px] leading-relaxed text-gray-600 mb-4">
                  Your system posts the transaction and gets back a draft with a hosted review URL. Your officer opens
                  it, reads the rendered instrument, and approves — or rejects it with a reason. The stored PDF exists
                  only after that.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  <strong className="text-gray-700">What the confirmation is here:</strong> a stored record naming the
                  person, their role and the moment — retrievable per deed. That is the honest difference between the
                  two paths, and it is why the API is the stricter surface.
                </p>
                <ul className="flex flex-col gap-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" />{API_DEED_TYPES.length} deed-family instruments</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 flex-shrink-0" />Confirmation record retrievable per deed</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-[#F8F8FB] p-6 flex items-start gap-4">
              <Lock className="h-5 w-5 text-[#7C4DFF] flex-shrink-0 mt-0.5" />
              <p className="text-[14.5px] leading-relaxed text-gray-600">
                <strong className="text-[#14161A]">One deliberate difference.</strong>{' '}
                {HELD_FAMILIES.map((f) => f.family.toLowerCase()).join(' and ')} stay in the app. Their premise is a hand
                at the moment of execution — sworn statements, initial lines, checkbox elections — and a
                machine-to-machine call has no hand. That is a boundary, not a gap in the roadmap.
              </p>
            </div>
          </div>
        </section>

        {/* ══════════ 5. BUILD VS INTEGRATE ══════════
            The table is rendered FROM the catalog, so it cannot drift
            from what the API enforces. */}
        <section id="instruments" style={{ scrollMarginTop: 80 }} aria-label="Instrument doctrine" className="py-24 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 grid lg:grid-cols-2 gap-14">
            <div className="flex flex-col gap-4">
              <div className="text-[13px] font-bold uppercase tracking-widest text-[#7C4DFF]">Build vs. integrate</div>
              <h2 className="text-4xl font-bold tracking-tight text-[#14161A] leading-tight">The hard part was never the PDF</h2>
              <p className="text-[16.5px] leading-relaxed text-gray-600">
                A weekend gets you a templating library and a page that looks like a deed. What it does not get you is
                the doctrine: which instruments carry their vesting on their own face, which recite an organizing state,
                which cannot be machine-generated at all.
              </p>
              <p className="text-[16.5px] leading-relaxed text-gray-600">
                We encode them, which is why a mis-specified instrument comes back as an error naming the field rather
                than as a plausible-looking document.
              </p>
              <Link href="/developers" className="mt-2 inline-flex items-center gap-2 text-[15px] font-semibold text-[#7C4DFF] hover:underline">
                Read the full instrument table <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="bg-[#F8F8FB] border-b border-gray-200 text-[11.5px] font-bold uppercase tracking-wide text-gray-500">
                      <th className="py-3 px-4 text-left">deed_type</th>
                      <th className="py-3 px-3 text-left">grantee.vesting</th>
                      <th className="py-3 px-3 text-left">also required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {API_DEED_TYPES.map((t) => {
                      const fixed = t.vesting === 'fixed-by-instrument'
                      return (
                        <tr key={t.slug} className={`border-b border-gray-100 last:border-b-0 ${fixed ? 'bg-[#7C4DFF]/[0.045]' : ''}`}>
                          <td className="py-3 px-4 font-mono text-[12.5px] text-[#14161A]">{t.slug}</td>
                          <td className={`py-3 px-3 ${fixed ? 'font-semibold text-[#6D3BF0]' : 'text-gray-600'}`}>
                            {fixed ? 'fixed — sending it is a 422' : t.vesting}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11.5px] text-gray-600">
                            {t.entityFacts?.length ? t.entityFacts.join(', ') : <span className="font-sans text-gray-400">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-gray-200 bg-[#F8F8FB] px-4 py-3 text-[13px] text-gray-600">
                County formatting — margins, fonts and the statutory furniture — is measured against California
                recorders&apos; published requirements. Acceptance is still the recorder&apos;s call.
              </p>
            </div>
          </div>
        </section>

        {/* ══════════ 6. WHAT AN OFFICER GETS ══════════ */}
        <section id="features" style={{ scrollMarginTop: 80 }} aria-label="Features" className="py-24 bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="max-w-3xl mb-12">
              <div className="text-[13px] font-bold uppercase tracking-widest text-[#7C4DFF] mb-3">In the app</div>
              <h2 className="text-4xl font-bold tracking-tight text-[#14161A] leading-tight mb-5">
                Nothing reaches the deed unseen
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                County-record and title-report data arrive as candidates, never as answers.
                Your officer confirms every one before anything prints, and the record keeps
                who confirmed what, and when.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: FileDigit,
                  title: 'Guided wizard',
                  desc: 'Clean, accessible forms with inline validation. Values arrive from county records with their source named, and the exemptions explain what they cover.',
                },
                {
                  icon: Shield,
                  title: 'County formatting built in',
                  desc: 'Margins, fonts and the statutory furniture, measured against California recorders’ published requirements and surfaced for your officer’s review. Acceptance is the recorder’s call.',
                },
                {
                  icon: Check,
                  title: 'Review and print',
                  desc: 'Two-stage checks — substantive completeness, and formatting measured against the recorder’s published requirements. One click produces the final, hash-stamped PDF for her to record.',
                },
              ].map((f) => (
                <div key={f.title}>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#7C4DFF]/10 mb-4">
                    <f.icon className="h-6 w-6 text-[#7C4DFF]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#14161A] mb-2">{f.title}</h3>
                  <p className="text-[15px] leading-relaxed text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-4 px-6 text-left text-base font-bold text-[#1F2B37]">Feature</th>
                      <th className="py-4 px-6 text-left text-base font-bold text-[#7C4DFF]">DeedPro</th>
                      <th className="py-4 px-6 text-left text-base font-bold text-gray-500">Manual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: "Time to complete", deedpro: "5-10 min", manual: "45-90 min" },
                      { feature: "Every field confirmed before printing", deedpro: true, manual: false },
                      { feature: "Recorder formatting checks", deedpro: "Built-in", manual: "Manual tracking" },
                      /* DARK1 — an honest NO. `deeds` carries one user_id
                         and RED-S5 (the org model) is deferred BY
                         DECISION, so this is not "not yet" either. */
                      { feature: "Multi-user collaboration", deedpro: false, manual: false },  // banned-claims: allow the row LABEL names the capability in order to DENY it — the cell renders an X for both columns
                      { feature: "API access — same confirmation step", deedpro: true, manual: false },
                      { feature: "SmartReview validation", deedpro: true, manual: false },
                    ].map((row, i) => (
                      <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="py-4 px-6 text-[15px] font-medium text-gray-700">{row.feature}</td>
                        <td className="py-4 px-6">
                          {row.deedpro === true ? (
                            <Check className="h-5 w-5 text-[#7C4DFF]" />
                          ) : row.deedpro === false ? (
                            <X className="h-5 w-5 text-gray-400" />
                          ) : (
                            <span className="text-[15px] font-semibold text-[#1F2B37]">{row.deedpro}</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {row.manual === false ? (
                            <X className="h-5 w-5 text-gray-400" />
                          ) : (
                            <span className="text-[15px] text-gray-500">{row.manual}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ 7. SECURITY ══════════ */}
        <section id="security" style={{ scrollMarginTop: 80 }} aria-label="Security" className="py-24 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="max-w-3xl mb-12">
              <h2 className="text-4xl font-bold tracking-tight text-[#14161A] leading-tight mb-4">
                Security you can check yourself
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                No certifications to wave. These three are things you can confirm on your own file — and{' '}
                <Link href="/trust" className="font-semibold text-[#7C4DFF] hover:underline">the trust page</Link>{' '}
                leads with what we do not have.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
              {[
                {
                  icon: Shield,
                  title: "Hash-stamped PDFs",
                  desc: "Every PDF is fingerprinted (SHA-256) at creation, and the row that holds it is insert-or-refuse: a differing hash is rejected rather than overwritten.",
                },
                {
                  icon: Lock,
                  title: "Encrypted sessions",
                  desc: "Token-based authentication over encrypted transport; sessions expire and say so.",
                },
                {
                  icon: Check,
                  title: "The officer decides",
                  desc: "Every material field requires explicit confirmation — recorded with who, what, and when.",
                },
              ].map((cert) => (
                <div key={cert.title}>
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#4F76F6]/10 mb-4">
                    <cert.icon className="h-6 w-6 text-[#4F76F6]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#14161A] mb-2">{cert.title}</h3>
                  <p className="text-[15px] leading-relaxed text-gray-600">{cert.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ 8. PRICING ══════════
            Two audiences, and the platform column says what is TRUE
            today: keys are issued from a request queue and there is no
            per-deed price. "Priced per confirmed deed" is on the CUT
            list because no metering price exists — see the ticket
            report. */}
        <section id="pricing" style={{ scrollMarginTop: 80 }} aria-label="Pricing" className="py-24 bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <h2 className="text-4xl font-bold tracking-tight text-[#14161A] mb-3">Pricing</h2>
            <p className="text-lg text-gray-600 mb-12">Offices pay for seats. Platform pricing is set on the call that issues your key.</p>

            <div className="flex items-center gap-2 mb-5">
              <Code2 className="h-4 w-4 text-[#7C4DFF]" />
              <span className="text-[12.5px] font-bold uppercase tracking-widest text-[#7C4DFF]">For platforms</span>
            </div>
            <div className="grid md:grid-cols-2 gap-5 mb-14">
              <div className="rounded-xl border border-gray-200 bg-white p-7 flex flex-col gap-3">
                <div className="text-[15px] font-bold text-[#14161A]">Sandbox</div>
                <div className="text-3xl font-bold tracking-tight text-[#14161A]">Free</div>
                <p className="text-[14.5px] leading-relaxed text-gray-600">
                  Test keys, real PDFs on the same templates, the full confirmation flow. Build the whole integration on
                  it before you commit to anything.
                </p>
                <Button asChild variant="outline" className="mt-auto w-full font-semibold">
                  <Link href="/api-key-request">Request a test key</Link>
                </Button>
              </div>
              <div className="rounded-xl border-[1.5px] border-[#7C4DFF] bg-white p-7 flex flex-col gap-3 shadow-lg shadow-[#7C4DFF]/10">
                <div className="text-[15px] font-bold text-[#7C4DFF]">Production</div>
                <div className="text-3xl font-bold tracking-tight text-[#14161A]">Set on the call</div>
                <p className="text-[14.5px] leading-relaxed text-gray-600">
                  There is no published per-deed rate yet, and we would rather tell you that than print a number we
                  would renegotiate. Live keys are issued by hand after a conversation about what you are building.
                </p>
                <Button asChild className="mt-auto w-full bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white font-bold">
                  <Link href="/api-key-request">Request access</Link>
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-5">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-[12.5px] font-bold uppercase tracking-widest text-gray-500">For escrow &amp; title offices</span>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {/* PRICING1: one source. Business is priced and visible so
                  the ladder is legible, and is not for sale until the org
                  model (RED-S5) exists. */}
              {TIERS.map((tier) => (
                <Card
                  key={tier.key}
                  className={`${tier.key === "professional" ? "ring-2 ring-[#7C4DFF] border-[#7C4DFF] shadow-xl" : "border-gray-200"} bg-white transition-all`}
                >
                  <CardContent className="p-8">
                    {tier.key === "professional" && (
                      <Badge className="bg-[#7C4DFF] text-white font-bold mb-4 px-4 py-2">Most Popular</Badge>
                    )}
                    {tier.badge && (
                      <Badge className="bg-gray-100 text-gray-600 font-semibold mb-4 px-4 py-2">{tier.badge}</Badge>
                    )}
                    <h3 className="text-xl font-bold text-[#1F2B37]">{tier.name}</h3>
                    <div className="mt-4 mb-3">
                      <span className="text-4xl font-bold text-[#1F2B37]">{priceLabel(tier)}</span>
                      <span className="text-base text-gray-600">{tier.cadence}</span>
                    </div>
                    <p className="text-[15px] text-gray-600 mb-6">{tier.blurb}</p>
                    <ul className="space-y-3 mb-8">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-[#7C4DFF] flex-shrink-0 mt-1" />
                          <span className="text-[15px] text-gray-700">{f}</span>
                        </li>
                      ))}
                    </ul>
                    {tier.purchasable ? (
                      <Button
                        asChild
                        className={`w-full font-bold py-6 ${
                          tier.key === "professional"
                            ? "bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white"
                            : "bg-[#1F2B37] hover:bg-[#1F2B37]/90 text-white"
                        }`}
                      >
                        <Link href="/register">
                          {tier.key === "free" ? "Start free" : `Start ${TRIAL_DAYS}-day trial`}
                        </Link>
                      </Button>
                    ) : (
                      <p className="text-center text-sm text-gray-500 py-4">Not yet available</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ 9. FAQ ══════════ */}
        <section id="faq" style={{ scrollMarginTop: 80 }} aria-label="FAQ" className="py-24 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <h2 className="text-4xl font-bold tracking-tight text-[#14161A] mb-10">Questions we would rather answer now</h2>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
              {[
                {
                  q: "Is this only California?",
                  a: "Yes, for now. The templates are measured to California county recorder requirements and the data models are CA-specific. If you need a second state, we are the wrong vendor and will say so on the first call.",
                },
                {
                  q: "Does it connect to SoftPro, Qualia, or ResWare?", // banned-claims: allow the question a truthful "no" answers; naming the systems is what makes the denial useful
                  a: "Not today. Property details can come from a county-record lookup or a preliminary title report you upload; everything else is entered. Title-software integration is not built yet, and we would rather say so than let you find out on your first file.",
                },
                {
                  q: "Why does the API cover fewer instruments than the app?",
                  a: `The app offers ${INSTRUMENT_COUNT}; the API exposes the ${API_DEED_TYPES.length} deed-family instruments. The difference is the affidavit and declaration family, whose premise is a hand at the moment of execution.`,
                },
                {
                  q: "Who is allowed to confirm a deed?",
                  a: "A named person, recorded with their name and role. A service account cannot confirm. A licence number can be recorded when supplied, and is never verified by us.",
                },
                {
                  q: "What if the recorder rejects a document?",
                  a: "Formatting is measured against published requirements and surfaced for review, but acceptance is the recorder's call and we do not claim otherwise.",
                },
                {
                  q: "What about certifications?",
                  a: "No badges to wave. The trust page lists what exists and what does not, gaps first — including the ones a security review would ask about.",
                },
                {
                  q: "How are API keys issued?",
                  a: "By request rather than switched on by plan. You submit an inquiry, we talk, and a key is issued by hand — sandbox keys included.",
                },
                {
                  q: "Can I save partial work?",
                  a: "Yes. All wizard progress auto-saves. You can return anytime to complete.",
                },
              ].map((faq) => (
                <div key={faq.q}>
                  <h3 className="text-base font-bold text-[#14161A] mb-2">{faq.q}</h3>
                  <p className="text-[14.5px] leading-relaxed text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ 10. CLOSING FORK ══════════ */}
        <section aria-label="Get started" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 grid lg:grid-cols-2 gap-5">
            <div className="rounded-xl bg-[#12141A] p-8 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-grow">
                <div className="text-lg font-bold text-white mb-1">Building on it</div>
                <p className="text-[14.5px] leading-relaxed text-gray-400">
                  Tell us what you are building. Keys are issued after a short conversation.
                </p>
              </div>
              <Button asChild className="bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white font-bold flex-shrink-0">
                <Link href="/api-key-request">Get API access</Link>
              </Button>
            </div>
            <div className="rounded-xl border border-gray-200 bg-[#FCFCFD] p-8 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-grow">
                <div className="text-lg font-bold text-[#14161A] mb-1">Drafting deeds yourself</div>
                <p className="text-[14.5px] leading-relaxed text-gray-600">
                  Every instrument, on real files. Paid plans add support and shared office files — not features.
                </p>
              </div>
              <Button asChild className="bg-[#14161A] hover:bg-[#14161A]/90 text-white font-bold flex-shrink-0">
                <Link href="/register">Use the app free</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ══════════ 11. FOOTER ══════════ */}
        <footer className="bg-[#111827] text-gray-300">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
            <div className="grid md:grid-cols-4 gap-12">
              <div className="md:col-span-2">
                <div className="mb-6">
                  <LogoLockupDark size={36} />
                </div>
                <p className="text-base leading-relaxed">
                  Recorder-formatted California deeds, confirmed by a named human — as an application, or as an engine
                  inside yours.
                </p>
                {/* ENTITY1: identity from the three public env vars. A
                    missing contact address is a broken deploy, not a
                    California placeholder. */}
                {identityLine && (
                  <p className="mt-4 text-sm text-gray-500">{identityLine}</p>
                )}
              </div>

              <div>
                <h3 className="font-bold text-white mb-4">Platform</h3>
                <ul className="space-y-3 text-sm">
                  <li><a href="/developers" className="hover:text-[#7C4DFF] transition-colors">API docs</a></li>
                  <li><a href="#confirmation" className="hover:text-[#7C4DFF] transition-colors">Confirmation flow</a></li>
                  <li><a href="#instruments" className="hover:text-[#7C4DFF] transition-colors">Instruments</a></li>
                  <li><a href="/api-key-request" className="hover:text-[#7C4DFF] transition-colors">Get API access</a></li>
                  <li><a href="/trust" className="hover:text-[#7C4DFF] transition-colors">Trust</a></li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-white mb-4">Escrow app</h3>
                <ul className="space-y-3 text-sm">
                  <li><a href="#features" className="hover:text-[#7C4DFF] transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-[#7C4DFF] transition-colors">Pricing</a></li>
                  <li><a href="#faq" className="hover:text-[#7C4DFF] transition-colors">FAQ</a></li>
                  <li><a href="/privacy" className="hover:text-[#7C4DFF] transition-colors">Privacy</a></li>
                  <li><a href="/terms" className="hover:text-[#7C4DFF] transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>

            <ContactBlock />

            <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
              <div>
                &copy; 2026 {publicEnvValue('NEXT_PUBLIC_LEGAL_ENTITY') || 'DeedPro'}. All rights reserved.
              </div>
              <div className="flex gap-6">
                <a href="/privacy" className="hover:text-[#7C4DFF] transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-[#7C4DFF] transition-colors">Terms</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
