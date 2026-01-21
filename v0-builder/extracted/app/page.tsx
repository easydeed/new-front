import Link from "next/link"
import { FileText, ArrowRight } from "lucide-react"

const DEED_TYPES = [
  {
    id: "grant-deed",
    title: "Grant Deed",
    description: "Transfer real property with implied warranties",
  },
  {
    id: "quitclaim-deed",
    title: "Quitclaim Deed",
    description: "Transfer property without warranties",
  },
  {
    id: "interspousal-transfer",
    title: "Interspousal Transfer Deed",
    description: "Transfer property between spouses",
  },
  {
    id: "warranty-deed",
    title: "Warranty Deed",
    description: "Transfer with full title warranty",
  },
  {
    id: "tax-deed",
    title: "Tax Deed",
    description: "Transfer after tax sale",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">DeedPro</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Create a New Deed</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select the type of deed you want to create. Our intelligent builder will guide you through the process with
            a live preview.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEED_TYPES.map((deed) => (
            <Link
              key={deed.id}
              href={`/create-deed/${deed.id}`}
              className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-primary hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{deed.title}</h3>
              <p className="text-sm text-gray-600">{deed.description}</p>
            </Link>
          ))}
        </div>

        {/* Demo Hint */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Try searching for <span className="font-mono bg-gray-100 px-2 py-1 rounded">123 Main St</span> or{" "}
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">456 Oak Ave</span> in the property search
          </p>
        </div>
      </main>
    </div>
  )
}
