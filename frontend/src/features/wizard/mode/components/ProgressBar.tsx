"use client"

import React from "react"
import { Check } from "lucide-react"

type Props = {
  current: number // Current step (1-indexed, e.g. 1, 2, 3)
  total: number // Total steps (e.g. 5)
  steps?: Array<{ key: string; title: string }> // Optional: Step titles for labels
}

export default function ProgressBar({ current, total, steps }: Props) {
  // ✅ MUST KEEP - Calculate percentage (0-100%)
  const pct = Math.max(0, Math.min(100, Math.round((current / Math.max(total, 1)) * 100)))
  
  const stepTitles = steps?.map((s) => s.title) || Array.from({ length: total }, (_, i) => `Step ${i + 1}`)

  return (
    <div className="w-full mb-8 bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800">Your Progress</h3>
        <div className="text-base font-semibold text-slate-600">
          Step {current} of {total} • <span className="text-[#7C4DFF]">{pct}% Complete</span>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2 md:gap-4">
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < current
          const isCurrent = stepNum === current
          const isUpcoming = stepNum > current

          return (
            <React.Fragment key={i}>
              {/* Step column */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Circle indicator */}
                <div
                  className={`
                    relative flex items-center justify-center
                    w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full 
                    transition-all duration-300 ease-in-out
                    ${isCompleted ? "bg-green-500 text-white scale-100" : ""}
                    ${isCurrent ? "bg-gradient-to-br from-[#7C4DFF] to-[#6a3de8] text-white scale-110 shadow-lg shadow-[#7C4DFF]/30" : ""}
                    ${isUpcoming ? "bg-slate-200 text-slate-600" : ""}
                  `}
                  aria-label={`Step ${stepNum}${isCompleted ? " completed" : isCurrent ? " current" : ""}`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 md:w-6 md:h-6 stroke-[3]" aria-hidden="true" />
                  ) : (
                    <span className="text-base md:text-lg lg:text-xl font-bold">{stepNum}</span>
                  )}

                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <span
                      className="absolute inset-0 rounded-full bg-[#7C4DFF] animate-ping opacity-20"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Step label */}
                <div className="mt-3 text-center">
                  <div
                    className={`
                      text-sm md:text-base font-medium transition-colors duration-300
                      ${isCurrent ? "text-[#7C4DFF] font-semibold" : ""}
                      ${isCompleted ? "text-slate-700" : ""}
                      ${isUpcoming ? "text-slate-500" : ""}
                    `}
                  >
                    {stepTitles[i] || `Step ${stepNum}`}
                  </div>
                  {/* Status indicator */}
                  <div className="text-xs md:text-sm text-slate-400 mt-0.5">
                    {isCompleted && "Completed"}
                    {isCurrent && "Current"}
                    {isUpcoming && "Upcoming"}
                  </div>
                </div>
              </div>

              {/* Connecting line between steps (except after last) */}
              {i < total - 1 && (
                <div className="flex items-center pt-5 md:pt-6 lg:pt-7">
                  <div
                    className={`
                      w-8 md:w-12 lg:w-16 h-1 md:h-1.5 rounded-full transition-all duration-500 ease-in-out
                      ${isCompleted ? "bg-green-500" : ""}
                      ${isCurrent ? "bg-gradient-to-r from-green-500 to-[#7C4DFF]" : ""}
                      ${isUpcoming ? "bg-slate-300" : ""}
                    `}
                    aria-hidden="true"
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      <div
        className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-6"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Step ${current} of ${total}, ${pct}% complete`}
      >
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#7C4DFF] to-[#A78BFA] 
                     rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
