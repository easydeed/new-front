"use client"

import React from "react"

type Props = {
  current: number // Current step (1-indexed, e.g. 1, 2, 3)
  total: number // Total steps (e.g. 5)
}

export default function ProgressBar({ current, total }: Props) {
  // ✅ MUST KEEP - Calculate percentage (0-100%)
  const pct = Math.max(0, Math.min(100, Math.round((current / Math.max(total, 1)) * 100)))

  return (
    <div className="w-full mb-8">
      {/* Step circles (top) */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center flex-1 gap-1 md:gap-2">
          {Array.from({ length: total }, (_, i) => {
            const stepNum = i + 1
            const isCompleted = stepNum < current
            const isCurrent = stepNum === current
            const isUpcoming = stepNum > current

            return (
              <React.Fragment key={i}>
                {/* Circle */}
                <div
                  className={`
                    relative flex items-center justify-center
                    w-7 h-7 md:w-9 md:h-9 rounded-full 
                    transition-all duration-300 ease-in-out
                    ${isCompleted ? "bg-[#7C4DFF] text-white scale-100" : ""}
                    ${isCurrent ? "bg-[#7C4DFF] text-white scale-110 shadow-lg shadow-[#7C4DFF]/30" : ""}
                    ${isUpcoming ? "bg-white border border-gray-300 text-gray-400" : ""}
                  `}
                  aria-label={`Step ${stepNum}${isCompleted ? " completed" : isCurrent ? " current" : ""}`}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4 md:w-5 md:h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs md:text-sm font-bold">{stepNum}</span>
                  )}

                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <span
                      className="absolute inset-0 rounded-full bg-[#7C4DFF] animate-ping opacity-20"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Connecting line between circles (except after last) */}
                {i < total - 1 && (
                  <div
                    className={`
                      flex-1 h-0.5 transition-all duration-500 ease-in-out
                      ${isCompleted ? "bg-[#7C4DFF]" : "bg-gray-300"}
                    `}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Text label (desktop only - right side) */}
        <div className="hidden md:block ml-4 text-sm font-semibold text-[#7C4DFF] whitespace-nowrap">
          Step {current} of {total}
        </div>
      </div>

      {/* Progress bar (bottom) */}
      <div
        className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Step ${current} of ${total}`}
      >
        {/* Progress fill with gradient */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#7C4DFF] to-[#A78BFA] 
                     rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Text label (mobile only - below bar) */}
      <div className="md:hidden mt-2 text-xs text-gray-600 text-center font-medium">
        Step {current} of {total}
      </div>
    </div>
  )
}
