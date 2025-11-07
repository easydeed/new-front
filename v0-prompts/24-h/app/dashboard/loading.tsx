export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C4DFF] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )
}
