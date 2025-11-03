export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-purple-100 animate-spin border-t-[#7C4DFF] mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Loading shared deeds...</p>
      </div>
    </div>
  )
}
