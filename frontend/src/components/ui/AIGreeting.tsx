"use client"

import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"

interface AIGreetingProps {
  userName?: string
  className?: string
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function AIGreeting({ userName, className = "" }: AIGreetingProps) {
  const [visible, setVisible] = useState(false)
  const [greeting, setGreeting] = useState("")

  useEffect(() => {
    setGreeting(getTimeGreeting())
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const displayName = userName || "there"

  return (
    <div 
      className={`
        flex items-center gap-3
        transform transition-all duration-500 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        ${className}
      `}
    >
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {displayName}!
        </h1>
        <p className="text-gray-500 text-sm">How can I help you today?</p>
      </div>
    </div>
  )
}
