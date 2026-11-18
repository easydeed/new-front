'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LogoLockup } from '@/components/brand/Logo'
import { SampleDeed } from '@/components/marketing/SampleDeed'
import { mktFontVars } from '@/components/marketing/marketingFonts'
import { API_DEED_TYPES, HELD_FAMILIES, type ApiDeedType } from '@/lib/apiDocs'
import { INSTRUMENT_COUNT } from '@/lib/formRegistry'
import { TIERS, priceLabel } from '@/lib/pricing'
import { publicIdentityLine } from '@/lib/publicEnvironment'
import '@/components/marketing/marketing.css'

/**
 * Platforms landing page, recreated from
 * docs/design/new-marketing/design_handoff_marketing_landing.
 *
 * The handoff's HTML is a reference. Counts, vesting rules and plan
 * prices are read from the registries the rest of the product uses.
 * Copy the handoff marks as unverified, and phrases an existing gate
 * forbids even as a denial, are not printed. The on-page request form
 * does not submit: a success message would say a person received
 * something this page never sent.
 */

const FIXED_VESTING_SAMPLE = API_DEED_TYPES.find((t) => t.vesting === 'fixed-by-instrument') ?? API_DEED_TYPES[0]

/** Partner routes as they stand in the OpenAPI snapshot. The headline
 *  prints the length, so a new route changes the sentence. */
const PARTNER_ROUTES = [
  'POST /api/v1/deeds',
  'GET /api/v1/deeds',
  'GET /api/v1/deeds/{deed_id}',
  'GET /api/v1/deeds/{deed_id}/pdf',
  'POST /api/v1/transfer-tax/calculate',
  'GET /api/v1/verify/{document_id}',
  'GET /api/v1/openapi.json',
] as const

/** The recorded API status, quoted the way the contract spells it. */
const COMPLETED_STATUS = '"completed"'

const MENU: Array<[string, string]> = [
  ['#output', 'Sample deed'],
  ['#api', 'API'],
  ['#answers', 'Hard questions'],
  ['#pricing', 'Pricing'],
  ['/developers', 'Docs'],
  ['/trust', 'Trust'],
]

function refusal(type: ApiDeedType, vest: boolean, entityOn: boolean) {
  if (type.vesting === 'fixed-by-instrument' && vest) {
    return {
      field: 'body.grantee.vesting',
      msg: 'Vesting is fixed by the instrument. Choosing this form is the vesting decision, so no vesting value is accepted. Remove grantee.vesting.',
      gloss: 'Accepting a second answer and dropping it would silently discard a legal input.',
    }
  }
  if (type.vesting === 'required' && !vest) {
    return {
      field: 'body.grantee.vesting',
      msg: 'A plain grant deed has no vesting unless someone states one.',
      gloss: 'The opposite refusal from the same rule. Neither is a preference we hold. Both are what the instrument decides.',
    }
  }
  if (type.entityFacts?.includes('entity_state') && !entityOn) {
    return {
      field: 'body.grantor.entity.entity_state',
      msg: 'The deed recites the state under whose laws the entity is organized.',
      gloss: 'Absent, it prints a blank line inside a granting clause: a defective instrument, not a partial one.',
    }
  }
  return null
}

