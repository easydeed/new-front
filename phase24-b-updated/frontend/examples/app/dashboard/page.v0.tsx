'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthManager } from '@/lib/auth/AuthManager'
import { apiGet } from '@/lib/api'

type Summary = { total: number; completed: number; in_progress: number; month: number }
type Deed = { id: number; deed_type: string; created_at?: string; status?: string }

export default function Page() {
  const router = useRouter()
  const [authChecking, setAuthChecking] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recent, setRecent] = useState<Deed[]>([])
  const [hasDraft, setHasDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auth guard
  useEffect(() => {
    const token = AuthManager.getToken()
    if (!token) {
      router.replace('/login?redirect=/dashboard')
      return
    }
    ;(async () => {
      try {
        await apiGet('/users/profile', token)
        setAuthChecking(false)
      } catch {
        AuthManager.logout()
        router.replace('/login?redirect=/dashboard')
      }
    })()
  }, [router])

  // Data fetch
  useEffect(() => {
    if (authChecking) return
    const token = AuthManager.getToken()!
    ;(async () => {
      try {
        const [s, d] = await Promise.all([
          apiGet('/deeds/summary', token),
          apiGet('/deeds', token),
        ])
        setSummary(s)
        setRecent(Array.isArray(d) ? d.slice(0, 5) : (d?.items ?? []).slice(0,5))
      } catch {
        setError('Failed to load dashboard data.')
      }
    })()
  }, [authChecking])

  // Draft detection
  useEffect(() => {
    try {
      const raw = localStorage.getItem('deedWizardDraft')
      if (!raw) return
      const parsed = JSON.parse(raw)
      setHasDraft(!!parsed?.formData?.deedType)
    } catch {}
  }, [])

  if (authChecking) {
    return <main className="p-8">Checking authentication…</main>
  }

  return (
    <main className="p-6 md:p-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <a href="/create-deed" className="rounded-md border bg-black px-3 py-2 text-white">Create New Deed</a>
      </header>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {/* Stats grid */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {['Total Deeds','In Progress','Completed','This Month'].map((title, i) => (
          <div key={title} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-600">{title}</div>
            <div className="mt-2 text-3xl font-bold">
              {summary ? [summary.total, summary.in_progress, summary.completed, summary.month][i] : '–'}
            </div>
          </div>
        ))}
      </section>

      {/* Draft banner */}
      {hasDraft && (
        <section className="mt-6 rounded-xl border bg-yellow-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Resume draft</div>
              <div className="text-sm text-gray-700">Pick up where you left off.</div>
            </div>
            <a href="/create-deed" className="rounded-md border bg-black px-3 py-2 text-white">Continue</a>
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 text-lg font-semibold">Recent activity</div>
        {recent.length === 0 ? (
          <div className="text-sm text-gray-600">No deeds yet. <a className="underline" href="/create-deed">Create your first deed</a>.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b">
                <tr>
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => (
                  <tr key={d.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">{d.id}</td>
                    <td className="py-2 pr-4">{d.deed_type}</td>
                    <td className="py-2 pr-4">{d.status || '—'}</td>
                    <td className="py-2 pr-4">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
