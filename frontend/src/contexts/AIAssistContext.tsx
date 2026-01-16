"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface AIAssistContextType {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  toggle: () => void
}

const AIAssistContext = createContext<AIAssistContextType | undefined>(undefined)

const STORAGE_KEY = "deedpro_ai_assist_enabled"

export function AIAssistProvider({ children }: { children: ReactNode }) {
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
    <AIAssistContext.Provider value={{ enabled, setEnabled, toggle }}>
      {children}
    </AIAssistContext.Provider>
  )
}

export function useAIAssist() {
  const context = useContext(AIAssistContext)
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