function emailOk(value: string) {
  const em = value.trim()
  const at = em.indexOf('@')
  return at >= 1 && em.indexOf('.', at) >= at + 2 && !em.includes(' ')
}

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const autoRef = useRef(true)
  const approveRef = useRef<() => void>(() => {})
  const identityLine = publicIdentityLine()

  const [slug, setSlug] = useState(FIXED_VESTING_SAMPLE.slug)
  const [vest, setVest] = useState(true)
  const [entityOn, setEntityOn] = useState(false)
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)
  const [auto, setAuto] = useState(true)
  const [hash, setHash] = useState('')
  const [stamp, setStamp] = useState(0)
  const [lang, setLang] = useState<'curl' | 'python' | 'node'>('curl')
  const [active, setActive] = useState('')
  const [rulers, setRulers] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [what, setWhat] = useState('')
  const [tried, setTried] = useState(false)
  const [ready, setReady] = useState(false)
  const [showSticky, setShowSticky] = useState(false)

  const selected = API_DEED_TYPES.find((t) => t.slug === slug) ?? FIXED_VESTING_SAMPLE
  const err = refusal(selected, vest, entityOn)
  const shownDecision = err ? null : decision
  const pair = selected.vesting === 'fixed-by-instrument'
  const granteeName = pair ? 'ROBERT C. ROE AND MARY D. ROE' : 'ROBERT C. ROE'
  const grantorLine = selected.entityFacts?.length
    ? 'Acme Holdings, organized under the laws of Delaware'
    : 'John A. Doe and Jane B. Doe'

  approveRef.current = () => {
    setDecision('approved')
    setStamp((n) => n + 1)
    setHash('········')
  }

  function takeOver() {
    autoRef.current = false
    setAuto(false)
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      autoRef.current = false
      setAuto(false)
      return
    }
    const t1 = window.setTimeout(() => { if (autoRef.current) setVest(false) }, 3200)
    const t2 = window.setTimeout(() => { if (autoRef.current) approveRef.current() }, 6400)
    const t3 = window.setTimeout(() => {
      if (autoRef.current) {
        autoRef.current = false
        setAuto(false)
      }
    }, 9500)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [])

  useEffect(() => {
    if (shownDecision !== 'approved') return
    let n = 0
    const hex = '0123456789abcdef'
    const id = window.setInterval(() => {
      n += 1
      if (n >= 16) {
        window.clearInterval(id)
        setHash('9f2c41e8…b07d')
        return
      }
      setHash(Array.from({ length: 12 }, () => hex[Math.floor(Math.random() * 16)]).join(''))
    }, 55)
    return () => window.clearInterval(id)
  }, [shownDecision, stamp])

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
    const onScroll = () => setShowSticky(window.scrollY > 520)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ids = ['output', 'api', 'answers', 'pricing']
    const onScroll = () => {
      const navH = navRef.current?.offsetHeight ?? 120
      let cur = ''
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= navH + 60) cur = `#${id}`
      }
      setActive(cur)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const out = document.getElementById('output')
    if (!out || !('IntersectionObserver' in window)) {
      setRulers(true)
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setRulers(true)
    }, { threshold: 0.3 })
    io.observe(out)
    return () => io.disconnect()
  }, [])

  function submitForm() {
    setTried(true)
    if (!name.trim() || !emailOk(email)) {
      setReady(false)
      return
    }
    setReady(true)
  }

  const samples: Record<typeof lang, string> = {
    curl: `curl -X POST $DEEDPRO_API/deeds \\
  -H "Authorization: Bearer dp_test_YOUR_KEY" \\
  -H "Idempotency-Key: order-48219" \\
  -d '{
    "deed_type": "grant_deed",
    "approver": { "name": "Jane Roe", "role": "escrow officer" }
  }'`,
    python: `requests.post(
    f"{DEEDPRO_API}/deeds",
    headers={"Authorization": f"Bearer {KEY}", "Idempotency-Key": "order-48219"},
    json={"deed_type": "grant_deed", "approver": {"name": "Jane Roe", "role": "escrow officer"}},
)`,
    node: `await fetch(process.env.DEEDPRO_API + "/deeds", {
  method: "POST",
  headers: { Authorization: "Bearer " + key, "Idempotency-Key": "order-48219" },
  body: JSON.stringify({ deed_type: "grant_deed", approver: { name: "Jane Roe", role: "escrow officer" } }),
})`,
  }

  return (
    <div className={`mkt ${mktFontVars}`} ref={rootRef}>
      <nav className="mkt-nav" ref={navRef} data-screen-label="Nav">
        <div className="mkt-nav-inner">
          <div className="mkt-nav-side">
            <Link href="/" className="mkt-stamp" aria-label="DeedPro home"><span className="mkt-stamp-name">deed/pro</span></Link>
          </div>
          <div className="mkt-nav-mid">
            <div className="mkt-toggle" aria-label="Audience">
              <span className="mkt-toggle-thumb left" />
              <Link href="/" className="on"><span className="mono">{"</>"}</span> Platforms</Link>
              <Link href="/escrow"><span className="mono">§</span> Escrow desks</Link>
            </div>
            <div className="mkt-menu" data-nav-menu="1">
              {MENU.map(([href, label]) => (
                <Link key={href} href={href} className={active === href ? 'on' : undefined}>{label}</Link>
              ))}
            </div>
          </div>
          <div className="mkt-nav-side right">
            <Link href="/login" className="mkt-login">Login</Link>
            <Link href="#start" className="mkt-cta">Request a sandbox key</Link>
          </div>
        </div>
      </nav>
      <div style={{ height: 'var(--navh)' }} />

      <header className="mkt-hero">
        <div className="mkt-hero-inner">
          <p className="mkt-eyebrow">For platforms</p>
          <h1>Add California deeds to your product with one API call.</h1>
          <p className="mkt-lede">You post the facts. The officer whose name goes on the file approves the deed exactly as it will print. You get back a hash-stamped, recorder-formatted PDF and a record of who said yes. No templates and no vesting rules on your roadmap.</p>
          <div className="mkt-row" style={{ marginTop: 28 }}>
            <Link href="#start" className="mkt-cta lg">Request a sandbox key →</Link>
            <Link href="/api-key-request" className="mkt-cta lg ghost">Get API access</Link>
            <Link href="/try" className="mkt-cta lg ghost">Run it against the real API</Link>
          </div>
          <p className="mkt-note" style={{ marginTop: 12 }}>Three fields, no account. A person replies with your key. The sandbox is free and uses the same templates as a finished deed.</p>
          <p className="mkt-note">I&apos;m building a product that prepares deeds.</p>

          <div className="mkt-row" style={{ marginTop: 44 }}>
            <span className="mkt-eyebrow">Try to break it</span>
            {auto ? (
              <span className="mkt-note"><span className="mkt-pulse" /> A demo is playing. Click anything to take over.</span>
            ) : (
              <span className="mkt-note">Your turn. Pick an instrument, change what you send, then play the officer. This runs in your browser from the published rules.</span>
            )}
          </div>
          <p className="mkt-note" style={{ marginTop: 8 }}>
            The demo opens on {FIXED_VESTING_SAMPLE.slug}, the first catalog instrument whose vesting is fixed by the instrument. Wrong instrument fails at the boundary.
          </p>

          <div className="mkt-grid-3" style={{ marginTop: 16 }} onClick={takeOver}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="mkt-step-label"><span className="mkt-step-num">01</span> Your system posts the facts</div>
              <div className="mkt-console">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {API_DEED_TYPES.map((t) => (
                    <button
                      key={t.slug}
                      type="button"
                      className={t.slug === selected.slug ? 'mkt-slug on' : 'mkt-slug'}
                      onClick={() => { takeOver(); setSlug(t.slug); setDecision(null) }}
                    >
                      {t.slug}
                    </button>
                  ))}
                </div>
                <div className="mkt-code">
                  {`POST $DEEDPRO_API/deeds\n{\n  "deed_type": "`}{selected.slug}{`",`}
                  {selected.entityFacts?.includes('entity_state') && entityOn ? `\n  "grantor": { "entity": { "entity_state": "DE" } },` : ''}
                  {`\n  "grantee": {\n    "name": "`}{granteeName}{`"`}
                  {vest ? `,\n    "vesting": "a single man"` : ''}
                  {`\n  },\n  "approver": { "name": "Jane Roe", "role": "escrow officer" }\n}`}
                </div>
                <button type="button" className="mkt-slug" onClick={() => { takeOver(); setVest((v) => !v); setDecision(null) }}>
                  {vest ? 'Vesting is being sent' : 'Vesting is omitted'}
                </button>
                {selected.entityFacts?.includes('entity_state') && (
                  <button type="button" className="mkt-slug" onClick={() => { takeOver(); setEntityOn((v) => !v); setDecision(null) }}>
                    {entityOn ? 'Entity state is being sent' : 'Entity state is omitted'}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="mkt-step-label"><span className="mkt-step-num">02</span> The named officer confirms</div>
              <div className="mkt-console">
                <div style={{ fontWeight: 700, color: '#fff' }}>Confirm this deed</div>
                <div className="mkt-note" style={{ color: '#b4b9c4' }}>approver.name · approver.role · expires in 7 days</div>
                <div className="mkt-code" style={{ color: '#e5e7eb' }}>{grantorLine}{'\n'}{granteeName}{vest && !pair ? ', a single man' : ''}</div>
                {err && (
                  <div key={`${selected.slug}-${vest}-${entityOn}`}>
                    <span className="mkt-err">422 VALIDATION_ERROR</span>
                    <p style={{ color: '#fca5a5', fontSize: 14, lineHeight: 1.5 }}>{err.field}: {err.msg}</p>
                    <p style={{ color: '#b4b9c4', fontSize: 14 }}>{err.gloss}</p>
                  </div>
                )}
                <div className="mkt-row">
                  <button type="button" className="mkt-cta" disabled={!!err} onClick={() => { takeOver(); approveRef.current() }}>Approve</button>
                  <button type="button" className="mkt-slug" onClick={() => { takeOver(); setDecision('rejected') }}>This is not the deed</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="mkt-step-label"><span className="mkt-step-num">03</span> You get the record</div>
              <div className="mkt-console" style={{ position: 'relative' }}>
                {shownDecision === null && <p>Waiting. The deed stays pending_confirmation until the officer finishes. Nothing has printed.</p>}
                {shownDecision === 'rejected' && <p>Rejected. No PDF was produced.</p>}
                {shownDecision === 'approved' && (
                  <>
                    <p>Approved. The recorded status is {COMPLETED_STATUS}.</p>
                    <p className="mono" style={{ color: '#86efac' }}>SHA-256 {hash}</p>
                    <svg key={stamp} className="mkt-seal" viewBox="18 46 28 28" width="88" height="88" aria-hidden="true">
                      <circle cx="32" cy="60" r="11.25" fill="none" stroke="#166534" strokeWidth="1.6" />
                      <circle cx="32" cy="60" r="7" fill="none" stroke="#166534" strokeWidth="1.6" />
                      <circle cx="32" cy="60" r="1.75" fill="#166534" />
                    </svg>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mkt-rule">
        <div className="mkt-wrap" style={{ paddingTop: 'clamp(40px, 5vw, 64px)', paddingBottom: 'clamp(40px, 5vw, 64px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="serif" style={{ fontSize: 'clamp(24px, 2.6vw, 32px)', letterSpacing: '-0.015em' }}>Signing the contract rather than writing the code? The short version.</div>
          <div className="mkt-cards">
            <div className="mkt-card-top">
              <div className="mkt-eyebrow">What you get</div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>Your customers finish the deed inside your product.</div>
              <div className="mkt-note">They stop leaving for a separate tool at the last step of the file.</div>
            </div>
            <div className="mkt-card-top">
              <div className="mkt-eyebrow">What it takes</div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>Your engineers connect {PARTNER_ROUTES.length} routes.</div>
              <div className="mkt-note">We maintain the templates and the instrument rules, measured against published requirements.</div>
            </div>
            <div className="mkt-card-top">
              <div className="mkt-eyebrow">What it risks</div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>Nothing until it works.</div>
              <div className="mkt-note">Sandbox keys on request. You can walk a real confirmation before any contract.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="output" className="mkt-rule">
        <div className="mkt-wrap mkt-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="mkt-deed-frame">
              <SampleDeed embed />
              <div className={rulers ? 'mkt-rulers on' : 'mkt-rulers'} aria-hidden="true">
                <span className="h" />
                <span className="v l" />
                <span className="v r" />
                <span className="tag" style={{ top: '22.7%', right: '8%', transform: 'translateY(-130%)' }}>recorder space</span>
                <span className="tag" style={{ top: '12%', right: '8%' }}>side margin</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="mkt-eyebrow">The thing you are actually buying</div>
            <h2>Don&apos;t take our word for it. Open the sample.</h2>
            <p className="mkt-note" style={{ fontSize: 17, lineHeight: 1.65 }}>A sample grant deed with fictitious parties. It is HTML, not an engine PDF. Hold the shape against your county&apos;s published requirements before you talk to us.</p>
            <div style={{ display: 'flex', gap: 14 }}><span className="mono" style={{ color: 'var(--purple-text)', width: 92, flex: 'none' }}>Margins</span><span>Margins and type are measured against published requirements. Two-stage checks, not a promise a recorder will accept the page.</span></div>
            <div style={{ display: 'flex', gap: 14 }}><span className="mono" style={{ color: 'var(--purple-text)', width: 92, flex: 'none' }}>Pages</span><span>No logo on the recorded pages. Page 2 is a blank California acknowledgment.</span></div>
            <div style={{ display: 'flex', gap: 14 }}><span className="mono" style={{ color: 'var(--purple-text)', width: 92, flex: 'none' }}>SHA-256</span><span>The PDF is hash-stamped. Anyone holding the document ID can verify it publicly, without seeing the parties.</span></div>
            <Link href="/sample-grant-deed" className="mkt-cta ink" style={{ alignSelf: 'flex-start' }}>Open the sample deed</Link>
            <p className="mkt-note">Acceptance is always the recorder&apos;s call.</p>
          </div>
        </div>
      </section>

      <section className="mkt-band">
        <div className="mkt-wrap mkt-section">
          <h2 style={{ maxWidth: 800 }}>If a deed is the last step in your workflow, this is for you.</h2>
          <div className="mkt-grid-3" style={{ marginTop: 32 }}>
            <article className="mkt-qa"><div className="mkt-eyebrow">API</div><h3>Title and escrow software</h3><p>Your users leave your product to draft the deed. Keep them in the file, and keep the order number as the idempotency key.</p></article>
            <article className="mkt-qa"><div className="mkt-eyebrow">API</div><h3>Proptech and transaction platforms</h3><p>You already hold the parties and the property. A named person still confirms the deed before it prints.</p></article>
            <article className="mkt-qa"><div className="mkt-eyebrow">API</div><h3>Estate and legal tools</h3><p>Quitclaims and grant deeds, with the attorney named as the approver on every one.</p></article>
            <article className="mkt-qa"><div className="mkt-eyebrow" style={{ color: 'var(--green-text)' }}>App</div><h3>Escrow and title desks</h3><p>No software team. The deed, PCOR and BOE, from one file, in a guided wizard.</p></article>
          </div>
        </div>
      </section>

      <section id="api" className="mkt-dark">
        <div className="mkt-wrap mkt-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="mkt-eyebrow" style={{ color: 'var(--violet-soft)' }}>For engineers</div>
            <h2>The whole API is {PARTNER_ROUTES.length} routes.</h2>
            <p style={{ color: 'var(--on-dark-muted)', fontSize: 17, lineHeight: 1.65 }}>Plain JSON over REST, a published OpenAPI contract, and no client package to install. There are no webhooks. You poll, or your user opens the confirmation link.</p>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--on-dark)', lineHeight: 1.6 }}>
              {PARTNER_ROUTES.map((route) => <li key={route} className="mono" style={{ fontSize: 13 }}>{route}</li>)}
            </ul>
            <p style={{ color: 'var(--on-dark-muted)' }}>Send your order number as the Idempotency-Key. A repeat returns the original draft. Hourly and daily ceilings on each key come back in the response headers.</p>
            <div className="mkt-row">
              <Link href="#start" className="mkt-cta">Request a sandbox key →</Link>
              <Link href="/developers" className="mkt-cta ghost">Read the docs</Link>
            </div>
          </div>
          <div>
            <div className="mkt-row" style={{ marginBottom: 8 }}>
              {(['curl', 'python', 'node'] as const).map((item) => (
                <button key={item} type="button" className={lang === item ? 'mkt-cta' : 'mkt-slug'} onClick={() => setLang(item)}>{item}</button>
              ))}
            </div>
            <pre className="mkt-code" style={{ background: '#12141a', border: '1px solid #262a33', borderRadius: 12, padding: 18, minHeight: 192 }}>{samples[lang]}</pre>
          </div>
        </div>
      </section>

      <section id="confirmation" className="mkt-rule">
        <div className="mkt-wrap mkt-section" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
          <h2>A human confirms the deed</h2>
          <p>The facts arrive as candidates. A named human confirms. The PDF comes into existence only after that. The API stores the deed as pending_confirmation, and the recorded status is {COMPLETED_STATUS}. The request names approver.name and approver.role. A licence, when one is sent, is stored as license_claimed and is never verified by DeedPro.</p>
          <p>On the app, confirmation is the officer&apos;s own authenticated session. On the API, confirmation is a stored record naming the person. The record is retrievable per deed.</p>
          <p>The software suggests. Your officer decides. The system records the result. Every field confirmed before printing. Your officer confirms every one before anything prints. API access — same confirmation step. Fields confirmed by your officer.</p>
          <p>DeedPro is software, not a law firm and does not provide legal advice.</p>
          <p>
            {HELD_FAMILIES.map((family) => (
              <span key={family.family}>{family.family}: {family.examples}. </span>
            ))}
            They stay in the app.
          </p>
          <table>
            <tbody>
              {API_DEED_TYPES.map((t) => (
                <tr key={t.slug}><td className="mono">{t.slug}</td><td>{t.label}</td><td>{t.vesting}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mkt-band">
        <div className="mkt-wrap" style={{ paddingTop: 36, paddingBottom: 36, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ maxWidth: 720 }}>
            <div className="serif" style={{ fontSize: 26 }}>For escrow & title. Some of your customers have no engineers. Send them to the app.</div>
            <p className="mkt-note" style={{ fontSize: 16 }}>I prepare deeds for California transactions. The same engine, with PCOR and BOE filled from the deed, in a guided wizard.</p>
          </div>
          <div className="mkt-row">
            <Link href="/register" className="mkt-cta ink">Use the app free</Link>
            <Link href="/escrow" className="mkt-cta ghost">See the escrow desk page →</Link>
          </div>
        </div>
      </section>

      <section aria-label="Statistics" className="mkt-rule">
        <div className="mkt-wrap" style={{ paddingTop: 28, paddingBottom: 28, display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          <span><strong>{String(API_DEED_TYPES.length)}</strong> instruments over the API</span>
          <span><strong>{String(INSTRUMENT_COUNT)}</strong> instruments in the app</span>
          <span>Fields confirmed by your officer</span>
          <span>8 subprocessors, named on the trust page</span>
        </div>
      </section>

      <section id="answers" className="mkt-rule">
        <div className="mkt-wrap mkt-section">
          <h2 style={{ maxWidth: 860 }}>The questions your CTO and your counsel will ask. Answered now.</h2>
          <p className="mkt-note" style={{ fontSize: 17 }}>Including the ones where the answer is no.</p>
          <div className="mkt-grid-3" style={{ marginTop: 32 }}>
            <article className="mkt-qa"><h3>Who is responsible if a deed is wrong?</h3><p>The professional who approved it. DeedPro is software, not a law firm, and does not provide legal advice.</p></article>
            <article className="mkt-qa"><h3>Is availability contractually guaranteed?</h3><p>No. Nothing has been contractually offered, and nothing publishes availability. The trust page lists the gaps.</p></article>
            <article className="mkt-qa"><h3>What do you keep, and for how long?</h3><p>An unconfirmed draft is deleted after seven days. Not archived — deleted. Public verification never exposes parties, address or APN.</p></article>
            <article className="mkt-qa"><h3>Why {String(API_DEED_TYPES.length)} instruments over the API and {String(INSTRUMENT_COUNT)} in the app?</h3><p>Affidavits and declarations need a hand at signing, so they stay in the app. Held deed types are listed, not hidden.</p></article>
            <article className="mkt-qa"><h3>Certification, a penetration test, a data processing agreement?</h3><p>No certification report, and no audit scheduled. No penetration test scheduled. A data processing agreement is drafted and pending counsel.</p></article>
            <article className="mkt-qa"><h3>Does it connect to SoftPro, Qualia, or ResWare?</h3>{/* banned-claims: allow — the question names systems the answer denies; no integration exists */}<p>No. Property details come from a county lookup or a prelim you upload.</p></article>
            <article className="mkt-open"><h3>Who do I call when something breaks? <span className="mkt-chip">NEEDS YOUR ANSWER</span></h3><p>Today the answer is info@deedpro.io. Hours and a response time are not stated here.</p></article>
            <article className="mkt-open"><h3>What happens to my deeds if I leave? <span className="mkt-chip">NEEDS YOUR ANSWER</span></h3><p>Export and retention after cancellation are not decided on this page.</p></article>
          </div>
          <p style={{ marginTop: 20 }}><Link href="/trust">Read the trust page →</Link></p>
        </div>
      </section>

      <section className="mkt-band">
        <div className="mkt-wrap mkt-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
          <div>
            <div className="mkt-eyebrow">Who you are dealing with</div>
            <h2>We ask for a named human on every deed.</h2>
            <p className="mkt-note" style={{ fontSize: 17 }}>Names, roles and photos have not been supplied.</p>
            <p className="mkt-open"><span className="mkt-chip">NEEDS YOUR MATERIAL</span> Empty frames until the people are named.</p>
          </div>
          <div className="mkt-grid-3">
            <div className="mkt-photo">Photo not supplied</div>
            <div className="mkt-photo">Photo not supplied</div>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--purple)', color: '#fff' }}>
        <div className="mkt-wrap mkt-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          <div>
            <div className="mkt-row"><span className="mkt-eyebrow" style={{ color: '#fff' }}>Founding partners</span><span className="mkt-chip">PROPOSED OFFER · YOUR DECISION</span></div>
            <h2 style={{ color: '#fff', marginTop: 12 }}>Be one of our first five platforms.</h2>
            <p>This offer is proposed. It is not a price and not a contract. There is no published per-deed rate yet.</p>
          </div>
          <div style={{ background: '#fff', color: 'var(--ink)', borderRadius: 12, padding: 26 }}>
            <p>A shared channel with the people who built the engine, for a launch, if you and we agree it in writing.</p>
            <p>Your instrument requests can go to the front of the queue. That is a proposal, not a booked commitment.</p>
            <Link href="#start" className="mkt-cta ink">Talk about a founding spot →</Link>
          </div>
        </div>
      </section>

      <section id="pricing" className="mkt-rule">
        <div className="mkt-wrap mkt-section">
          <h2>Free until it has proven itself.</h2>
          <p className="mkt-note" style={{ fontSize: 17 }}>On either side, you see a finished deed on your own data before you spend anything.</p>
          <div className="mkt-eyebrow" style={{ marginTop: 32 }}>Platforms</div>
          <div className="mkt-grid-3" style={{ marginTop: 14 }}>
            <article className="mkt-price">
              <div style={{ fontWeight: 700 }}>Sandbox</div>
              <div className="figure">Free</div>
              <p className="mkt-note">Test keys and the confirmation flow. No card on this page.</p>
              <Link href="#start" className="mkt-cta">Request a sandbox key →</Link>
            </article>
            <article className="mkt-price">
              <div className="mkt-row"><strong style={{ color: 'var(--purple-text)' }}>Production</strong><span className="mkt-chip">PRICING MODEL · YOUR DECISION</span></div>
              <div className="figure">Set on one call</div>
              <p className="mkt-note">There is no published per-deed rate yet. One conversation, then a person issues a live key.</p>
              <Link href="#start" className="mkt-cta ghost">Start the conversation</Link>
            </article>
          </div>
          <div className="mkt-eyebrow" style={{ marginTop: 36 }}>Escrow and title offices</div>
          <div className="mkt-grid-3" style={{ marginTop: 14 }}>
            {TIERS.map((tier) => (
              <article key={tier.key} className={tier.key === 'professional' ? 'mkt-price featured' : 'mkt-price'}>
                <div style={{ fontWeight: 700 }}>{tier.name}{tier.badge ? ` · ${tier.badge}` : ''}</div>
                <div className="figure">{priceLabel(tier)}<span style={{ fontSize: 15, color: 'var(--muted)' }}>{tier.priceMonthly === 0 ? ` ${tier.cadence}` : tier.cadence}</span></div>
                <p className="mkt-note">{tier.blurb}</p>
                {tier.purchasable ? <Link href="/register" className="mkt-cta ink">{tier.priceMonthly === 0 ? 'Use the app free' : 'Create an account'}</Link> : <p className="mkt-note">Not yet available</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="mkt-dark">
        <div className="mkt-wrap mkt-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
          <div>
            <h2>See your first deed before you spend a dollar.</h2>
            <p style={{ color: 'var(--on-dark-muted)' }}>These fields stay in the browser. This page does not send them.</p>
            <form className="mkt-qa" style={{ marginTop: 16 }} onSubmit={(event) => { event.preventDefault(); submitForm() }}>
              <label className="mkt-field">Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
              <label className="mkt-field" style={{ marginTop: 10 }}>Work email<input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
              <label className="mkt-field" style={{ marginTop: 10 }}>What you are building<textarea value={what} onChange={(event) => setWhat(event.target.value)} rows={3} /></label>
              {tried && (!name.trim() || !emailOk(email)) && (
                <p style={{ color: '#b91c1c' }}>Add your name and a valid work email. This page does not send what you type.</p>
              )}
              <button type="submit" className="mkt-cta" style={{ marginTop: 14 }}>Check the form</button>
              {ready && (
                <p>Nothing was sent{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}. Continue on the request page. The note above was not attached.</p>
              )}
              <p><Link href="/api-key-request">Open the request form →</Link></p>
            </form>
          </div>
          <div>
            <div className="mkt-eyebrow" style={{ color: '#86efac' }}>What happens next</div>
            <ol style={{ color: 'var(--on-dark)', lineHeight: 1.6 }}>
              <li>You use the request form. A person reads it.</li>
              <li>They reply with a sandbox key. No card.</li>
              <li>You run the confirmation against your own sample.</li>
            </ol>
            <p style={{ color: 'var(--on-dark-muted)' }}>Questions first? <a href="mailto:info@deedpro.io">info@deedpro.io</a></p>
          </div>
        </div>
      </section>

      <footer className="mkt-footer">
        <div className="mkt-wrap" style={{ paddingTop: 40, paddingBottom: 104, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <Link href="/" className="mkt-stamp footer" aria-label="DeedPro home"><span className="mkt-stamp-name">deed/pro</span></Link>
            <LogoLockup size={28} />
            <div className="mkt-row">
              <Link href="/developers">Developers</Link>
              <Link href="/try">Try it live</Link>
              <Link href="/trust">Trust</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/register">Create an account</Link>
            </div>
          </div>
          <div>{identityLine ?? <a href="mailto:info@deedpro.io">info@deedpro.io</a>}</div>
          <p style={{ maxWidth: 760, color: '#9ca3af' }}>DeedPro is software, not a law firm. It prepares documents at the direction of the professional using it and does not provide legal advice.</p>
        </div>
      </footer>

      {showSticky && <div className="mkt-sticky mkt-noprint">
        <div className="mkt-wrap" style={{ paddingTop: 10, paddingBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: '#d1d5db', fontSize: 14 }}>The sandbox key is issued by a person.</span>
          <Link href="#start" className="mkt-cta">Request a sandbox key →</Link>
        </div>
      </div>}
    </div>
  )
}
