"use client"

import { createContext, useContext, type ReactNode } from "react"

interface Partner {
  id: string
  label: string
}

interface PartnersContextType {
  partners: Partner[]
}

const PartnersContext = createContext<PartnersContextType | undefined>(undefined)

// Mock data for demo purposes
const MOCK_PARTNERS: Partner[] = [
  { id: "1", label: "First American Title" },
  { id: "2", label: "Fidelity National Title" },
  { id: "3", label: "Chicago Title" },
  { id: "4", label: "Stewart Title" },
  { id: "5", label: "Old Republic Title" },
]

export function PartnersProvider({ children }: { children: ReactNode }) {
  return <PartnersContext.Provider value={{ partners: MOCK_PARTNERS }}>{children}</PartnersContext.Provider>
}

export function usePartners() {
  const context = useContext(PartnersContext)
  if (!context) {
    throw new Error("usePartners must be used within a PartnersProvider")
  }
  return context
}
