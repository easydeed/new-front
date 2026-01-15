"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircleQuestion, X, Send, Loader2, Sparkles } from "lucide-react"
import { aiAssistant, type AIContext } from "@/services/aiAssistant"

interface AIHelpButtonProps {
  /** Context for the AI assistant */
  context: Partial<AIContext>
  /** Name of the field being helped with */
  fieldName?: string
  /** Placeholder text for the input */
  placeholder?: string
  /** Additional class name */
  className?: string
}

/**
 * AIHelpButton Component
 * 
 * Provides an inline AI assistant that users can ask questions to.
 * Opens a small chat interface when clicked.
 * 
 * Part 2.3 of DeedPro Wizard Integration
 */
export function AIHelpButton({
  context,
  fieldName,
  placeholder,
  className = "",
}: AIHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleAsk = async () => {
    if (!question.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await aiAssistant.askQuestion(question, context)
      setAnswer(response)
    } catch (err) {
      setError("Unable to get a response. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setQuestion("")
    setAnswer("")
    setError(null)
    inputRef.current?.focus()
  }

  const handleClose = () => {
    setIsOpen(false)
    setQuestion("")
    setAnswer("")
    setError(null)
  }

  // Collapsed state - just show button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors py-1 ${className}`}
        title="Ask AI for help"
      >
        <MessageCircleQuestion className="w-4 h-4" />
        <span>Ask AI</span>
      </button>
    )
  }

  // Expanded state - show chat interface
  return (
    <div
      className={`mt-3 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-purple-800 text-sm">AI Assistant</span>
            {fieldName && (
              <p className="text-xs text-purple-600">Helping with {fieldName}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
          aria-label="Close AI assistant"
        >
          <X className="w-4 h-4 text-purple-600" />
        </button>
      </div>

      {/* Answer Display */}
      {answer && (
        <div className="mb-3 p-3 bg-white rounded-lg border border-purple-100">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {answer}
          </p>
          <button
            onClick={handleReset}
            className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
          >
            Ask another question
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Question Input */}
      {!answer && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleAsk()
              }
              if (e.key === "Escape") {
                handleClose()
              }
            }}
            placeholder={
              placeholder ||
              `Ask about ${fieldName || "this field"}...`
            }
            className="flex-1 px-3 py-2.5 text-sm border border-purple-200 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       bg-white placeholder:text-gray-400
                       disabled:bg-gray-50 disabled:text-gray-500"
            disabled={isLoading}
          />
          <button
            onClick={handleAsk}
            disabled={isLoading || !question.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 
                       text-white rounded-lg hover:from-purple-700 hover:to-indigo-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-95
                       flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Suggestions */}
      {!answer && !isLoading && fieldName && (
        <div className="mt-3 pt-3 border-t border-purple-100">
          <p className="text-xs text-purple-600 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {getQuickQuestions(fieldName).map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuestion(q)
                  inputRef.current?.focus()
                }}
                className="text-xs px-2.5 py-1.5 bg-white border border-purple-200 rounded-full
                           text-purple-700 hover:bg-purple-50 hover:border-purple-300
                           transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get suggested quick questions based on field name
 */
function getQuickQuestions(fieldName: string): string[] {
  const questions: Record<string, string[]> = {
    vesting: [
      "What's joint tenancy vs community property?",
      "Which vesting avoids probate?",
      "Best vesting for married couples?",
    ],
    grantorName: [
      "How should I format the grantor name?",
      "Should I include middle names?",
      "How to handle trust names?",
    ],
    granteeName: [
      "How should multiple grantees be listed?",
      "Do I need full legal names?",
      "How to list a business entity?",
    ],
    legalDescription: [
      "What makes a complete legal description?",
      "Where can I find the legal description?",
      "Is the APN enough?",
    ],
    dttExemption: [
      "What qualifies for DTT exemption?",
      "Is a gift exempt from DTT?",
      "Is interspousal transfer exempt?",
    ],
    deedType: [
      "When should I use a quitclaim?",
      "What's the difference from grant deed?",
      "When is warranty deed needed?",
    ],
  }

  return questions[fieldName] || [
    "What do I need to know?",
    "What are common mistakes?",
    "Can you explain this?",
  ]
}

export default AIHelpButton

