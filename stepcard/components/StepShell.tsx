import type React from "react"

type Props = {
  children: React.ReactNode
}

/**
 * StepShell - Container component for wizard steps
 * Provides consistent spacing and layout for Q&A UI
 */
export default function StepShell({ children }: Props) {
  return <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">{children}</div>
}
