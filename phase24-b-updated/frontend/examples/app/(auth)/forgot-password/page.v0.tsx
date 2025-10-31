'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/api'

export default function Page() {
  const [email, setEmail] = useState('')
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null); setLoading(true)
    try {
      await apiPost('/users/forgot-password', { email })
      setInfo('If the email exists, a reset link has been sent.')
    } catch {
      setError('Email not found.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-white">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        {info && <p className="mt-2 text-green-700">{info}</p>}
        {error && <p className="mt-2 text-red-700">{error}</p>}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm">Email</span>
            <input className="mt-1 w-full rounded-md border px-3 py-2"
              type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/>
          </label>
          <button disabled={loading} className="w-full rounded-md border bg-black px-3 py-2 text-white disabled:opacity-60">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <div className="mt-4 text-sm"><a className="underline" href="/login">Back to login</a></div>
      </div>
    </main>
  )
}
