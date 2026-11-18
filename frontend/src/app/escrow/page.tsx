'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LogoLockup } from '@/components/brand/Logo'
import { SampleDeed } from '@/components/marketing/SampleDeed'
import { mktFontVars } from '@/components/marketing/marketingFonts'
import { INSTRUMENT_COUNT, FORM_REGISTRY } from '@/lib/formRegistry'
import { canGenerate } from '@/lib/instrumentAvailability'
import { TIERS, priceLabel } from '@/lib/pricing'
import { TRIAL_DAYS } from '@/lib/trial'
import { publicIdentityLine } from '@/lib/publicEnvironment'
import '@/components/marketing/marketing.css'

/**
 * Escrow desks landing page. Same header and sample deed as the
 * platforms page. Minutes-per-deed figures from the handoff are not
 * printed: they are listed there as unverified.
 */

const FIELDS = [
  { key: 'apn', label: 'APN', val: '5432-001-012', kind: 'amber' as const },
  { key: 'legal', label: 'Legal description', val: 'LOT 15, BLOCK 3, TRACT 12345', kind: 'amber' as const },
  { key: 'grantor', label: 'Owner of record', val: 'John A. Doe and Jane B. Doe', kind: 'amber' as const },
  { key: 'tax', label: 'Transfer tax', val: 'Documentary transfer tax, full value, City of Los Angeles', kind: 'violet' as const },
  { key: 'vesting', label: 'Vesting', val: 'a single man', kind: 'violet' as const },
]

const MENU: Array<[string, string]> = [
  ['#output', 'Sample deed'],
  ['#file', 'How a file runs'],
  ['#documents', 'Documents'],
  ['#app', 'Time saved'],
  ['#answers', 'Questions'],
  ['#pricing', 'Pricing'],
]

const STEPS = [
  { title: 'County records fill the file', body: 'APN, owner and legal description arrive marked as unconfirmed. They are candidates, not decisions.' },
  { title: 'You decide vesting and tax', body: 'Those are not on the county record. The deed waits until you accept them.' },
  { title: 'You check the page', body: 'Margins and the return block are shown before anything prints. Acceptance stays with the recorder.' },
  { title: 'You print the packet', body: 'Grant deed, acknowledgment, PCOR and BOE. The record says who confirmed each field.' },
]

const DOCUMENTS = Object.values(FORM_REGISTRY).filter((form) => canGenerate(form.slug))

