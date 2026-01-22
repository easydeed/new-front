"use client"

import { useState, useEffect, ReactNode } from "react"
import { Sparkles, FileText, Users, FolderOpen } from "lucide-react"

interface AIEmptyStateProps {
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: "deed" | "partners" | "folder" | "sparkles"
  tips?: string[]
  className?: string
}

const iconMap = {
  deed: FileText,
  partners: Users,
  folder: FolderOpen,
  sparkles: Sparkles,
}

export function AIEmptyState({ 
  title,
  message, 
  action,
  icon = "sparkles",
  tips,
  className = ""
}: AIEmptyStateProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const Icon = iconMap[icon]

  return (
    <div 
      className={`
        text-center py-12 px-6
        transform transition-all duration-500 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${className}
      `}
    >
      {/* Icon */}
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-emerald-600" />
      </div>

      {/* AI Message Card */}
      <div className="max-w-md mx-auto bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-3 text-left">
          <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h3 className="font-semibold text-emerald-800 mb-1">{title}</h3>
            <p className="text-emerald-700 text-sm">{message}</p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Sparkles className="w-5 h-5" />
          {action.label}
        </button>
      )}

      {/* Tips Section */}
      {tips && tips.length > 0 && (
        <div className="mt-8 max-w-sm mx-auto">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">What I can help with</p>
          <div className="space-y-2">
            {tips.map((tip, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2"
              >
                <span className="text-emerald-500">✓</span>
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
