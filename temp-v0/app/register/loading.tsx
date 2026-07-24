export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#7C4DFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading registration...</p>
      </div>
    </div>
  )
}
