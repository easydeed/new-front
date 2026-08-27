'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Zap, Lock, Clock, ArrowRight, Wand2, Sparkles, Shield, X, FileDigit, MapPin } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import StickyNav from "@/components/landing-v2/StickyNav"
import { TIERS, priceLabel } from "@/lib/pricing"
import { INSTRUMENT_COUNT } from "@/lib/formRegistry"
import { API_DEED_TYPES } from "@/lib/apiDocs"
import ContactBlock from "@/components/landing-v2/ContactBlock"
import { publicEnvValue } from "@/lib/publicEnvironment"
import { LogoLockupDark } from "@/components/brand/Logo"

const AnimatedDeed = dynamic(() => import("@/components/landing-v2/AnimatedDeed"), {
  ssr: false,
  loading: () => (
    <div className="relative rounded-2xl bg-white shadow-2xl border-2 border-gray-200 overflow-hidden animate-pulse">
      <div className="p-8 sm:p-12 h-[600px]" />
    </div>
  ),
})

// HM1: owner supplies the sales address; empty string keeps the button
// hidden — a mailto to nowhere is a dead promise.
// PRICING1: Enterprise is gone, so the Contact Sales path goes with it.
// It was gated on an address that was never set, so it rendered
// "Contact information coming soon" — a tier nobody could buy, above a
// contact route nobody could use.

// TRIAL1's mirror compares this with the server's TRIAL_PERIOD_DAYS.
// It moved to `lib/trial.ts` when the day-one dashboard grew a second
// mention: one number per side means one DECLARATION per side, not one
// per screen.
import { TRIAL_DAYS } from "@/lib/trial"

