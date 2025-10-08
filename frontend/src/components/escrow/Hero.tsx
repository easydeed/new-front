'use client';

import { useSearchParams } from 'next/navigation';

export default function Hero() {
  const searchParams = useSearchParams();
  const ab = searchParams?.get('ab') || 'A';

  const variants = {
    A: {
      h1: 'Close files faster. Recorder‑ready deeds in minutes.',
      sub: 'Built for escrow officers. Import from SoftPro/Qualia, auto‑format with AI, and print recorder‑compliant PDFs—no re‑keying.',
    },
    B: {
      h1: 'Stop re‑typing order data.',
      sub: 'Pull parties and property data from SoftPro/Qualia, apply recorder rules automatically, and download a perfect PDF.',
    }
  }
  const { h1, sub } = variants[ab as keyof typeof variants] || variants.A;

  return (
    <section className="section">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="h1">{h1}</h1>
        <p className="mt-3 text-slate max-w-2xl">{sub}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href="/create-deed" className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2">
            Start a Deed
            <svg aria-hidden className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7 5l5 5-5 5"/></svg>
          </a>
          <div className="inline-flex rounded-md ring-1 ring-slate/20 overflow-hidden bg-white">
            <button className="px-3 py-2 text-ink hover:bg-slate/10">Connect SoftPro</button>
            <button className="px-3 py-2 text-ink hover:bg-slate/10 border-l border-slate/20">Connect Qualia</button>
          </div>
        </div>
        <ul className="proofline mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <li>SOC 2</li><li>ALTA Best Practices</li><li>99.9% uptime</li><li>Trusted by 1,200+ officers</li>
        </ul>
      </div>
    </section>
  )
}

