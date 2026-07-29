'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Zap, Lock, Clock, ArrowRight, Wand2, Sparkles, Shield, X, FileDigit, MapPin } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import StickyNav from "@/components/landing-v2/StickyNav"

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
const CONTACT_SALES_EMAIL = ""

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
                  DeedPro combines an AI‑assisted wizard, SmartReview, and integrations built for title workflows—so
                  your team ships clean documents on the first pass.
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
                    <span className="font-medium">Free 14-day trial</span>
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
                { icon: FileDigit, label: "CA deed types supported", value: "5", color: "text-[#4F76F6]" },
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
        <section id="features" aria-label="Features" className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-20">
              <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-lg font-semibold px-6 py-3 mb-6">
                Core Features
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                Everything you need to create deeds faster
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-loose">
                Built for escrow officers, loved by title companies. Trusted integrations for seamless workflow.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {/* Feature 1: AI-Powered Wizard */}
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

                <h3 className="text-2xl font-bold text-[#1F2B37] mb-4">AI-Powered Wizard</h3>
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
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700 font-medium">All 58 CA Counties</span>
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
                      ✓ Formatting checks surfaced for review
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-[#1F2B37] mb-4">County Formatting Built-in</h3>
                <p className="text-lg text-gray-600 leading-loose">
                  Recorder-formatting checks for California counties — margins, fonts, and the statutory furniture — surfaced for your officer&apos;s review.
                </p>
              </div>

              {/* Feature 3: Instant Integrations */}
              <div className="group text-center">
                <div className="bg-gray-50 rounded-xl p-6 shadow-lg border border-gray-200 mb-6 group-hover:border-[#7C4DFF] transition-all">
                  <div className="bg-white rounded-lg p-4 border border-[#7C4DFF]/20">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 text-xs font-semibold">
                        API
                      </Badge>
                      <Zap className="h-5 w-5 text-[#7C4DFF]" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">SoftPro</span>
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">Qualia</span>
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium">RamQuest</span>
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-[#7C4DFF] font-semibold flex items-center justify-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#7C4DFF] animate-pulse" />
                      <span>Connected</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-[#1F2B37] mb-4">Instant Integrations</h3>
                <p className="text-lg text-gray-600 leading-loose">
                  SoftPro, Qualia, and major title software. Fits your existing workflow seamlessly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. STEPS/WORKFLOW */}
        <section id="steps" aria-label="How it works" className="py-28 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-20">
              <Badge className="bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 text-lg font-semibold px-6 py-3 mb-6">
                Simple Process
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                Three simple steps to perfect deeds
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-loose">
                From input to recording in minutes, not hours.
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

                {/* Step 2: AI Generation */}
                <Card className="relative overflow-hidden border border-gray-200 hover:border-[#4F76F6] hover:shadow-2xl transition-all group bg-white">
                  <CardContent className="p-0">
                    {/* Visual Graphic Area */}
                    <div className="bg-white p-8">
                      <div className="relative bg-gray-50 rounded-xl p-8 shadow-lg border border-gray-200">
                        {/* Deed Document Visual */}
                        <div className="bg-white rounded-lg p-6 border border-gray-300 shadow-sm">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-200">
                            <div className="text-xs font-bold text-gray-500 tracking-wider">GRANT DEED</div>
                            <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-xs">
                              AI Generated
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
                        <h3 className="text-2xl font-bold text-[#1F2B37]">AI Generates</h3>
                      </div>

                      <p className="text-base text-gray-600 leading-relaxed mb-6">
                        AI prepares the document; your officer confirms every field before anything generates.
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
                        <h3 className="text-2xl font-bold text-[#1F2B37]">Review & Record</h3>
                      </div>

                      <p className="text-base text-gray-600 leading-relaxed mb-6">
                        Two-stage checks — substantive completeness and county recorder formatting — surfaced for
                        your officer&apos;s review. One click generates the final, hash-stamped PDF.
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

            <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-3 px-8 py-5 bg-white rounded-full shadow-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#7C4DFF] animate-pulse" />
                  <span className="text-base font-semibold text-gray-700">Average completion time:</span>
                </div>
                <span className="text-2xl font-bold text-[#1F2B37]">5 minutes</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. INTEGRATIONS */}
        <section id="integrations" aria-label="Compatible Software" className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-16">
              <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-lg font-semibold px-6 py-3 mb-6">
                Integrations
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                Works with your existing tools
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-loose">
                Seamless integration with leading title and escrow software.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {["SoftPro", "Qualia", "RamQuest", "ResWare", "Closer's Choice", "ClosingVue", "E-Closing", "SigniX"].map(
                (name) => (
                  <div
                    key={name}
                    className="flex items-center justify-center p-8 rounded-xl border border-dashed border-[#7C4DFF]/60 hover:border-[#4F76F6] hover:bg-[#7C4DFF]/5 transition-colors grayscale hover:grayscale-0 opacity-70 hover:opacity-100"
                  >
                    <div className="text-lg font-bold text-gray-700">{name}</div>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

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

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <table className="w-full">
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
                    { feature: "Error rate", deedpro: "<1%", manual: "15-25%" },
                    { feature: "Recorder formatting checks", deedpro: "Built-in", manual: "Manual tracking" },
                    { feature: "Multi-user collaboration", deedpro: true, manual: false },
                    { feature: "API access", deedpro: true, manual: false },
                    { feature: "SmartReview validation", deedpro: true, manual: false },
                  ].map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="py-5 px-6 text-base font-medium text-gray-700">{row.feature}</td>
                      <td className="py-5 px-6">
                        {row.deedpro === true ? (
                          <Check className="h-6 w-6 text-[#7C4DFF]" />
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
        </section>

        {/* 8. API / INTEGRATIONS SECTION */}
        <section aria-label="API" className="py-28 bg-[#1F2B37]">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-lg font-semibold px-6 py-3">
                    <Zap className="h-4 w-4 mr-2" />
                    API & Integrations
                  </Badge>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                    <div className="relative flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <div className="absolute h-2 w-2 rounded-full bg-green-500 animate-ping" />
                    </div>
                    <span className="text-sm font-semibold text-green-400">API Status: OK</span>
                  </div>
                </div>

                <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-6">
                  One API call.
                  <br />
                  Instant deed generation.
                </h2>

                <p className="text-xl text-gray-300 leading-loose mb-8">
                  Integrate DeedPro into your existing workflow. Works seamlessly with SoftPro, Qualia, and all major
                  title software platforms.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  {/* HM1: real destinations — public docs and the on-page
                      integrations section. */}
                  <Button asChild className="bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white font-bold px-8 py-8">
                    <Link href="/docs">View API Docs</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-bold px-8 py-8 bg-transparent"
                  >
                    <a href="#integrations">Explore Integrations</a>
                  </Button>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-[#7C4DFF] mb-2">REST</div>
                    <div className="text-sm text-gray-400">JSON in, PDF out</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#4F76F6] mb-2">5</div>
                    <div className="text-sm text-gray-400">CA deed types</div>
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

// Response (< 200ms)
{
  "deed_id": "deed_abc123",
  "status": "generated",
  "pdf_url": "https://...",
  "compliance": "verified"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. SECURITY & COMPLIANCE */}
        <section aria-label="Security" className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-20">
              <Badge className="bg-[#4F76F6]/10 text-[#4F76F6] border border-[#4F76F6]/20 text-lg font-semibold px-6 py-3 mb-6">
                <Shield className="h-4 w-4 mr-2" />
                Security & Compliance
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-[#1F2B37] tracking-tight mb-6">
                Enterprise-grade security
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-loose">
                Security you can verify in the product — not badges.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                {
                  icon: Shield,
                  title: "Hash-Stamped PDFs",
                  desc: "Every generated document is fingerprinted (SHA-256) at creation and stored immutably.",
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
        <section id="pricing" aria-label="Pricing" className="py-28 bg-gray-50">
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
              {[
                {
                  name: "Starter",
                  price: "$0",
                  period: "forever",
                  features: ["5 deeds/month", "Email support", "Basic templates", "All deed types"],
                  cta: "Start Free",
                  popular: false,
                },
                {
                  name: "Professional",
                  price: "$149",
                  period: "/month",
                  features: [
                    "Unlimited deeds",
                    "Priority support",
                    "API access",
                    "Custom branding",
                    "SoftPro & Qualia integration",
                  ],
                  cta: "Start 14-day trial",
                  popular: true,
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  period: "",
                  features: [
                    "Volume pricing",
                    "Dedicated support",
                    "SSO/SAML",
                    "SLA guarantee",
                    "White-glove onboarding",
                  ],
                  cta: "Contact Sales",
                  popular: false,
                },
              ].map((tier) => (
                <Card
                  key={tier.name}
                  className={`${
                    tier.popular ? "ring-4 ring-[#7C4DFF] border-[#7C4DFF] shadow-2xl scale-105" : "border-gray-200"
                  } transition-all hover:shadow-xl bg-white`}
                >
                  <CardContent className="p-10">
                    {tier.popular && (
                      <Badge className="bg-[#7C4DFF] text-white font-bold mb-6 px-5 py-2.5 text-base">
                        Most Popular
                      </Badge>
                    )}

                    <h3 className="text-2xl font-bold text-[#1F2B37]">{tier.name}</h3>

                    <div className="mt-6 mb-8">
                      <span className="text-5xl font-bold text-[#1F2B37]">{tier.price}</span>
                      <span className="text-lg text-gray-600">{tier.period}</span>
                    </div>

                    <ul className="space-y-4 mb-10">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-[#7C4DFF] flex-shrink-0 mt-0.5" />
                          <span className="text-base text-gray-700">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* HM1: Start/Trial → /register; Contact Sales is
                        owner-gated (hidden until the address exists). */}
                    {tier.cta === "Contact Sales" ? (
                      CONTACT_SALES_EMAIL ? (
                        <Button
                          asChild
                          className="w-full font-bold text-base py-8 bg-[#1F2B37] hover:bg-[#1F2B37]/90 text-white"
                        >
                          <a href={`mailto:${CONTACT_SALES_EMAIL}`}>{tier.cta}</a>
                        </Button>
                      ) : (
                        <p className="text-center text-sm text-gray-500 py-4">
                          Contact information coming soon
                        </p>
                      )
                    ) : (
                      <Button
                        asChild
                        className={`w-full font-bold text-base py-8 ${
                          tier.popular
                            ? "bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white"
                            : "bg-[#1F2B37] hover:bg-[#1F2B37]/90 text-white"
                        }`}
                      >
                        <Link href="/register">{tier.cta}</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 11. FAQ */}
        <section id="faq" aria-label="FAQ" className="py-28 bg-white">
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
                  q: "Does it work with SoftPro?",
                  a: "Yes. We designed the flows to play nicely with SoftPro and similar systems.",
                },
                {
                  q: "What deed types do you support?",
                  a: "Grant Deed, Quitclaim Deed, Interspousal Transfer, Warranty Deed, and Tax Deed.",
                },
                {
                  q: "How long does generation take?",
                  a: "Once your officer confirms the fields, the PDF renders in seconds — a full deed is typically ~9 clicks end to end.",
                },
                {
                  q: "Can I save partial work?",
                  a: "Yes. All wizard progress auto-saves. You can return anytime to complete.",
                },
                { q: "Is there API access?", a: "Yes. REST API available on Professional and Enterprise plans." },
                {
                  q: "What about security?",
                  a: "Token-based sessions over encrypted transport, and every generated PDF is hash-stamped (SHA-256) and stored immutably. Formal certifications are on the roadmap — we'd rather show you the mechanism than a badge.",
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
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-[#7C4DFF]" />
                  <span className="text-2xl font-bold text-white">DeedPro</span>
                </div>
                <p className="text-base leading-relaxed">
                  Create California deeds in minutes with an AI&#8209;assisted wizard and SmartReview.
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
                    <a href="#integrations" className="hover:text-[#7C4DFF] transition-colors">
                      Integrations
                    </a>
                  </li>
                  <li>
                    <a href="/docs" className="hover:text-[#7C4DFF] transition-colors">
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

            <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
              <div>&copy; 2026 DeedPro. All rights reserved.</div>
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
