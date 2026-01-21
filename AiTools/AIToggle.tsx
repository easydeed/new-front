"use client"

import { Sparkles, SparklesIcon } from "lucide-react"
import { useAIAssist } from "@/contexts/AIAssistContext"

export function AIToggle() {
  const { enabled, toggle } = useAIAssist()

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        transition-all duration-200
        ${enabled 
          ? "bg-violet-100 text-violet-700 hover:bg-violet-200" 
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }
      `}
      title={enabled ? "AI Assist is on" : "AI Assist is off"}
    >
      <Sparkles className={`w-4 h-4 ${enabled ? "text-violet-500" : "text-gray-400"}`} />
      <span>AI Assist</span>
      <div 
        className={`
          w-8 h-5 rounded-full relative transition-colors duration-200
          ${enabled ? "bg-violet-500" : "bg-gray-300"}
        `}
      >
        <div 
          className={`
            absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm
            transition-transform duration-200
            ${enabled ? "translate-x-3.5" : "translate-x-0.5"}
          `}
        />
      </div>
    </button>
  )
}

// Compact version for tight spaces
export function AIToggleCompact() {
  const { enabled, toggle } = useAIAssist()

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
        transition-all duration-200
        ${enabled 
          ? "bg-violet-100 text-violet-700 hover:bg-violet-200" 
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }
      `}
      title={enabled ? "AI Assist is on — click to turn off" : "AI Assist is off — click to turn on"}
    >
      <Sparkles className={`w-3 h-3 ${enabled ? "text-violet-500" : "text-gray-400"}`} />
      <span>{enabled ? "AI On" : "AI Off"}</span>
    </button>
  )
}
