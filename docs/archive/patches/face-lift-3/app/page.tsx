'use client'
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Check, Gauge, Shield, Workflow, ArrowRight, FileDigit, Wand2, Sparkles, Zap, Lock, Map, Clock } from 'lucide-react'

const https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1887&auto=format&fit=crop_URL = 'https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1887&auto=format&fit=crop'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <Header />
      <Hero />
      <StatBar />
      <ApiHello />
      <Features />
      <HowItWorksCreative />
      <VideoSection />
      <Pricing />
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
          <a href="#pricing" className="hover:opacity-80">Pricing</a>
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
        <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1887&auto=format&fit=crop_URL})`}} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white/90 dark:from-neutral-950/70 dark:via-neutral-950/70 dark:to-neutral-950/80" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-30 bg-[#2563EB]" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full blur-3xl opacity-30 bg-[#F26B2B]" />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-32 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.25}}>
          <Badge variant="secondary" className="mb-4 bg-white text-neutral-700 ring-1 ring-black/5">AI‑assisted • Enterprise‑ready</Badge>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
            Create California deeds
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F26B2B]">in minutes.</span>
          </h1>
          <p className="mt-5 text-lg text-neutral-700/90 dark:text-neutral-300 max-w-prose">
            DeedPro combines an AI‑assisted wizard, SmartReview, and integrations built for title workflows—so your team ships clean documents on the first pass.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button size="lg" asChild className="bg-[#2563EB] hover:brightness-95"><a href="/app/wizard">Start a Deed</a></Button>
            <Button size="lg" variant="outline" asChild className="border-neutral-300/80 hover:bg-white"><a href="/demo">See 2‑min demo</a></Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function StatBar() {
  const items = [
    { icon: Zap, label: 'Avg. time to preview', value: '1m 45s' },
    { icon: Lock, label: 'Uptime', value: '99.9%' },
    { icon: Map, label: 'CA counties supported', value: '58' },
    { icon: Clock, label: 'Docs generated', value: '25k+' },
  ]
  return (
    <section className="py-6 bg-white border-y border-neutral-200/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {items.map((it, i) => (
            <div key={i} className="rounded-xl border border-neutral-200/70 p-4">
              <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
                <it.icon className="h-4 w-4 text-[#F26B2B]" /> {it.label}
              </div>
              <div className="mt-1 text-2xl font-semibold">{it.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ApiHello() {
  return (
    <section id="api" className="py-16 bg-[#2563EB]/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Deed creation in one call</h2>
            <p className="mt-3 text-neutral-700/90">Trigger the same trusted flow from your stack with a single endpoint.</p>
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

function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Built for accuracy. Designed for speed.</h2>
          <p className="mt-3 text-neutral-700/90">Your team answers only what matters—DeedPro guides the rest.</p>
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
    { n: 1, t: 'Search', d: 'Enter the address. We prefill from trusted sources.' },
    { n: 2, t: 'Answer', d: 'Grantor, grantee, legal, vesting—guided with examples.' },
    { n: 3, t: 'SmartReview', d: 'Fix issues in a single screen. No bounce‑backs.' },
    { n: 4, t: 'Generate', d: 'Create the deed. Print, e‑record, or export.' },
  ]
  return (
    <section id="how" className="py-20 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white to-[#2563EB]/10" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">From address to deed—no detours</h2>
          <p className="mt-3 text-neutral-700/90">A fast, tactile journey that keeps your team in flow.</p>
        </div>
        <div className="mt-12 relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#2563EB] via-[#F26B2B] to-[#2563EB]/40" />
          <div className="space-y-8">
            {steps.map((s, i) => (
              <div key={s.n} className={`grid md:grid-cols-2 gap-6 items-stretch ${i % 2 ? 'md:text-left' : 'md:text-right'}`}>
                <div className={`${i % 2 ? 'md:order-2' : ''}`}>
                  <Card className="bg-white shadow-soft border-neutral-200/80">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#F26B2B] text-white grid place-items-center font-semibold">{s.n}</div>
                        <div className="font-medium">{s.t}</div>
                      </div>
                      <p className="mt-3 text-sm text-neutral-700/90">{s.d}</p>
                    </CardContent>
                  </Card>
                </div>
                <div className={`hidden md:block ${i % 2 ? 'md:order-1' : ''}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function VideoSection() {
  return (
    <section id="video" className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Watch the 2‑minute demo</h2>
            <p className="mt-3 text-neutral-700/90">See the wizard, SmartReview, and generation flow in action—end‑to‑end.</p>
            <div className="mt-6 flex gap-3">
              <Button asChild className="bg-[#2563EB] hover:brightness-95"><a href="/app/wizard">Start a Deed</a></Button>
              <Button variant="outline" asChild className="border-neutral-300/80"><a href="/demo">Open full demo</a></Button>
            </div>
          </div>
          <div className="relative w-full overflow-hidden rounded-2xl shadow-soft border border-neutral-200">
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
                title="DeedPro Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const tiers = [
    { name: 'Starter', price: '$0', blurb: 'Kick the tires in a sandbox.', cta: 'Try Free', popular: false, bullets: ['Sandbox access', 'Demo templates', 'Email support']},
    { name: 'Team', price: '$149/mo', blurb: 'For busy escrow/title teams.', cta: 'Start Team', popular: true, bullets: ['AI wizard + SmartReview', 'SoftPro & Qualia friendly', 'Role‑based access', 'Priority support']},
    { name: 'Enterprise', price: 'Custom', blurb: 'For large orgs & integrations.', cta: 'Contact Sales', popular: false, bullets: ['SAML/SSO', 'Custom templates', 'Usage‑based pricing', 'White‑glove onboarding']},
  ]
  return (
    <section id="pricing" className="py-20 bg-[#2563EB]/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Simple pricing for serious work</h2>
          <p className="mt-3 text-neutral-700/90">Start free, then pick the plan that fits your team.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <Card key={t.name} className={`bg-white border-neutral-200/80 ${t.popular ? 'ring-2 ring-[#F26B2B]' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{t.name}</div>
                  {t.popular && <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#F26B2B]/10 text-[#F26B2B] border border-[#F26B2B]/20">Most popular</span>}
                </div>
                <div className="mt-3 text-3xl font-extrabold">{t.price}</div>
                <p className="mt-2 text-sm text-neutral-700/90">{t.blurb}</p>
                <ul className="mt-4 space-y-2 text-sm text-neutral-700/90">
                  {t.bullets.map((b,i) => (
                    <li key={i} className="flex gap-2"><Check className="h-4 w-4 text-[#F26B2B]" /> {b}</li>
                  ))}
                </ul>
                <Button className={`mt-6 w-full ${t.popular ? 'bg-[#F26B2B] hover:brightness-95' : 'bg-[#2563EB] hover:brightness-95'}`}>{t.cta}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-xs text-neutral-600">Prices shown are examples; replace with your live pricing.</p>
      </div>
    </section>
  )
}

function CtaCapture() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">See the 2‑minute demo</h3>
        <p className="mt-3 text-neutral-700/90 dark:text-neutral-300">We’ll send a short walkthrough and a sandbox link. No commitment, just clarity.</p>
        <form className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Input type="email" placeholder="you@brokerage.com" className="sm:w-80" />
          <Button type="submit" className="group bg-[#F26B2B] hover:brightness-95">
            Send it <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"/>
          </Button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">No spam. Unsubscribe anytime.</p>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="py-20 border-t border-neutral-200/60 dark:border-neutral-800/60">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">FAQ</h3>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <FaqItem q="Is this only for California?" a="Yes—for now. The data models and recording nuances are CA‑specific." />
          <FaqItem q="Does it work with SoftPro?" a="Yes. We designed the flows to play nicely with SoftPro and similar systems." />
          <FaqItem q="Do you store client PII?" a="We store the minimum needed and follow security‑minded practices. You can bring your own storage keys." />
          <FaqItem q="Can I customize the deed templates?" a="Absolutely. SmartReview shows your changes inline before you generate." />
        </div>
      </div>
    </section>
  )
}

function BigFooter() {
  return (
    <footer className="py-20 bg-neutral-950 text-neutral-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-[#2563EB] to-[#F26B2B]" />
              <span className="font-semibold">DeedPro</span>
            </div>
            <p className="mt-3 text-sm text-neutral-400">Create California deeds in minutes with an AI‑assisted wizard and SmartReview.</p>
            <div className="mt-4 flex gap-3">
              <Button size="sm" asChild className="bg-[#2563EB] hover:brightness-95"><a href="/app/wizard">Start a Deed</a></Button>
              <Button size="sm" variant="outline" asChild className="border-neutral-700 text-neutral-200 hover:bg-neutral-900"><a href="/demo">Watch demo</a></Button>
            </div>
          </div>
          <FooterCol title="Product" links={[
            ['Features', '#features'],
            ['How it Works', '#how'],
            ['Pricing', '#pricing'],
            ['API', '#api'],
          ]} />
          <FooterCol title="Company" links={[
            ['About', '/about'],
            ['Security', '/security'],
            ['Status', '/status'],
            ['Contact', '/contact'],
          ]} />
          <FooterCol title="Resources" links={[
            ['Docs', '/docs'],
            ['Guides', '/guides'],
            ['FAQ', '#faq'],
            ['Changelog', '/changelog'],
          ]} />
        </div>
        <div className="mt-10 border-t border-neutral-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <div>© {new Date().getFullYear()} DeedPro. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a className="hover:underline" href="/privacy">Privacy</a>
            <a className="hover:underline" href="/terms">Terms</a>
            <a className="hover:underline" href="/support">Support</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function Row({ label, value, clamp=false }: { label: string; value: string; clamp?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className={`col-span-2 ${clamp ? 'line-clamp-2' : ''}`}>{value}</span>
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

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-neutral-400">
        {links.map(([label, href]) => (
          <li key={label}><a href={href} className="hover:text-neutral-200">{label}</a></li>
        ))}
      </ul>
    </div>
  )
}
