"use client"

import { useState, useEffect } from "react"

interface AIGreetingProps {
  userName?: string
  className?: string
}

/** Exported for DASH3: the dashboard headline carries the greeting now,
 *  and a second copy of "before noon it is morning" is a second opinion
 *  about what time it is (§14.3). */
export function getTimeGreeting(): string {
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
      {/* "One line, not a hero" (the day-one mockup). The pulsing badge
          and the 2xl heading were the hero part; the sentence below is
          not, and it is U3's ruling — see the dashboard's comment. */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {greeting}, {displayName}.
        </h1>
        {/* U3: no chat-style promise with no chat behind it — the line under
            the greeting states what the page actually is. */}
        <p className="text-gray-500 text-sm">Here&apos;s where your deeds stand.</p>
      </div>
    </div>
  )
}
