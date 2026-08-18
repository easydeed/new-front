"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LogoLockup } from "@/components/brand/Logo"

export default function StickyNav() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-md" : "bg-transparent"
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          <LogoLockup size={30} />

          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Features", id: "features" },
              { label: "How it Works", id: "steps" },
              /* HOME2 — an "Integrations" item pointed at id="integrations",
                 a section RED-H1.1 deleted when it found the SoftPro/Qualia
                 claim behind it was untrue. The item outlived the section and
                 scrolled nowhere.
                 NOT re-pointed at the API section: a nav item reading
                 "Integrations" that lands on an API card re-implies the
                 integrations the FAQ on this same page says we do not have. */
              { label: "Pricing", id: "pricing" },
              { label: "FAQ", id: "faq" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  /* HOME2 — Pricing landed on Security and FAQ landed on
                     Pricing: consistently one section short.

                     The cause is this arithmetic. It measures the target's
                     position ONCE, at click time, and scrolls to a number —
                     so anything above the target that grows during the smooth
                     scroll (a font swapping in, an image getting its
                     intrinsic height) leaves the page short by roughly that
                     growth, which on this page is about one section.

                     `scrollIntoView` re-resolves the element rather than a
                     coordinate, and `scroll-margin-top` on the sections
                     supplies the 80px the header needs. The fix is to stop
                     computing a position that can go stale, not to compute it
                     better. */
                  document.getElementById(item.id)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:text-[#1F2B37] hover:bg-gray-50"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* HM1: the conversion path exists — Login and Start Free are
              real links, not a dead button. */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 hover:text-[#1F2B37] hover:bg-gray-50 transition-colors"
            >
              Login
            </Link>
            <Button asChild className="bg-brand-500 hover:bg-brand-600 text-white font-bold">
              <Link href="/register">Start Free</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