export default function LandingPage() {
  return (
    <>
      <StickyNav />

      <main>
        {/* 1. HERO SECTION */}
        <section aria-label="Hero" className="relative overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.02)_1px,transparent_0)] [background-size:24px_24px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-28 lg:py-36">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Text */}
              <div>
                <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 text-lg font-semibold px-6 py-3">
                  Built for California Escrow Professionals
                </Badge>

                <h1 className="mt-8 text-7xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-[#1F2B37] leading-[1.05]">
                  Generate Deeds
                  <span className="block mt-3">in Seconds</span>
                </h1>

                <p className="mt-8 text-xl sm:text-xl text-gray-800 max-w-2xl leading-loose">
                  {/* RED-H1.1: "...and integrations built for title
                      workflows" was the same false claim as the removed
                      integrations section, sitting in the first paragraph a
                      visitor reads. */}
                  A guided wizard for California deeds: county records and title reports prefill what they can, your
                  officer confirms every field, and the recorder-formatted PDF is hash-stamped when it prints.
                </p>

                <div className="mt-12 flex flex-col sm:flex-row gap-6">
                  {/* HM1: CTAs are real links, not dead buttons. */}
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white font-bold text-lg px-8 py-8 shadow-xl shadow-[#7C4DFF]/25"
                  >
                    <Link href="/register">
                      Start Creating Deeds <ArrowRight className="ml-2 h-6 w-6" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-12 flex items-center gap-8 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-[#7C4DFF]" />
                    <span className="font-medium">No credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-[#7C4DFF]" />
                    <span className="font-medium">Free {TRIAL_DAYS}-day trial</span>
                  </div>
                </div>
              </div>

              <AnimatedDeed />
            </div>
          </div>

          {/* Scroll sentinel for sticky CTA (at ~33% of page) */}
          <div id="scroll-sentinel" className="h-px" aria-hidden="true" />
        </section>

        {/* 1b. HOW IT ACTUALLY WORKS — the differentiators, near the fold
            (HM2.3): suggest → confirm → record, immutability, and the
            not-legal-advice line are the product, not fine print. */}
        <section aria-label="How DeedPro works" className="py-12 bg-[#1F2B37]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
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
            <p className="mt-8 text-center text-xs text-gray-400 max-w-3xl mx-auto">
              DeedPro is software, not a law firm. It prepares documents at the direction of the
              professional using it and does not provide legal advice or legal determinations.
            </p>
          </div>
        </section>

        {/* 2. STATS BAR */}
        <section aria-label="Statistics" className="py-20 bg-white border-y border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
              {[
                { icon: Clock, label: "Recorder-ready deed", value: "~9 clicks", color: "text-[#7C4DFF]" },
                { icon: Check, label: "Fields confirmed by your officer", value: "Every one", color: "text-[#4F76F6]" },
                { icon: Shield, label: "Hash-stamped, immutable PDFs", value: "SHA-256", color: "text-[#7C4DFF]" },
                /* HOME2 — was 5, while the catalog section three screens down
                   disagreed. Neither number is written here now: both read
                   `INSTRUMENT_COUNT`, which counts the registry the builder
                   offers from, so a new instrument updates the copy instead of
                   silently outdating it. */
                { icon: FileDigit, label: "CA instruments supported", value: String(INSTRUMENT_COUNT), color: "text-[#4F76F6]" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-5xl sm:text-6xl font-bold text-[#1F2B37] mb-3">{stat.value}</div>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <span className="text-base font-semibold">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. FEATURES */}
        <section id="features" style={{ scrollMarginTop: 80 }} aria-label="Features" className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-20">
              <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-lg font-semibold px-6 py-3 mb-6">
                Core Features
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                Everything you need to create deeds faster
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-loose">
                Built for California escrow and title professionals — your officer confirms every field before it prints.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {/* Feature 1: the wizard. DARK1 — was "AI-Powered Wizard".
                  Its own body, unchanged below, describes forms and inline
                  validation, which is what the wizard actually is. */}
              <div className="group text-center">
                <div className="bg-gray-50 rounded-xl p-6 shadow-lg border border-gray-200 mb-6 group-hover:border-[#7C4DFF] transition-all">
                  <div className="bg-white rounded-lg p-4 border border-[#7C4DFF]/20">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 text-xs font-semibold">
                        Wizard
                      </Badge>
                      <Wand2 className="h-5 w-5 text-[#7C4DFF]" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-[#7C4DFF]/20 rounded-full w-full" />
                      <div className="h-2 bg-[#7C4DFF]/40 rounded-full w-3/4" />
                      <div className="h-2 bg-[#7C4DFF] rounded-full w-1/2 animate-pulse" />
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-[#7C4DFF] font-semibold">
                      <Sparkles className="h-3 w-3" />
                      <span>Auto-validating...</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-[#1F2B37] mb-4">Guided Wizard</h3>
                <p className="text-lg text-gray-600 leading-loose">
                  Clean, accessible forms with inline validation. Less friction, fewer do-overs.
                </p>
              </div>

              {/* Feature 2: CA Compliance */}
              <div className="group text-center">
                <div className="bg-gray-50 rounded-xl p-6 shadow-lg border border-gray-200 mb-6 group-hover:border-[#4F76F6] transition-all">
                  <div className="bg-white rounded-lg p-4 border border-[#4F76F6]/20">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-xs font-semibold">
                        Compliance
                      </Badge>
                      <Shield className="h-5 w-5 text-[#4F76F6]" />
                    </div>
                    <div className="space-y-2.5">
                      {/* HOME2 — was "All 58 CA Counties", asserted flat.
                          The jurisdictions registry holds recorder facts for
                          ONE county and city transfer-tax rates for 52 places,
                          and nothing in the product gates on county — so the
                          claim was true in the weakest sense (nothing stops
                          you) and misleading in the sense a title rep reads
                          it (we have done the county-specific work for all
                          58). What replaced it is what T-2 already ruled the
                          product does, and it is the stronger thing to tell a
                          professional: it says what happens at the EDGE. */}
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700 font-medium">Any California county</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700 font-medium">Unknown city rate says so</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700 font-medium">Recording Requirements</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700 font-medium">Format Validation</span>
                      </div>
                    </div>
                    <div className="mt-3 px-2 py-1.5 bg-green-50 rounded text-xs text-green-700 font-semibold">
                      ✓ Measured against published requirements
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-[#1F2B37] mb-4">County Formatting Built-in</h3>
                <p className="text-lg text-gray-600 leading-loose">
                  {/* HOME2 — "county recorder formatting rules" asserted what a
                      recorder ACCEPTS. We measure against what they PUBLISH,
                      which is a different and checkable claim, and it is
                      hedged this way everywhere else in the product. */}
                  Margins, fonts and the statutory furniture, measured against California recorders&apos; published
                  requirements and surfaced for your officer&apos;s review. Acceptance is the recorder&apos;s call.
                </p>
              </div>

              {/* Feature 3 — RED-H1.1 REPLACEMENT. What was here:
                  "Instant Integrations", a card listing SoftPro, Qualia and
                  RamQuest each beside a PULSING GREEN DOT, under the word
                  "Connected".

                  That is not overstated copy — it is a fabricated system
                  state. A green pulse next to a vendor name reads as a live
                  connection, and there is no SoftPro, Qualia or RamQuest
                  client anywhere in this codebase. A visitor could not have
                  told the difference between that card and a real status
                  panel, which is the whole problem with it.

                  Its replacement describes the confirmation record, which
                  ships and is checkable: every field carries its own source
                  and its own confirmation timestamp. COPY PENDING OWNER
                  REVIEW — the claim is true, the wording is mine. */}
              <div className="group text-center">
                <div className="bg-gray-50 rounded-xl p-6 shadow-lg border border-gray-200 mb-6 group-hover:border-[#7C4DFF] transition-all">
                  <div className="bg-white rounded-lg p-4 border border-[#7C4DFF]/20">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 text-xs font-semibold">
                        Record
                      </Badge>
                      <Zap className="h-5 w-5 text-[#7C4DFF]" />
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700 font-medium">Every field shows its source</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700 font-medium">Confirmed one at a time</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700 font-medium">Corrections keep both versions</span>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-[#1F2B37] mb-4">Nothing Reaches the Deed Unseen</h3>
                <p className="text-lg text-gray-600 leading-loose">
                  County-record and title-report data arrive as candidates, never as answers. Your officer confirms each
                  one, and the record keeps who confirmed what, and when.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. STEPS/WORKFLOW */}
        <section id="steps" style={{ scrollMarginTop: 80 }} aria-label="How it works" className="py-28 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-20">
              <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 text-lg font-semibold px-6 py-3 mb-6">
                Simple Process
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                Three simple steps to perfect deeds
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-loose">
                {/* HOME2 — was "From input to recording in minutes". We prepare;
                    we do not record and do not submit. The scope rule. */}
                From an address to a recorder-formatted PDF in minutes, not hours.
              </p>
            </div>

            <div className="relative">
              <div className="hidden lg:block">
                {/* Line from Step 1 to Step 2 - goes down and right */}
                <div className="absolute top-[45%] left-[30%] w-[8%] h-[20%] pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                      d="M 0 0 L 50 50 L 100 100"
                      fill="none"
                      stroke="#7C4DFF"
                      strokeWidth="3"
                      strokeDasharray="8 8"
                      opacity="0.4"
                    />
                  </svg>
                </div>

                {/* Line from Step 2 to Step 3 - goes up and right */}
                <div className="absolute top-[25%] left-[63%] w-[8%] h-[20%] pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                      d="M 0 100 L 50 50 L 100 0"
                      fill="none"
                      stroke="#7C4DFF"
                      strokeWidth="3"
                      strokeDasharray="8 8"
                      opacity="0.4"
                    />
                  </svg>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Step 1: Input Details */}
                <Card className="relative overflow-hidden border border-gray-200 hover:border-[#7C4DFF] hover:shadow-2xl transition-all group bg-white">
                  <CardContent className="p-0">
                    {/* Visual Graphic Area - UI Wizard */}
                    <div className="bg-white p-8">
                      <div className="bg-gray-50 rounded-xl p-6 shadow-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                          <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 text-xs font-semibold">
                            Step 1 of 3
                          </Badge>
                          <MapPin className="h-5 w-5 text-[#7C4DFF]" />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Property Address</label>
                            <div className="h-9 bg-white border border-[#7C4DFF] rounded-lg px-3 flex items-center">
                              <span className="text-sm text-gray-700">123 Main Street</span>
                              <Sparkles className="h-3.5 w-3.5 text-[#7C4DFF] ml-auto animate-pulse" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">City</label>
                              <div className="h-9 bg-white border border-gray-300 rounded-lg px-3 flex items-center">
                                <span className="text-sm text-gray-700">Los Angeles</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">County</label>
                              <div className="h-9 bg-white border border-gray-300 rounded-lg px-3 flex items-center">
                                <span className="text-sm text-gray-700">LA County</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-xs text-green-600">
                              <Check className="h-4 w-4" />
                              <span className="font-semibold">Address verified • APN found</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-8">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center justify-center h-14 w-14 rounded-full border border-dashed border-[#7C4DFF] bg-[#7C4DFF]/10 text-[#7C4DFF] text-xl font-bold">
                          1
                        </div>
                        <h3 className="text-2xl font-bold text-[#1F2B37]">Input Details</h3>
                      </div>

                      <p className="text-base text-gray-600 leading-relaxed mb-6">
                        Enter the property address. DeedPro pulls the APN, legal description, and current owner
                        from county records as suggestions — your officer confirms each one.
                      </p>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4 text-[#7C4DFF]" />
                        <span className="font-medium">~2 minutes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2: prefill and explain. */}
                <Card className="relative overflow-hidden border border-gray-200 hover:border-[#4F76F6] hover:shadow-2xl transition-all group bg-white">
                  <CardContent className="p-0">
                    {/* Visual Graphic Area */}
                    <div className="bg-white p-8">
                      <div className="relative bg-gray-50 rounded-xl p-8 shadow-lg border border-gray-200">
                        {/* Deed Document Visual */}
                        <div className="bg-white rounded-lg p-6 border border-gray-300 shadow-sm">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-200">
                            <div className="text-xs font-bold text-gray-500 tracking-wider">GRANT DEED</div>
                            {/* HOME2 — was "AI Generated", which says the
                                software authored the instrument. Three
                                columns below say it SUGGESTS. The badge on a
                                deed face is the most authorship-shaped place
                                on the page to say it. */}
                            <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-xs">
                              Officer confirmed
                            </Badge>
                          </div>

                          <div className="space-y-3 text-xs text-gray-600">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-[#4F76F6] flex-shrink-0 mt-0.5 animate-pulse" />
                              <div className="flex-1">
                                <div className="font-semibold text-gray-700 mb-1">GRANTOR:</div>
                                <div className="text-gray-600">John A. Smith</div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-[#4F76F6] flex-shrink-0 mt-0.5 animate-pulse" />
                              <div className="flex-1">
                                <div className="font-semibold text-gray-700 mb-1">GRANTEE:</div>
                                <div className="text-gray-600">Jane B. Doe</div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-[#4F76F6] flex-shrink-0 mt-0.5 animate-pulse" />
                              <div className="flex-1">
                                <div className="font-semibold text-gray-700 mb-1">LEGAL DESCRIPTION:</div>
                                <div className="text-gray-600">LOT 42, TRACT 5432, LOS ANGELES COUNTY...</div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-xs text-gray-500">APN: 5432-001-042</div>
                            <div className="flex gap-1">
                              <Sparkles className="h-3 w-3 text-[#4F76F6] animate-pulse" />
                              <Sparkles className="h-3 w-3 text-[#7C4DFF] animate-pulse delay-75" />
                              <Sparkles className="h-3 w-3 text-[#4F76F6] animate-pulse delay-150" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-8">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center justify-center h-14 w-14 rounded-full border border-dashed border-[#4F76F6] bg-[#4F76F6]/10 text-[#4F76F6] text-xl font-bold">
                          2
                        </div>
                        {/* HOME2 — was "AI Generates", corrected to "AI Suggests"
                            because the step's own sentence beneath it already said
                            the officer confirms every field, so the heading
                            contradicted its body.

                            DARK1 — the rest of that correction. HOME2 fixed WHO
                            DECIDES and kept the capability word. The word is the
                            part that is false: the values on this step come from
                            county records via `dttSuggestions.ts` and
                            `vestingSuggestion.ts`, both deterministic pattern
                            matches — "No LLM involved", as the former has said in
                            its own header since ticket TT. After GUIDE1 there is
                            no model anywhere a user can reach. */}
                        <h3 className="text-2xl font-bold text-[#1F2B37]">Prefill &amp; Explain</h3>
                      </div>

                      <p className="text-base text-gray-600 leading-relaxed mb-6">
                        Values arrive from county records with their source named, and the exemptions explain what they cover; your officer confirms every one before anything prints.
                      </p>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4 text-[#4F76F6]" />
                        <span className="font-medium">~1 minute</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Review & Finalize */}
                <Card className="relative overflow-hidden border border-gray-200 hover:border-[#7C4DFF] hover:shadow-2xl transition-all group bg-white">
                  <CardContent className="p-0">
                    {/* Visual Graphic Area */}
                    <div className="bg-white p-8">
                      <div className="bg-gray-50 rounded-xl p-6 shadow-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 font-semibold">
                            SmartReview
                          </Badge>
                          <Badge className="bg-green-100 text-green-700 border border-green-200 font-semibold">
                            ✓ Ready
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-semibold text-green-900">Legal description confirmed</div>
                              <div className="text-green-700 text-xs">By your officer, against county records</div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-semibold text-green-900">Formatting checks passed</div>
                              <div className="text-green-700 text-xs">County recorder formatting rules</div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-semibold text-green-900">Ready to generate</div>
                              <div className="text-green-700 text-xs">Every confirmation recorded</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-8">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center justify-center h-14 w-14 rounded-full border border-dashed border-[#7C4DFF] bg-[#7C4DFF]/10 text-[#7C4DFF] text-xl font-bold">
                          3
                        </div>
                        {/* HOME2 — was "Review & Record". We prepare; the officer records.
                            Naming an act we do not perform is the scope rule's
                            plainest violation. */}
                        <h3 className="text-2xl font-bold text-[#1F2B37]">Review &amp; Print</h3>
                      </div>

                      <p className="text-base text-gray-600 leading-relaxed mb-6">
                        Two-stage checks — substantive completeness, and formatting measured against the
                        recorder&apos;s published requirements — surfaced for your officer&apos;s review. One click
                        produces the final, hash-stamped PDF for her to record.
                      </p>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4 text-[#7C4DFF]" />
                        <span className="font-medium">~2 minutes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* HOME2 — an "Average completion time: 5 minutes" badge sat
                here, contradicting the comparison table's "5-10 min" three
                sections up and carrying a stronger word than either can
                support: an AVERAGE is a measurement, and nothing measures
                one. Deleted rather than hedged — the table already makes
                the estimate, once, as an estimate. */}
          </div>
        </section>

        {/* 6. INTEGRATIONS — REMOVED, RED-H1.1.

            This section was headed "Works with your existing tools /
            Seamless integration with leading title and escrow software"
            over a grid of EIGHT named products: SoftPro, Qualia, RamQuest,
            ResWare, Closer's Choice, ClosingVue, E-Closing, SigniX.

            Not one of them is integrated. There is no client, no webhook
            handler, no field mapping, no stub, for any of the eight. The
            section was removed rather than reworded, because there is no
            true version of it to write — a heading over an empty grid
            still promises what the heading says.

            The two in-page links that pointed here now point at #api,
            which describes something that exists. If integrations get
            built, this section comes back with the products that are
            actually wired, and no others. */}

        {/* 7. COMPARISON TABLE */}
        <section aria-label="Comparison" className="py-28 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-16">
              <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 text-lg font-semibold px-6 py-3 mb-6">
                Comparison
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                DeedPro vs. Manual Process
              </h2>
            </div>

            {/* HOME2 ROUGH — the table is ~926px of content inside
                `overflow-hidden`, so on a narrow viewport the third column
                was CLIPPED with no way to reach it: not a squeeze, a
                silent truncation of the "Manual" column the comparison
                exists to make.

                `overflow-x-auto` on an inner wrapper keeps the rounded
                corners on the card while letting the table scroll inside
                it. The card keeps `overflow-hidden` for its radius; the
                scrolling happens one level in, which is the arrangement
                that satisfies both. */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-6 px-6 text-left text-lg font-bold text-[#1F2B37]">Feature</th>
                    <th className="py-6 px-6 text-left text-lg font-bold text-[#7C4DFF]">DeedPro</th>
                    <th className="py-6 px-6 text-left text-lg font-bold text-gray-500">Manual</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Time to complete", deedpro: "5-10 min", manual: "45-90 min" },
                    { feature: "Every field confirmed before printing", deedpro: true, manual: false },
                    /* HOME2 — an "<1% vs 15-25%" error-rate comparison was here with
                       nothing behind either number. Deleted rather than
                       hedged: there is no measurement to soften. */
                    { feature: "Recorder formatting checks", deedpro: "Built-in", manual: "Manual tracking" },
                    /* DARK1 — this was a CHECKMARK. `deeds` carries one
                       user_id, every query is scoped to it, and partners are
                       `user-{id}` scoped, so a second officer in the same
                       office sees none of her colleague's rolodex. RED-S5
                       (the org model) is deferred BY DECISION, so this is not
                       "not yet" either — a soft promise is the same claim
                       with a delay attached.

                       A checkmark on a comparison table is a capability claim
                       aimed at somebody choosing between products, which is
                       the most consequential place to be wrong: a two-person
                       shop discovers it in week one. */
                    { feature: "Multi-user collaboration", deedpro: false, manual: false },  // banned-claims: allow the row LABEL names the capability in order to DENY it — the cell renders an X for both columns
                    { feature: "API access — same confirmation step", deedpro: true, manual: false },
                    { feature: "SmartReview validation", deedpro: true, manual: false },
                  ].map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="py-5 px-6 text-base font-medium text-gray-700">{row.feature}</td>
                      <td className="py-5 px-6">
                        {row.deedpro === true ? (
                          <Check className="h-6 w-6 text-[#7C4DFF]" />
                        ) : row.deedpro === false ? (
                          /* An honest NO, rendered as legibly as a yes.
                             `false` used to fall through to `{row.deedpro}`,
                             which React renders as NOTHING — an empty cell
                             reads as a layout bug, and a claim we removed
                             should read as an answer. */
                          <X className="h-6 w-6 text-gray-400" />
                        ) : (
                          <span className="text-base font-semibold text-[#1F2B37]">{row.deedpro}</span>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        {row.manual === false ? (
                          <X className="h-6 w-6 text-gray-400" />
                        ) : (
                          <span className="text-base text-gray-500">{row.manual}</span>
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

        {/* 8. API SECTION — carries id="api" since RED-H1.1, because the
            two in-page "Explore Integrations" links used to target the
            removed #integrations section and would otherwise scroll
            nowhere. */}
        <section id="api" style={{ scrollMarginTop: 80 }} aria-label="API" className="py-28 bg-[#1F2B37]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-lg font-semibold px-6 py-3">
                    <Zap className="h-4 w-4 mr-2" />
                    Deed API
                  </Badge>
                  {/* RED-H1.1: a pulsing green "API Status: OK" pill lived
                      here. It was hardcoded — no health check, no fetch,
                      nothing behind it. It would have rendered "OK" during
                      a total outage, which is the one moment a status
                      indicator exists for. A status light that cannot go
                      red is not a status light. */}
                </div>

                <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
                  {/* API-CONFIRM — Model 2 is built. POST returns a draft
                      and a confirmation URL. A named human sees the
                      rendered deed and approves it. The stored PDF exists
                      only after that. */}
                  Submit the facts.
                  <br />
                  A human confirms the deed.
                </h2>

                <p className="text-xl text-gray-300 leading-loose mb-8">
                  POST the transaction from your system. The API returns a draft and a
                  confirmation URL — not a stored PDF. A person you name opens the
                  rendered document, sees it as it will print, and approves or sends
                  it back. Incomplete facts are refused at submission. Keys are issued
                  after a conversation.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  {/* The "View API Docs" button was removed here per the
                      footer-only placement ruling: while API keys are
                      issued manually, a prominent link into docs you
                      cannot self-serve a key from is a dead-end funnel.
                      /developers stays reachable from the footer, where
                      the engineers who go looking will find it. The
                      integrations prose above is unchanged. */}
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-bold px-8 py-8 bg-transparent"
                  >
                    <a href="#api">Explore the API</a>
                  </Button>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-[#7C4DFF] mb-2">REST</div>
                    <div className="text-sm text-gray-400">JSON in, PDF out</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#4F76F6] mb-2">{API_DEED_TYPES.length}</div>
                    <div className="text-sm text-gray-400">CA deed instruments via API</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-[#0F172A] backdrop-blur-sm border border-white/10 rounded-2xl p-8 overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <Badge className="bg-[#7C4DFF]/20 text-[#7C4DFF] border border-[#7C4DFF]/30 font-semibold">
                      API Example
                    </Badge>
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                  </div>

                  <pre className="text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">
                    {`POST /api/v1/deeds/generate
Content-Type: application/json

{
  "type": "grant_deed",
  "grantor": {
    "name": "John A. Smith",
    "address": "123 Main St"
  },
  "grantee": {
    "name": "Jane B. Doe",
    "address": "456 Oak Ave"
  },
  "property": {
    "apn": "5432-001-042",
    "county": "Los Angeles"
  }
}

// Response
{
  "deed_id": "deed_abc123",
  "status": "active",
  "urls": {
    "pdf": "https://...",
    "verification": "https://..."
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. SECURITY & COMPLIANCE */}
        {/* HOME2 — this section had no id, so it was unreachable by nav and
            was where a short scroll from "Pricing" came to rest. */}
        <section id="security" style={{ scrollMarginTop: 80 }} aria-label="Security" className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-20">
              <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-lg font-semibold px-6 py-3 mb-6">
                <Shield className="h-4 w-4 mr-2" />
                Security & Compliance
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                Security you can check yourself
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-loose">
                {/* PRICING1: the heading here read "Enterprise-grade
                    security" directly above a line promising no badges —
                    the same unmeasured marketing phrase the claims gate
                    already bans as "bank-level" and "military-grade". The
                    three items below are all verifiable in the product,
                    which is what the section was for. */}
                No certifications to wave. These three are things you can
                confirm on your own file.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                {
                  icon: Shield,
                  title: "Hash-Stamped PDFs",
                  desc: "Every PDF is fingerprinted (SHA-256) at creation, and the row that holds it is insert-or-refuse: a differing hash is rejected rather than overwritten.",
                },
                {
                  icon: Lock,
                  title: "Encrypted Sessions",
                  desc: "Token-based authentication over encrypted transport; sessions expire and say so.",
                },
                {
                  icon: Check,
                  title: "The Officer Decides",
                  desc: "Every material field requires explicit confirmation — recorded with who, what, and when.",
                },
              ].map((cert) => (
                <div key={cert.title} className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#4F76F6]/10 mb-6">
                    <cert.icon className="h-10 w-10 text-[#4F76F6]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#1F2B37] mb-4">{cert.title}</h3>
                  <p className="text-lg text-gray-600 leading-loose">{cert.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10. PRICING */}
        <section id="pricing" style={{ scrollMarginTop: 80 }} aria-label="Pricing" className="py-28 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-20">
              <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 text-lg font-semibold px-6 py-3 mb-6">
                Pricing
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                Simple pricing for every team
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-loose">
                Start free, scale as you grow. No hidden fees, cancel anytime.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* PRICING1: one source. This array used to hold its own
                  prices — Professional at $149 while the billing tab said
                  $29 for the same plan. */}
              {TIERS.map((tier) => (
                <Card
                  key={tier.key}
                  className={`${
                    tier.key === "professional"
                      ? "ring-4 ring-[#7C4DFF] border-[#7C4DFF] shadow-2xl scale-105"
                      : "border-gray-200"
                  } transition-all hover:shadow-xl bg-white`}
                >
                  <CardContent className="p-10">
                    {tier.key === "professional" && (
                      <Badge className="bg-[#7C4DFF] text-white font-bold mb-6 px-5 py-2.5 text-base">
                        Most Popular
                      </Badge>
                    )}
                    {tier.badge && (
                      <Badge className="bg-gray-100 text-gray-600 font-semibold mb-6 px-5 py-2.5 text-base">
                        {tier.badge}
                      </Badge>
                    )}

                    <h3 className="text-2xl font-bold text-[#1F2B37]">{tier.name}</h3>

                    <div className="mt-6 mb-3">
                      <span className="text-5xl font-bold text-[#1F2B37]">{priceLabel(tier)}</span>
                      <span className="text-lg text-gray-600">{tier.cadence}</span>
                    </div>
                    <p className="text-base text-gray-600 mb-8">{tier.blurb}</p>

                    <ul className="space-y-4 mb-10">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-[#7C4DFF] flex-shrink-0 mt-0.5" />
                          <span className="text-base text-gray-700">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* PRICING1: a tier we cannot deliver gets no buy
                        control. Business is priced and visible so the
                        ladder is legible, and it is not for sale until
                        the org model (RED-S5) exists. */}
                    {tier.purchasable ? (
                      <Button
                        asChild
                        className={`w-full font-bold text-base py-8 ${
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
                      <p className="text-center text-sm text-gray-500 py-4">
                        Not yet available
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 11. FAQ */}
        <section id="faq" style={{ scrollMarginTop: 80 }} aria-label="FAQ" className="py-28 bg-white">
          <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-16">
              <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-lg font-semibold px-6 py-3 mb-6">
                FAQ
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                Frequently asked questions
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  q: "Is this only for California?",
                  a: "Yes—for now. The data models and recording nuances are CA‑specific.",
                },
                {
                  // RED-H1.1. This answer used to be "Yes. We designed the
                  // flows to play nicely with SoftPro and similar systems."
                  // There is no SoftPro integration in this codebase — no
                  // client, no webhook, no stub. The question is one people
                  // genuinely ask, so it stays; a truthful "no" is the only
                  // copy here that cannot overclaim.
                  q: "Does it connect to SoftPro, Qualia, or ResWare?", // banned-claims: allow the question a truthful "no" answers; naming the systems is what makes the denial useful
                  a: "Not today. Property details can come from a county-record lookup or a preliminary title report you upload; everything else is entered here. Title-software integration is not built yet, and we would rather say so than let you find out on your first file.",
                },
                {
                  q: "What deed types do you support?",
                  a: `The app offers ${INSTRUMENT_COUNT} California instruments. The partner API exposes ${API_DEED_TYPES.length} deed-family instruments; its developer docs list every accepted deed_type.`,
                },
                {
                  q: "How long does generation take?",
                  a: "Once your officer confirms the fields, the PDF renders in seconds — a full deed is typically ~9 clicks end to end.",
                },
                {
                  q: "Can I save partial work?",
                  a: "Yes. All wizard progress auto-saves. You can return anytime to complete.",
                },
                {
                  q: "Is there API access?",
                  // PRICING1: this said "Professional and Enterprise
                  // plans". Enterprise is gone, and API keys are issued
                  // by hand from a request queue regardless of plan
                  // (A3) — so "available on plan X" was never how it
                  // worked.
                  a: "There is a REST API for creating deeds. Keys are issued by request rather than switched on by plan — see the developer docs.",
                },
                {
                  q: "What about security?",
                  a: "Token-based sessions over encrypted transport. Every PDF is hash-stamped (SHA-256) at creation, and storing one is insert-or-refuse — a differing hash for the same document is rejected rather than overwriting what is there. Formal certifications are on the roadmap; we would rather show you the mechanism than a badge.",
                },
              ].map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-xl border border-gray-200 p-8 bg-white hover:border-[#4F76F6] transition-colors"
                >
                  <h3 className="text-lg font-bold text-[#1F2B37] mb-3">{faq.q}</h3>
                  <p className="text-base text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 12. FOOTER — HM1: short and honest beats long and broken.
            Every link resolves; the 404 set (/api /integrations /about
            /blog /careers /contact /cookies) and the internal /security
            page are gone. Legal links point at the HM3 scaffolds. */}
        <footer className="bg-[#111827] text-gray-300">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
            <div className="grid md:grid-cols-4 gap-12">
              <div className="md:col-span-2">
                <div className="mb-6">
                  <LogoLockupDark size={36} />
                </div>
                <p className="text-base leading-relaxed">
                  Create California deeds in minutes with a guided wizard and SmartReview.
                </p>
                {/* HM3: company identity block — owner supplies entity details. */}
                <p className="mt-4 text-sm text-gray-500">
                  DeedPro &middot; California, USA
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white mb-4">Product</h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a href="#features" className="hover:text-[#7C4DFF] transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-[#7C4DFF] transition-colors">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="#api" className="hover:text-[#7C4DFF] transition-colors">
                      API
                    </a>
                  </li>
                  <li>
                    <a href="/developers" className="hover:text-[#7C4DFF] transition-colors">
                      API Docs
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-white mb-4">Legal</h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a href="/privacy" className="hover:text-[#7C4DFF] transition-colors">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a href="/terms" className="hover:text-[#7C4DFF] transition-colors">
                      Terms
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* ═══ HOME2 item 5 — CONTACT AND IDENTITY ═══

                There was no email, no phone and no form anywhere on this
                page, and the footer read "DeedPro · California, USA" with
                no legal entity. A title company's counsel expects both
                before anyone attaches their name to a stranger's tool.

                BOTH COME FROM THE ENVIRONMENT AND NEITHER IS INVENTED.
                The entity name and the contact address are the owner's to
                supply — a legal entity guessed at is worse than one
                absent, because an absent one is obviously missing and a
                wrong one looks answered.

                WHAT HOME2 GOT WRONG, AND THE OWNER OVERTURNED: the block
                rendered NOTHING when unset, on an "absence is neutral"
                reading. That rule governs data; a missing contact address
                is a broken deploy. `ContactBlock` now shows the gap
                outside production and the boot check reports it inside —
                see its header.

                `homepageTruth.test.ts` pins that no entity string is
                hard-coded here. */}
            <ContactBlock />

            <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
              <div>
                {/* Reads through the manifest, not `process.env` directly:
                    the literal reads live in one place because Next only
                    substitutes literal member accesses (see
                    `lib/publicEnvironment.ts`). The 'DeedPro' fallback is
                    a BRAND standing in for an ENTITY — which is why the
                    variable is REQUIRED and its absence is reported. */}
                &copy; 2026 {publicEnvValue('NEXT_PUBLIC_LEGAL_ENTITY') || 'DeedPro'}. All rights reserved.
              </div>
              <div className="flex gap-6">
                <a href="/privacy" className="hover:text-[#7C4DFF] transition-colors">
                  Privacy
                </a>
                <a href="/terms" className="hover:text-[#7C4DFF] transition-colors">
                  Terms
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
