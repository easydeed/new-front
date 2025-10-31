'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthManager } from '@/lib/auth/AuthManager' // replace if your path differs
import { apiPost } from '@/lib/api'

export default function Page() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') || '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const registered = params.get('registered') === 'true'
  const redirect = params.get('redirect') || '/dashboard'

  useEffect(() => {
    if (AuthManager.isAuthenticated()) {
      router.replace('/dashboard')
    }
  }, [router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const result = await apiPost('/users/login', { email, password })
      const token = result?.access_token || result?.token || result?.jwt
      AuthManager.setAuth(token, result?.user)
      router.push(redirect)
    } catch (err: any) {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-white">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        {registered && (
          <div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Registration successful. Please sign in.
          </div>
        )}
        {error && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border px-3 py-2"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="text-sm">Password</span>
            <div className="mt-1 flex gap-2">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border px-3 py-2"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="shrink-0 rounded-md border px-3 text-sm"
                aria-pressed={showPw}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <button
            disabled={loading}
            className="w-full rounded-md border bg-black px-3 py-2 text-white disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-4 text-sm">
          <a className="underline" href="/forgot-password">Forgot password?</a>
        </div>
      </div>
    </main>
  )
}
