"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function StickyCta() {
  const [show, setShow] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const sentinel = document.getElementById("scroll-sentinel")
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShow(!entry.isIntersecting)
      },
      { threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  if (!show) return null

  const content = (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-base font-semibold text-[#1F2B37]">Ready to transform your deed workflow?</span>
        <Button className="bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white font-bold shadow-lg shadow-[#7C4DFF]/25">
          Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  if (shouldReduceMotion) return content

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-xl"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-base font-semibold text-[#1F2B37]">Ready to transform your deed workflow?</span>
        <Button className="bg-[#7C4DFF] hover:bg-[#7C4DFF]/90 text-white font-bold shadow-lg shadow-[#7C4DFF]/25">
          Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
