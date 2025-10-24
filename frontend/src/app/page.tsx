'use client'
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Check, Gauge, Shield, Workflow, ArrowRight, FileDigit, Wand2, Sparkles, Play, Zap, Target, Users } from 'lucide-react'

const HERO_BG_URL = 'https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1887&auto=format&fit=crop'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <Header />
      <Hero />
      <TrustStrip />
      <Features />
      <HowItWorksCreative />
      <VideoSection />
      <Pricing />
      <ApiSection />
      <CtaCapture />
      <Faq />
      <BigFooter />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-950/40 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative h-6 w-6 rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#2563EB] to-[#F26B2B]" />
            <div className="absolute inset-0 rounded-lg ring-1 ring-black/10" />
          </div>
          <span className="font-semibold tracking-tight">DeedPro</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#how" className="hover:opacity-80">How it Works</a>
          <a href="#features" className="hover:opacity-80">Features</a>
          <a href="#video" className="hover:opacity-80">Video</a>
          <a href="#pricing" className="hover:opacity-80">Pricing</a>
          <a href="#api" className="hover:opacity-80">API</a>
          <a href="#faq" className="hover:opacity-80">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hidden sm:inline-flex">Sign in</Button>
          <Button className="group shadow-glow" asChild>
            <a href="/app/wizard" className="inline-flex items-center">
              Get Started <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"/>
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${HERO_BG_URL})`}}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white/90 dark:from-neutral-950/70 dark:via-neutral-950/70 dark:to-neutral-950/80" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-30 bg-[#2563EB]" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full blur-3xl opacity-30 bg-[#F26B2B]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-32 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.25}}>
          <Badge variant="secondary" className="mb-4 bg-white text-neutral-700 ring-1 ring-black/5">
            AI‑assisted • Enterprise‑ready
          </Badge>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
            Create California deeds
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F26B2B]">
              in minutes.
            </span>
          </h1>
          <p className="mt-5 text-lg text-neutral-700/90 dark:text-neutral-300 max-w-prose">
            DeedPro combines an AI‑assisted wizard, SmartReview, and integrations built for title workflows—so your team ships clean documents on the first pass.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button size="lg" asChild className="bg-[#2563EB] hover:brightness-95">
              <a href="/app/wizard">Start a Deed</a>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-neutral-300/80 hover:bg-white">
              <a href="#video">See 2‑min demo</a>
            </Button>
          </div>
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-neutral-600 dark:text-neutral-400">
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#2563EB]" /> SoftPro friendly</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#F26B2B]" /> Qualia sync</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#2563EB]" /> SmartReview checks</li>
          </ul>
        </motion.div>

        {/* SmartReview preview */}
        <motion.div initial={{opacity:0,scale:0.98}} animate={{opacity:1,scale:1}} transition={{duration:0.3,delay:0.05}}>
          <Card className="border border-white/80 shadow-soft rounded-2xl bg-white">
            <div className="h-1 w-full bg-gradient-to-r from-[#2563EB] via-[#2563EB] to-[#F26B2B] rounded-t-2xl" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="font-medium">SmartReview – Grant Deed</div>
                <Badge variant="secondary" className="bg-[#F7F9FC] text-neutral-700 ring-1 ring-black/5">Preview</Badge>
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <Row label="Grantor" value="HERNANDEZ GERARDO J; MENDOZA YESSICA S" />
                <Row label="Grantee" value="John Doe" />
                <Row label="Legal" value="Lot 15, Block 3, Tract No. 12345…" clamp />
                <Row label="Vesting" value="Sole and Separate Property" />
              </div>
              <div className="mt-6 flex gap-2">
                <Button size="sm" variant="outline" className="border-neutral-300/80">Edit</Button>
                <Button size="sm" className="bg-[#F26B2B] hover:brightness-95">Confirm & Create</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

function TrustStrip() {
  return (
    <section className="py-12 border-y border-neutral-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-neutral-600">Trusted by title and escrow teams across California</p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 opacity-90">
          {Array.from({length:6}).map((_,i)=> (
            <div key={i} className="h-10 rounded-lg bg-white" />
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3 text-left">
          <KPI icon={Workflow} title="Built for workflows" desc="SoftPro & Qualia friendly out of the box." />
          <KPI icon={Gauge} title="Fast from day one" desc="Guided steps reduce re‑work and back‑and‑forth." />
          <KPI icon={Shield} title="Security‑minded" desc="Modern patterns and minimal PII by default." />
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Built for accuracy. Designed for speed.</h2>
          <p className="mt-3 text-neutral-700/90 dark:text-neutral-300">Your team answers only what matters—DeedPro guides the rest.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Feature title="AI Wizard">Clean, accessible forms with inline validation. Less friction, fewer do‑overs.</Feature>
          <Feature title="Smart Field Assistance">Real‑time hints and examples for legal descriptions and vesting.</Feature>
          <Feature title="SmartReview">One‑screen summary that catches issues before they cost you time.</Feature>
          <Feature title="SoftPro & Qualia">Fits your existing workflow—no dramatic retooling needed.</Feature>
          <Feature title="Premium UX">Tactile, consistent interactions that make complex work feel simple.</Feature>
          <Feature title="Dark Mode">Looks great in any lighting; easier on the eyes during long days.</Feature>
        </div>
      </div>
    </section>
  )
}

function HowItWorksCreative() {
  const steps = [
    {
      n: 1,
      icon: Target,
      t: 'Search',
      d: 'Type an address. We autofill with trusted sources like SiteX and county records.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      n: 2,
      icon: FileDigit,
      t: 'Answer',
      d: 'Grantor, grantee, legal, vesting—guided and validated at every step.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      n: 3,
      icon: Sparkles,
      t: 'Review',
      d: 'SmartReview highlights anything that needs attention before you generate.',
      color: 'from-orange-500 to-red-500'
    },
    {
      n: 4,
      icon: Zap,
      t: 'Generate',
      d: 'Create the deed. Print, e‑record, or export to your title system.',
      color: 'from-green-500 to-emerald-600'
    },
  ]

  return (
    <section id="how" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">From address to deed in four steps</h2>
          <p className="mt-3 text-neutral-700/90">A workflow that feels natural, not forced.</p>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.n}
                initial={{opacity:0,y:12}}
                whileInView={{opacity:1,y:0}}
                viewport={{once:true}}
                transition={{duration:0.4, delay: s.n * 0.1}}
                className="relative"
              >
                <Card className="bg-white shadow-soft border-neutral-200/80 h-full">
                  <CardContent className="p-6">
                    <div className={`mb-4 h-12 w-12 rounded-xl bg-gradient-to-br ${s.color} grid place-items-center text-white shadow-lg`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-2xl font-bold text-neutral-300">{s.n}</div>
                      <div className="font-semibold text-lg">{s.t}</div>
                    </div>
                    <p className="text-sm text-neutral-700/90">{s.d}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function VideoSection() {
  return (
    <section id="video" className="py-16 sm:py-24 bg-gradient-to-b from-[#F7F9FC] to-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">See DeedPro in action</h2>
          <p className="mt-3 text-neutral-700/90">Watch how easy it is to create a clean, recording‑ready deed in under 2 minutes.</p>
        </div>
        <Card className="shadow-2xl border-neutral-200/80 overflow-hidden">
          <div className="aspect-video bg-neutral-900 relative group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/20 to-[#F26B2B]/20" />
            <div className="absolute inset-0 grid place-items-center">
              <motion.div
                whileHover={{scale:1.1}}
                className="h-20 w-20 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow-2xl"
              >
                <Play className="h-8 w-8 text-[#2563EB] ml-1" />
              </motion.div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
              <div className="text-white font-medium">Modern Wizard Demo</div>
              <div className="text-white/80 text-sm">2:14</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '49',
      period: '/month',
      desc: 'Perfect for solo escrow officers or small teams.',
      features: [
        'Up to 25 deeds/month',
        'All deed types',
        'SmartReview checks',
        'Email support',
        'Basic integrations'
      ],
      cta: 'Start Free Trial',
      highlight: false
    },
    {
      name: 'Professional',
      price: '149',
      period: '/month',
      desc: 'For growing teams that need more volume and support.',
      features: [
        'Up to 100 deeds/month',
        'All deed types',
        'SmartReview checks',
        'Priority support',
        'SoftPro & Qualia sync',
        'API access',
        'Custom templates'
      ],
      cta: 'Start Free Trial',
      highlight: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'For large teams with custom workflows and compliance needs.',
      features: [
        'Unlimited deeds',
        'All features',
        'Dedicated account manager',
        'White-label options',
        'Custom integrations',
        'SLA & uptime guarantee',
        'Training & onboarding'
      ],
      cta: 'Contact Sales',
      highlight: false
    }
  ]

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Simple, transparent pricing</h2>
          <p className="mt-3 text-neutral-700/90">Start free for 14 days. No credit card required.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative shadow-soft ${
                plan.highlight
                  ? 'border-[#2563EB] border-2 shadow-2xl lg:scale-105'
                  : 'border-neutral-200/80'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <Badge className="bg-[#2563EB] text-white px-4 py-1">Most Popular</Badge>
                </div>
              )}
              <CardContent className="p-8">
                <div className="font-semibold text-xl">{plan.name}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-neutral-600">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-neutral-700/90">{plan.desc}</p>
                <Button
                  className={`mt-6 w-full ${
                    plan.highlight
                      ? 'bg-[#2563EB] hover:brightness-95'
                      : 'bg-neutral-900 hover:bg-neutral-800'
                  }`}
                >
                  {plan.cta}
                </Button>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-[#2563EB] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function ApiSection() {
  return (
    <section id="api" className="py-16 sm:py-24 bg-[#F7F9FC]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Prefer to integrate?</h2>
            <p className="mt-3 text-neutral-700/90">DeedPro exposes endpoints for property data lookup and deed creation so you can trigger the same flows from your systems.</p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-700/90">
              <li className="flex gap-2"><FileDigit className="h-4 w-4 text-[#F26B2B]" /> <code>/api/property/search?address=…</code></li>
              <li className="flex gap-2"><Wand2 className="h-4 w-4 text-[#F26B2B]" /> <code>/api/deeds/create</code></li>
              <li className="flex gap-2"><Sparkles className="h-4 w-4 text-[#F26B2B]" /> Webhooks for status & audit</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <Button asChild className="bg-[#F26B2B] hover:brightness-95"><a href="/docs">Read the docs</a></Button>
              <Button variant="outline" asChild className="border-neutral-300/80"><a href="/demo">Explore the API</a></Button>
            </div>
          </div>
          <Card className="shadow-soft border-neutral-200/80 bg-white">
            <CardContent className="p-6">
              <pre className="text-xs md:text-sm overflow-auto rounded-xl bg-[#F7F9FC] p-4 border border-neutral-200">{`curl -X POST https://api.deedpro.app/deeds/create \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{ 
    "grantor": "HERNANDEZ GERARDO J; MENDOZA YESSICA S",
    "grantee": "John Doe",
    "legalDescription": "Lot 15, Block 3, Tract No. 12345",
    "vesting": "Sole and Separate Property"
  }'`}</pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function CtaCapture() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ready to get started?</h3>
        <p className="mt-3 text-neutral-700/90 dark:text-neutral-300">Join teams who are shipping cleaner deeds, faster.</p>
        <form className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Input type="email" placeholder="you@brokerage.com" className="sm:w-80" />
          <Button type="submit" className="group bg-[#F26B2B] hover:brightness-95">
            Get Started <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"/>
          </Button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">14-day free trial. No credit card required.</p>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="py-16 sm:py-24 border-t border-neutral-200/60 dark:border-neutral-800/60 bg-[#F7F9FC]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">FAQ</h3>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <FaqItem q="Is this only for California?" a="Yes—for now. The data models and recording nuances are CA‑specific." />
          <FaqItem q="Does it work with SoftPro?" a="Yes. We designed the flows to play nicely with SoftPro and similar systems." />
          <FaqItem q="Do you store client PII?" a="We store the minimum needed and follow security‑minded practices. You can bring your own storage keys." />
          <FaqItem q="Can I customize the deed templates?" a="Absolutely. SmartReview shows your changes inline before you generate." />
          <FaqItem q="What payment methods do you accept?" a="We accept all major credit cards, ACH, and can invoice for Enterprise plans." />
          <FaqItem q="Is there a setup fee?" a="No setup fees for Starter and Professional plans. Enterprise plans include onboarding." />
        </div>
      </div>
    </section>
  )
}

