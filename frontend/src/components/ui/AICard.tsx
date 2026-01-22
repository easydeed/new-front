"use client"

import { useState, useEffect, ReactNode } from "react"
import { Sparkles, X, HelpCircle } from "lucide-react"

interface AICardProps {
  message: string
  details?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
  onDismiss?: () => void
  children?: ReactNode
  className?: string
}

export function AICard({ 
  message, 
  details,
  action, 
  secondaryAction,
  dismissible = true,
  onDismiss,
  children,
  className = ""
}: AICardProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  if (dismissed) return null

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => {
      setDismissed(true)
      onDismiss?.()
    }, 200)
  }

  return (
    <div 
      className={`
        bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden
        transform transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        ${className}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-emerald-800 font-medium">{message}</p>
            {children}
            
            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-3">
              {action && (
                <button
                  onClick={action.onClick}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {action.label}
                </button>
              )}
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="text-emerald-700 hover:text-emerald-800 text-sm font-medium transition-colors"
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {details && (
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="p-1.5 rounded-full hover:bg-emerald-100 transition-colors text-emerald-400 hover:text-emerald-600"
                title="Learn more"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
            {dismissible && (
              <button 
                onClick={handleDismiss}
                className="p-1.5 rounded-full hover:bg-emerald-100 transition-colors text-emerald-400 hover:text-emerald-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable details */}
      {details && (
        <div 
          className={`
            bg-emerald-100/50 border-t border-emerald-200 overflow-hidden
            transition-all duration-300 ease-out
            ${showDetails ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <p className="p-4 text-sm text-emerald-700">{details}</p>
        </div>
      )}
    </div>
  )
}
