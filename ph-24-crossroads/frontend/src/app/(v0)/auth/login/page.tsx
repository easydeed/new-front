'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FEATURE_FLAGS } from '@/src/config/featureFlags';

// Placeholder AuthManager; replace import path with your real helper
const AuthManager = {
  isAuthenticated: () => typeof window !== 'undefined' && !!localStorage.getItem('access_token'),
  setAuth: (token: string, user?: any) => {
    localStorage.setItem('access_token', token);
    if (user) localStorage.setItem('user_data', JSON.stringify(user));
    document.cookie = `access_token=${token}; path=/; samesite=lax`;
  }
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function LoginPageV0() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (AuthManager.isAuthenticated()) {
      router.replace('/dashboard');
    }
    if (params.get('registered') === 'true') {
      setMessage('Registration successful. Please sign in.');
    }
  }, []); // eslint-disable-line

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      const token = data.access_token || data.token || data.jwt;
      AuthManager.setAuth(token, data.user);
      const redirect = params.get('redirect') || '/dashboard';
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  // 🔁 Replace the markup below with your V0 visual design — keep handlers/state above intact
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 border rounded-xl p-6 bg-white">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {message && <div className="text-sm text-green-600">{message}</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <label className="block">
          <span className="text-sm">Email</span>
          <input className="mt-1 w-full border rounded p-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm">Password</span>
          <input className="mt-1 w-full border rounded p-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        <button disabled={loading} className="w-full rounded bg-black text-white py-2">{loading?'Signing in…':'Sign in'}</button>
        <div className="text-sm">
          <a href="/forgot-password" className="underline">Forgot password?</a>
        </div>
      </form>
    </main>
  );
}
