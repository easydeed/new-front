'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function ResetPasswordV0() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (password.length < 8) throw new Error('Password must be at least 8 characters');
      if (password !== confirm) throw new Error('Passwords must match');
      const res = await fetch(`${API_URL}/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password, confirm_password: confirm })
      });
      if (!res.ok) throw new Error('Reset failed');
      setOk(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 border rounded-xl p-6 bg-white">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        {ok ? <div className="text-sm text-green-600">Password updated. Redirecting to sign in…</div> : null}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <label className="block">
          <span className="text-sm">New password</span>
          <input className="mt-1 w-full border rounded p-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm">Confirm password</span>
          <input className="mt-1 w-full border rounded p-2" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
        </label>
        <button disabled={loading} className="w-full rounded bg-black text-white py-2">{loading?'Updating…':'Update password'}</button>
      </form>
    </main>
  );
}