function BigFooter() {
  return (
    <footer className="py-16 border-t border-neutral-200/80 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#2563EB] to-[#F26B2B]" />
                <div className="absolute inset-0 rounded-lg ring-1 ring-black/10" />
              </div>
              <span className="font-semibold text-lg tracking-tight">DeedPro</span>
            </div>
            <p className="mt-4 text-sm text-neutral-600 max-w-xs">
              California deed creation, simplified. Built for title and escrow teams who ship clean documents.
            </p>
            <div className="mt-6 flex gap-4">
              {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="h-9 w-9 rounded-lg bg-neutral-100 hover:bg-neutral-200 grid place-items-center text-sm text-neutral-600"
                >
                  {social[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="grid gap-8 sm:grid-cols-3 lg:col-span-3">
            <div>
              <div className="font-medium mb-3">Product</div>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li><a href="#features" className="hover:underline">Features</a></li>
                <li><a href="#pricing" className="hover:underline">Pricing</a></li>
                <li><a href="#api" className="hover:underline">API</a></li>
                <li><a href="/demo" className="hover:underline">Demo</a></li>
                <li><a href="/changelog" className="hover:underline">Changelog</a></li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-3">Company</div>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li><a href="/about" className="hover:underline">About</a></li>
                <li><a href="/blog" className="hover:underline">Blog</a></li>
                <li><a href="/careers" className="hover:underline">Careers</a></li>
                <li><a href="/contact" className="hover:underline">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-3">Legal</div>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li><a href="/privacy" className="hover:underline">Privacy</a></li>
                <li><a href="/terms" className="hover:underline">Terms</a></li>
                <li><a href="/security" className="hover:underline">Security</a></li>
                <li><a href="/compliance" className="hover:underline">Compliance</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-600">
          <div>© {new Date().getFullYear()} DeedPro. All rights reserved.</div>
          <div>Built for title teams who like shipping more than waiting.</div>
        </div>
      </div>
    </footer>
  )
}

// Helper components
function Row({ label, value, clamp=false }: { label: string; value: string; clamp?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className={`col-span-2 ${clamp ? 'line-clamp-2' : ''}`}>{value}</span>
    </div>
  )
}

function KPI({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 p-5 flex items-start gap-3 bg-white">
      <div className="h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-tr from-[#2563EB] to-[#F26B2B] text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <p className="text-sm text-neutral-700/90">{desc}</p>
      </div>
    </div>
  )
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-soft border-neutral-200/80 bg-white">
      <CardContent className="p-6">
        <div className="font-medium">{title}</div>
        <p className="mt-3 text-sm text-neutral-700/90">{children}</p>
      </CardContent>
    </Card>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 p-5 bg-white">
      <div className="font-medium">{q}</div>
      <p className="mt-2 text-sm text-neutral-700/90">{a}</p>
    </div>
  )
}
