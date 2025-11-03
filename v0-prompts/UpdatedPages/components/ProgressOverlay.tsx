"use client"

import { useEffect, useState } from "react"

interface ProgressOverlayProps {
  stage: string
  isVisible: boolean
}

export default function ProgressOverlay({ stage, isVisible }: ProgressOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setMounted(true)
    } else {
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>

          <h3 id="progress-title" className="text-xl font-bold text-gray-900 mb-2">
            Processing Request
          </h3>

          <p className="text-base text-gray-600 mb-6">{stage || "Please wait..."}</p>

          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full animate-pulse"
              style={{ width: "70%" }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
