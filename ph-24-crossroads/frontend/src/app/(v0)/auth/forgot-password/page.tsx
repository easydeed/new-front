'use client';
import { useState } from 'react';
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function ForgotPasswordV0() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('Unable to send reset email');
      setOk(true);
    } catch (err: any) {
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 border rounded-xl p-6 bg-white">
        <h1 className="text-2xl font-bold">Forgot password</h1>
        {ok ? <div className="text-sm text-green-600">Check your email for a reset link.</div> : null}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <label className="block">
          <span className="text-sm">Email</span>
          <input className="mt-1 w-full border rounded p-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <button disabled={loading} className="w-full rounded bg-black text-white py-2">{loading?'Sending…':'Send reset link'}</button>
      </form>
    </main>
  );
}
