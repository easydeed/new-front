'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { LogoLockup } from '@/components/brand/Logo'
import { mktFontVars } from '@/components/marketing/marketingFonts'
import { publicIdentityLine } from '@/lib/publicEnvironment'
import '@/components/marketing/marketing.css'

const MENU: Array<[string, string]> = [
  ['/#output', 'Sample deed'],
  ['/#api', 'API'],
  ['/#answers', 'Hard questions'],
  ['/#pricing', 'Pricing'],
  ['/developers', 'Docs'],
  ['/trust', 'Trust'],
]

/**
 * The marketing header and footer already used on / and /escrow.
 * These pages keep the Platforms side of the toggle parked, with no
 * slide-in, and highlight Docs or Trust in the section menu.
 */
export function MarketingFrame({
  here,
  ctaHref,
  kind,
  children,
}: {
  here: 'Docs' | 'Trust'
  ctaHref: string
  kind: 'docs' | 'trust'
  children: React.ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const identityLine = publicIdentityLine()

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

  return (
    <div className={`mkt ${kind === 'docs' ? 'mkt-docs' : 'mkt-trust'} ${mktFontVars}`} ref={rootRef}>
      <nav className="mkt-nav" ref={navRef} data-screen-label="Nav">
        <div className="mkt-nav-inner">
          <div className="mkt-nav-side">
            <Link href="/" className="mkt-stamp" aria-label="DeedPro home"><span className="mkt-stamp-name">deed/pro</span></Link>
          </div>
          <div className="mkt-nav-mid">
            <div className="mkt-toggle" aria-label="Audience">
              <span className="mkt-toggle-thumb parked" />
              <Link href="/" className="on"><span className="mono">{'</>'}</span> Platforms</Link>
              <Link href="/escrow"><span className="mono">§</span> Escrow desks</Link>
            </div>
            <div className="mkt-menu" data-nav-menu="1">
              {MENU.map(([href, label]) => (
                <Link key={href} href={href} className={label === here ? 'on' : undefined}>{label}</Link>
              ))}
            </div>
          </div>
          <div className="mkt-nav-side right">
            <Link href="/login" className="mkt-login">Login</Link>
            <Link href={ctaHref} className="mkt-cta">Request a sandbox key</Link>
          </div>
        </div>
      </nav>
      <div style={{ height: 'var(--navh)' }} />
      {children}
      <footer className="mkt-footer">
        <div className="mkt-wrap" style={{ paddingTop: 40, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 18 }}>
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
          <p style={{ maxWidth: 760, color: '#9ca3af' }}>DeedPro is software, not a law firm. It prepares documents at the direction of the professional using it and does not provide legal advice.</p>
        </div>
      </footer>
    </div>
  )
}
