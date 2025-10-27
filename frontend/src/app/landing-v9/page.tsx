'use client'
import React from 'react'
import DeedPreview from './DeedPreview'

export default function LandingPage() {
  return (
    <div className="min-h-screen text-neutral-900">
      <Header />
      <Hero />
      <Features />
      <Pricing />
      <Faq />
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md" style={{background: 'linear-gradient(45deg,#2563EB,#F26B2B)'}} />
          <span className="font-semibold tracking-tight">DeedPro</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#features" className="hover:opacity-80">Features</a>
          <a href="#pricing" className="hover:opacity-80">Pricing</a>
          <a href="#faq" className="hover:opacity-80">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href="/login" className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold border border-neutral-300 text-neutral-800">Sign in</a>
          <a href="/app/wizard" className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold bg-[#2563EB] text-white">Get Started</a>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="bg-[#2563EB] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-36 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block mb-4 px-3 py-1 rounded-lg bg-white/10 border border-white/25 text-sm">AI‑assisted • Enterprise‑ready</span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">Create California deeds <span className="block">in minutes.</span></h1>
          <p className="mt-5 text-lg text-white/90 max-w-prose">DeedPro combines an AI‑assisted wizard, SmartReview, and integrations built for title workflows—so your team ships clean documents on the first pass.</p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <a href="/app/wizard" className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold bg-white text-[#2563EB]">Start a Deed</a>
            <a href="/demo" className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold border border-white/40 text-white">See 2‑min demo</a>
          </div>
        </div>
        <div className="rounded-2xl bg-white/12 backdrop-blur border border-white/25 shadow-xl">
          <div className="p-6 pb-0 flex items-center justify-between">
            <div className="font-medium">SmartReview — Grant Deed</div>
            <span className="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/25">Preview</span>
          </div>
          <div className="mt-4 relative">
            <DeedPreview className="w-full h-auto" />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-white/20" />
          </div>
          <div className="p-6 flex gap-3">
            <button className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold border border-white/40 text-white">Edit</button>
            <button className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold bg-[#F26B2B] text-white">Confirm & Create</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  const Feature = ({title, children}: {title: string; children: React.ReactNode}) => (
    <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-6">
      <div className="font-medium">{title}</div>
      <p className="mt-3 text-sm text-neutral-700">{children}</p>
    </div>
  )
  return (
    <section id="features" className="bg-[#F7F9FC] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Built for accuracy. Designed for speed.</h2>
          <p className="mt-3 text-neutral-700">Your team answers only what matters—DeedPro guides the rest.</p>
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

function Pricing() {
  const tiers = [
    { name:'Starter', price:'$0', blurb:'Kick the tires in a sandbox.', cta:'Try Free', accent:false },
    { name:'Team', price:'$149/mo', blurb:'For busy escrow/title teams.', cta:'Start Team', accent:true },
    { name:'Enterprise', price:'Custom', blurb:'For large orgs & integrations.', cta:'Contact Sales', accent:false },
  ]
  return (
    <section id="pricing" className="bg-[#F26B2B] text-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Simple pricing for serious work</h2>
          <p className="mt-3 text-white/90">Start free, then pick the plan that fits your team.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className="rounded-2xl bg-white/12 backdrop-blur border border-white/25 shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{t.name}</div>
                {t.accent && <span className="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/25">Most popular</span>}
              </div>
              <div className="mt-3 text-3xl font-extrabold">{t.price}</div>
              <p className="mt-2 text-sm text-white/90">{t.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                <li>AI wizard + SmartReview</li>
                <li>SoftPro & Qualia friendly</li>
                <li>Role‑based access</li>
                <li>Priority support</li>
              </ul>
              <button className={`inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold w-full mt-6 ${t.accent ? 'bg-white text-[#F26B2B]' : 'bg-white text-[#2563EB]'}`}>{t.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const QA = ({q,a}: any) => (
    <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
      <div className="font-medium">{q}</div>
      <p className="mt-2 text-sm text-neutral-700">{a}</p>
    </div>
  )
  return (
    <section id="faq" className="bg-white py-20 border-t border-neutral-200">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">FAQ</h3>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <QA q="Is this only for California?" a="Yes—for now. The data models and recording nuances are CA‑specific." />
          <QA q="Does it work with SoftPro?" a="Yes. We designed the flows to play nicely with SoftPro and similar systems." />
          <QA q="Do you store client PII?" a="We store the minimum needed and follow security‑minded practices. You can bring your own storage keys." />
          <QA q="Can I customize the deed templates?" a="Absolutely. SmartReview shows your changes inline before you generate." />
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-16" style={{background:'#0b1220', color:'rgba(255,255,255,0.92)'}}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md" style={{background: 'linear-gradient(45deg,#2563EB,#F26B2B)'}} />
              <span className="font-semibold">DeedPro</span>
            </div>
            <p className="mt-3 text-sm" style={{color:'rgba(255,255,255,0.75)'}}>Create California deeds in minutes with an AI‑assisted wizard and SmartReview.</p>
          </div>
          <FooterCol title="Product" links={[
            ['Features', '#features'],
            ['Pricing', '#pricing'],
            ['API', '/docs'],
          ]} />
          <FooterCol title="Company" links={[
            ['About', '/about'],
            ['Security', '/security'],
            ['Status', '/status'],
          ]} />
          <FooterCol title="Resources" links={[
            ['Docs', '/docs'],
            ['FAQ', '#faq'],
            ['Contact', '/contact'],
          ]} />
        </div>
        <div className="mt-10 border-top border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm" style={{color:'rgba(255,255,255,0.7)'}}>
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

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm" style={{color:'rgba(255,255,255,0.75)'}}>
        {links.map(([label, href]) => (
          <li key={label}><a href={href} className="hover:opacity-90">{label}</a></li>
        ))}
      </ul>
    </div>
  )
}
