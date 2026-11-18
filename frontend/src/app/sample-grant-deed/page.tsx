'use client'

import Link from 'next/link'
import { SampleDeed } from '@/components/marketing/SampleDeed'
import { mktFontVars } from '@/components/marketing/marketingFonts'
import '@/components/marketing/marketing.css'

/** The sample grant deed on its own address, so "Open the sample deed"
 *  has somewhere to go. Print uses the browser. It is not an engine PDF. */
export default function SampleGrantDeedPage() {
  return (
    <div className={`mkt ${mktFontVars}`} style={{ minHeight: '100vh', padding: '24px clamp(16px, 4vw, 48px) 48px' }}>
      <div className="mkt-noprint" style={{ maxWidth: 816, margin: '0 auto 12px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <Link href="/">Back to DeedPro</Link>
        <Link href="/escrow">Escrow desks</Link>
      </div>
      <SampleDeed />
    </div>
  )
}