export default function EscrowLandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const identityLine = publicIdentityLine()
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [printed, setPrinted] = useState(false)
  const [active, setActive] = useState('')
  const [step, setStep] = useState(0)
  const [rulers, setRulers] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const allConfirmed = FIELDS.every((field) => confirmed[field.key])

  useEffect(() => {
    const nav = navRef.current
    const root = rootRef.current
    if (!nav || !root) return
    const measure = () => {
      const h = nav.offsetHeight
      if (h) root.style.setProperty('--navh', `${h}px`)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(nav)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const ids = MENU.filter(([href]) => href.startsWith('#')).map(([href]) => href.slice(1))
    const onScroll = () => {
      const navH = navRef.current?.offsetHeight ?? 120
      let cur = ''
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= navH + 60) cur = `#${id}`
      }
      setActive(cur)
      const steps = document.querySelectorAll('[data-step]')
      const mid = window.innerHeight / 2
      let best = 0
      let bestDistance = Infinity
      steps.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const distance = Math.abs((rect.top + rect.bottom) / 2 - mid)
        if (distance < bestDistance) {
          bestDistance = distance
          best = Number(el.getAttribute('data-step'))
        }
      })
      setStep(best)
    }
    const onSticky = () => setShowSticky(window.scrollY > 520)
    onSticky()
    window.addEventListener('scroll', onSticky, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onSticky)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    const out = document.getElementById('output')
    if (!out) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setRulers(true)
    }, { threshold: 0.3 })
    io.observe(out)
    return () => io.disconnect()
  }, [])

  function confirm(key: string) {
    setConfirmed((current) => ({ ...current, [key]: true }))
    setPrinted(false)
  }

  return (
    <div className={`mkt ${mktFontVars}`} ref={rootRef}>
      <nav className="mkt-nav" ref={navRef}>
        <div className="mkt-nav-inner">
          <div className="mkt-nav-side">
            <Link href="/" className="mkt-stamp" aria-label="DeedPro home"><span className="mkt-stamp-name">deed/pro</span></Link>
          </div>
          <div className="mkt-nav-mid">
            <div className="mkt-toggle" aria-label="Audience">
              <span className="mkt-toggle-thumb right" />
              <Link href="/"><span className="mono">{"</>"}</span> Platforms</Link>
              <Link href="/escrow" className="on"><span className="mono">§</span> Escrow desks</Link>
            </div>
            <div className="mkt-menu">
              {MENU.map(([href, label]) => (
                <Link key={href} href={href} className={active === href ? 'on' : undefined}>{label}</Link>
              ))}
            </div>
          </div>
          <div className="mkt-nav-side right">
            <Link href="/login" className="mkt-login">Login</Link>
            <Link href="#start" className="mkt-cta ink">Start free</Link>
          </div>
        </div>
      </nav>
      <div style={{ height: 'var(--navh)' }} />

      <header className="mkt-hero">
        <div className="mkt-hero-inner">
          <p className="mkt-eyebrow">For escrow desks</p>
          <h1>The deed does not print until you confirm every field.</h1>
          <p className="mkt-lede">County records suggest the property facts. Vesting and transfer tax stay yours. On the app, confirmation is the officer&apos;s own authenticated session. On the API, it is a stored record naming the person.</p>
          <div className="mkt-row" style={{ marginTop: 28 }}>
            <Link href="/register" className="mkt-cta ink lg">Start your first deed free</Link>
            <Link href="#output" className="mkt-cta ghost lg">Open the sample deed</Link>
          </div>
          <div className="mkt-grid-3" style={{ marginTop: 36 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FIELDS.map((field) => {
                const done = confirmed[field.key]
                const tone = done ? 'green' : field.kind
                const bg = tone === 'green' ? '#f0fdf4' : tone === 'amber' ? '#fffbeb' : '#f5f3ff'
                const border = tone === 'green' ? '#bbf7d0' : tone === 'amber' ? '#fde68a' : '#ddd6fe'
                return (
                  <div key={field.key} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 14 }}>
                    <div className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {done ? 'Confirmed' : field.kind === 'amber' ? 'From county records, unconfirmed' : 'Proposed, your decision'}
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 6 }}>{field.label}</div>
                    <div style={{ fontSize: 14, color: '#374151' }}>{field.val}</div>
                    {!done && (
                      <button type="button" className="mkt-cta" style={{ marginTop: 8, background: field.kind === 'amber' ? '#b45309' : '#7c4dff' }} onClick={() => confirm(field.key)}>
                        {field.kind === 'amber' ? 'Confirm' : 'Accept'}
                      </button>
                    )}
                  </div>
                )
              })}
              <button
                type="button"
                className="mkt-cta ink"
                disabled={!allConfirmed}
                onClick={() => allConfirmed && setPrinted(true)}
              >
                {allConfirmed ? 'Print the packet' : 'Print stays off until every field is confirmed'}
              </button>
            </div>
            <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
              <div className="mkt-qa" style={{ minHeight: 320, position: 'relative' }}>
                <div className="mono" style={{ fontSize: 12 }}>GRANT DEED · sample parties</div>
                {FIELDS.map((field) => (
                  <p key={field.key} className={confirmed[field.key] ? 'mkt-ink' : undefined} style={{ color: confirmed[field.key] ? '#166534' : '#9ca3af' }}>
                    {field.label}: {confirmed[field.key] ? field.val : '—'}
                  </p>
                ))}
                {printed && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {['Grant Deed', 'Acknowledgment', 'PCOR', 'BOE'].map((sheet, index) => (
                      <div key={sheet} className="mkt-fan" style={{ animationDelay: `${index * 90}ms`, transform: `rotate(${[-9, -3, 3, 9][index]}deg)`, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, padding: 10, fontSize: 12 }}>{sheet}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="output" className="mkt-rule">
        <div className="mkt-wrap mkt-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
          <div className="mkt-deed-frame">
            <SampleDeed embed />
            <div className={rulers ? 'mkt-rulers on' : 'mkt-rulers'} aria-hidden="true">
              <span className="h" /><span className="v l" /><span className="v r" />
              <span className="tag" style={{ top: '22.7%', right: '8%', transform: 'translateY(-130%)' }}>recorder space</span>
              <span className="tag" style={{ top: '12%', right: '8%' }}>side margin</span>
            </div>
          </div>
          <div>
            <h2>The sample, with fictitious parties.</h2>
            <p className="mkt-note" style={{ fontSize: 17 }}>This is the HTML sample, not a PDF from the engine. PCOR and BOE are part of the packet when you print from the app.</p>
            <Link href="/sample-grant-deed" className="mkt-cta ink">Open the sample deed</Link>
          </div>
        </div>
      </section>

      <section id="file" className="mkt-rule">
        <div className="mkt-wrap mkt-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
          <div>
            <h2>How a file runs</h2>
            {STEPS.map((item, index) => (
              <article key={item.title} data-step={index} style={{ padding: '28px 0', borderTop: '1px solid #e5e7eb', opacity: step === index ? 1 : 0.55 }}>
                <div className="mono">0{index + 1}</div>
                <h3>{item.title}</h3>
                <p className="mkt-note">{item.body}</p>
              </article>
            ))}
          </div>
          <div className="mkt-pin">
            <div className="mkt-qa">
              <div className="mono">Step {step + 1} of {STEPS.length}</div>
              <p style={{ background: step === 0 ? '#fffbeb' : undefined }}>APN, owner, legal description</p>
              <p style={{ background: step === 1 ? '#f5f3ff' : undefined }}>Transfer tax and vesting</p>
              <p style={{ outline: step === 2 ? '1px dashed #7c4dff' : undefined }}>Return block</p>
              <p style={{ color: step === 3 ? '#166534' : undefined }}>Notary acknowledgment</p>
            </div>
          </div>
        </div>
      </section>

      <section id="documents" className="mkt-band">
        <div className="mkt-wrap mkt-section">
          <h2>All {INSTRUMENT_COUNT} documents, by name.</h2>
          <ul style={{ columns: 2, paddingLeft: 18, lineHeight: 1.7 }}>
            {DOCUMENTS.map((form) => <li key={form.slug}>{form.label}</li>)}
          </ul>
        </div>
      </section>

      <section id="app" className="mkt-dark">
        <div className="mkt-wrap mkt-section">
          <h2>Time saved</h2>
          <p style={{ color: '#d1d5db', maxWidth: 720 }}>Minutes saved per deed have not been measured. A number on this page would be a guess, so there is no slider and no hours figure.</p>
        </div>
      </section>

      <section id="answers" className="mkt-band">
        <div className="mkt-wrap mkt-section">
          <h2>What officers ask before they try it.</h2>
          <div className="mkt-grid-3" style={{ marginTop: 24 }}>
            <article className="mkt-qa"><h3>Do I need IT to set this up?</h3><p>No. It runs in your browser. Create an account and open a file.</p></article>
            <article className="mkt-qa"><h3>What if the recorder rejects it?</h3><p>Formatting is measured against what the county publishes and shown before you print. Acceptance is the recorder&apos;s decision.</p></article>
            <article className="mkt-qa"><h3>Who is responsible for the deed?</h3><p>You are. Nothing prints until you have confirmed every field, and the record shows that you did.</p></article>
            <article className="mkt-qa"><h3>Does it connect to SoftPro, Qualia, or ResWare?</h3>{/* banned-claims: allow — the question names systems the answer denies; no integration exists */}<p>No. Not today.</p></article>
            <article className="mkt-qa"><h3>Can my assistant prep and I review?</h3><p>Not yet. One login owns its own work. The Business plan is shown and is not for sale.</p></article>
            <article className="mkt-qa"><h3>Can I stop halfway and come back?</h3><p>A draft stays on the account so you can return to it.</p></article>
            <article className="mkt-qa"><h3>What does Free leave out?</h3><p>Nothing in the product is held back by plan. {INSTRUMENT_COUNT} instruments, PCOR and BOE included. Professional adds the priority support the price list already names.</p></article>
            <article className="mkt-open"><h3>Who do I call when I am stuck on a file? <span className="mkt-chip">NEEDS YOUR ANSWER</span></h3><p>Today the answer is info@deedpro.io. Hours and a phone number are not stated here.</p></article>
            <article className="mkt-open"><h3>What happens when the {TRIAL_DAYS}-day trial ends? <span className="mkt-chip">NEEDS YOUR ANSWER</span></h3><p>The length is {TRIAL_DAYS} days. What the account becomes after that, and whether a card is required to start, is not decided on this page.</p></article>
          </div>
          <p style={{ marginTop: 16 }}><Link href="/trust">Read the trust page →</Link></p>
        </div>
      </section>

      <section id="pricing" className="mkt-rule">
        <div className="mkt-wrap mkt-section">
          <h2>Free until it has proven itself.</h2>
          <div className="mkt-grid-3" style={{ marginTop: 24 }}>
            {TIERS.map((tier) => (
              <article key={tier.key} className={tier.key === 'professional' ? 'mkt-price featured' : 'mkt-price'}>
                <div style={{ fontWeight: 700 }}>{tier.name}{tier.badge ? ` · ${tier.badge}` : ''}</div>
                <div className="figure">{priceLabel(tier)}<span style={{ fontSize: 15, color: '#4b5563' }}>{tier.priceMonthly === 0 ? ` ${tier.cadence}` : tier.cadence}</span></div>
                <p className="mkt-note">{tier.blurb}</p>
                {tier.key === 'professional' && <p className="mkt-note">{TRIAL_DAYS} days are included. What happens when they end is unanswered above.</p>}
                {tier.purchasable ? <Link href="/register" className={tier.key === 'professional' ? 'mkt-cta' : 'mkt-cta ink'}>{tier.priceMonthly === 0 ? 'Start free' : 'Create an account'}</Link> : <p className="mkt-note">Not yet available</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="mkt-dark">
        <div className="mkt-wrap mkt-section">
          <h2>See your first deed before you spend a dollar.</h2>
          <p style={{ color: '#b4b9c4' }}>An account and an address. No duration is promised.</p>
          <ol style={{ color: '#d1d5db', lineHeight: 1.7 }}>
            <li>Create an account. Email and a password, no card on this page.</li>
            <li>Type the property address. County records fill what they can.</li>
            <li>Confirm each field and print.</li>
          </ol>
          <Link href="/register" className="mkt-cta paper">Create my free account →</Link>
          <p style={{ color: '#b4b9c4' }}>Questions first? <a href="mailto:info@deedpro.io">info@deedpro.io</a></p>
          <p><Link href="/">Run a software platform instead? The same engine has an API →</Link></p>
        </div>
      </section>

      <footer className="mkt-footer">
        <div className="mkt-wrap" style={{ paddingTop: 40, paddingBottom: 104, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <Link href="/" className="mkt-stamp footer" aria-label="DeedPro home"><span className="mkt-stamp-name">deed/pro</span></Link>
            <LogoLockup size={28} />
            <div className="mkt-row">
              <Link href="/developers">Developers</Link>
              <Link href="/try">Try it live</Link>
              <Link href="/trust">Trust</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
          <div>{identityLine ?? <a href="mailto:info@deedpro.io">info@deedpro.io</a>}</div>
          <p style={{ color: '#9ca3af', maxWidth: 760 }}>DeedPro is software, not a law firm. It prepares documents at the direction of the professional using it and does not provide legal advice.</p>
        </div>
      </footer>

      {showSticky && <div className="mkt-sticky mkt-noprint">
        <div className="mkt-wrap" style={{ paddingTop: 10, paddingBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: '#d1d5db' }}>The free plan is the free plan on the price list.</span>
          <Link href="#start" className="mkt-cta paper">Start your first deed free →</Link>
        </div>
      </div>}
    </div>
  )
}
