'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiPost } from '@/lib/api'

export default function Page() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pw1.length < 8) { setError('Minimum 8 characters'); return }
    if (pw1 !== pw2) { setError('Passwords must match'); return }
    setError(null); setLoading(true)
    try {
      await apiPost('/users/reset-password', { token, new_password: pw1, confirm_password: pw2 })
      setTimeout(()=>router.push('/login'), 800)
    } catch {
      setError('Reset failed. Link may be expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-white">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        {error && <p className="mt-2 text-red-700">{error}</p>}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm">New password</span>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="password"
              value={pw1} onChange={(e)=>setPw1(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm">Confirm new password</span>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="password"
              value={pw2} onChange={(e)=>setPw2(e.target.value)} required />
          </label>
          <button disabled={loading} className="w-full rounded-md border bg-black px-3 py-2 text-white disabled:opacity-60">
            {loading ? 'Saving…' : 'Save and sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
