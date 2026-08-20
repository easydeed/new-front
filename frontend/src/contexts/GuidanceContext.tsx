"use client"

/**
 * GUIDANCE — whether the builder's static field help is shown.
 *
 * Renamed from `AIAssistContext` by GUIDE1. It never gated a model; it
 * gates hand-written explanatory copy. See `components/builder/
 * FieldGuidance.tsx` for the full reasoning.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface GuidanceContextType {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  toggle: () => void
}

const GuidanceContext = createContext<GuidanceContextType | undefined>(undefined)

/* THE STORAGE KEY DOES NOT CHANGE, AND THAT IS DELIBERATE.
 *
 * Everything else in this file was renamed because "AI" was a claim the
 * code does not support. This string is not a label — it is where a
 * user's saved preference LIVES. Renaming it would silently turn
 * guidance back on for everyone who had turned it off, because the
 * default is `true` and a missing key is indistinguishable from a fresh
 * browser.
 *
 * §14.1, in the direction that usually goes the other way: the rename is
 * about the property (nothing claims inference it does not do), and this
 * key is spelling. A persisted key is a data migration wearing a rename. */
const STORAGE_KEY = "deedpro_ai_assist_enabled"

export function GuidanceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true) // Default on
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setEnabledState(stored === "true")
    }
    setMounted(true)
  }, [])

  // Persist to localStorage
  const setEnabled = (value: boolean) => {
    setEnabledState(value)
    localStorage.setItem(STORAGE_KEY, String(value))
  }

  const toggle = () => setEnabled(!enabled)

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <GuidanceContext.Provider value={{ enabled, setEnabled, toggle }}>
      {children}
    </GuidanceContext.Provider>
  )
}

export function useGuidance() {
  const context = useContext(GuidanceContext)
  // Return safe defaults if used outside provider (during SSR)
  if (!context) {
    return { 
      enabled: true, 
      setEnabled: () => {}, 
      toggle: () => {} 
    }
  }
  return context
}

