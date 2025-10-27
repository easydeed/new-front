'use client'
import React from 'react'

export default function DeedPreview({ className = '' }: { className?: string }) {
  const [ok, setOk] = React.useState<boolean | null>(null)
  React.useEffect(() => {
    const i = new Image()
    i.onload = () => setOk(true)
    i.onerror = () => setOk(false)
    i.src = '/images/deed-hero.png'
  }, [])
  if (ok === false) {
    return (
      <svg viewBox="0 0 1200 675" className={className}>
        <rect x="0" y="0" width="1200" height="675" fill="#ffffff" />
        <rect x="24" y="24" width="1152" height="8" fill="#2563EB" />
        <rect x="936" y="24" width="240" height="8" fill="#F26B2B" />
        <text x="48" y="72" fontSize="28" fontFamily="Arial, Helvetica, sans-serif" fill="#1f2937">SmartReview — Grant Deed</text>
        <line x1="48" y1="90" x2="1152" y2="90" stroke="#e5e7eb" strokeWidth="2" />
        <g fontSize="18" fontFamily="Arial, Helvetica, sans-serif" fill="#111827">
          <text x="60" y="132" fill="#64748b">Grantor</text>
          <rect x="240" y="112" width="912" height="40" rx="10" fill="#f8fafc" stroke="#e5e7eb" />
          <text x="254" y="138">HERNANDEZ GERARDO J; MENDOZA YESSICA S</text>
          <text x="60" y="196" fill="#64748b">Grantee</text>
          <rect x="240" y="176" width="912" height="40" rx="10" fill="#f8fafc" stroke="#e5e7eb" />
          <text x="254" y="202">JOHN DOE</text>
          <text x="60" y="260" fill="#64748b">APN</text>
          <rect x="240" y="240" width="912" height="40" rx="10" fill="#f8fafc" stroke="#e5e7eb" />
          <text x="254" y="266">1234-567-890</text>
          <text x="60" y="324" fill="#64748b">Property</text>
          <rect x="240" y="304" width="912" height="40" rx="10" fill="#f8fafc" stroke="#e5e7eb" />
          <text x="254" y="330">1358 5th St, La Verne, CA 91750</text>
          <text x="60" y="388" fill="#64748b">Legal</text>
          <rect x="240" y="368" width="912" height="64" rx="10" fill="#f8fafc" stroke="#e5e7eb" />
          <text x="254" y="392">Lot 15, Block 3, Tract No. 12345, City of La Verne, County of Los Angeles,</text>
          <text x="254" y="416">State of California.</text>
          <text x="60" y="484" fill="#64748b">Vesting</text>
          <rect x="240" y="464" width="912" height="40" rx="10" fill="#f8fafc" stroke="#e5e7eb" />
          <text x="254" y="490">Sole and Separate Property</text>
        </g>
      </svg>
    )
  }
  return <img src="/images/deed-hero.png" alt="Deed preview" width={1200} height={675} className={className} />
}
