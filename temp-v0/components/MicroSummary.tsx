"use client"

type Props = {
  text: string // Text to display (e.g. "Step 2 of 5")
}

export default function MicroSummary({ text }: Props) {
  // Parse "Step X of Y" to calculate percentage for mini progress bar
  const match = text.match(/(\d+)\s+of\s+(\d+)/)
  const percentage = match ? (Number.parseInt(match[1]) / Number.parseInt(match[2])) * 100 : 0

  return (
    <div
      className="fixed bottom-6 right-6 z-50
                 hidden md:block
                 bg-white border-2 border-[#7C4DFF] rounded-lg shadow-lg
                 px-4 py-2.5 space-y-2
                 transition-all duration-300 hover:scale-105 hover:shadow-xl
                 animate-in fade-in slide-in-from-bottom-4 duration-500"
      role="status"
      aria-live="polite"
      aria-label="Progress indicator"
    >
      {/* Step text */}
      <div className="text-sm font-semibold text-[#7C4DFF] whitespace-nowrap">{text}</div>

      {/* Mini progress bar */}
      {percentage > 0 && (
        <div className="h-1.5 w-28 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7C4DFF] transition-all duration-500 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}
