"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

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
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#7C4DFF]" />
            <span className="text-xl font-bold text-[#1F2B37]">DeedPro</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Features", id: "features" },
              { label: "How it Works", id: "steps" },
              { label: "Integrations", id: "integrations" },
              { label: "Pricing", id: "pricing" },
              { label: "FAQ", id: "faq" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  const element = document.getElementById(item.id)
                  if (element) {
                    const offset = 80
                    const elementPosition = element.getBoundingClientRect().top + window.scrollY
                    window.scrollTo({
                      top: elementPosition - offset,
                      behavior: "smooth",
                    })
                  }
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:text-[#1F2B37] hover:bg-gray-50"
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button className="bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white font-bold">Start Free Trial</Button>
        </div>
      </div>
    </nav>
  )
}
