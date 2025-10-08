export default function StickyActionBar(){
  return (
    <div className="fixed bottom-4 right-4 flex gap-2 z-50">
      <a href="/create-deed" className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 shadow">
        Start a Deed
      </a>
      <a href="/dashboard" className="inline-flex items-center gap-2 rounded-md px-4 py-2 ring-1 ring-slate/20 bg-white text-ink hover:bg-slate/10">
        Resume Last
      </a>
      <a href="/api-key-request" className="inline-flex items-center gap-2 rounded-md px-4 py-2 ring-1 ring-slate/20 bg-white text-ink hover:bg-slate/10">
        Connect SoftPro
      </a>
    </div>
  )
}

