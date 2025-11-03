export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-purple-200 animate-spin border-t-[#7C4DFF]" />
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  )
}
