'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function RegisterPageV0() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '', password: '', confirm_password: '',
    full_name: '', role: '', company_name: '', company_type: '',
    phone: '', state: '', agree_terms: false, subscribe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      // Minimal client validation example
      if (form.password.length < 8) throw new Error('Password must be at least 8 characters');
      if (form.password !== form.confirm_password) throw new Error('Passwords must match');
      if (!form.full_name) throw new Error('Full name is required');
      if (!form.role) throw new Error('Role is required');
      if (!form.state) throw new Error('State is required');
      if (!form.agree_terms) throw new Error('You must agree to the terms');

      const res = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Registration failed');
      const redirect = `/login?registered=true&email=${encodeURIComponent(form.email)}`;
      router.push(redirect);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  // Replace with V0 visuals only
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <form onSubmit={onSubmit} className="w-full max-w-2xl space-y-4 border rounded-xl p-6 bg-white">
        <h1 className="text-2xl font-bold">Create your account</h1>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block"><span className="text-sm">Email *</span><input className="mt-1 w-full border rounded p-2" type="email" value={form.email} onChange={e=>set('email', e.target.value)} required /></label>
          <label className="block"><span className="text-sm">Full Name *</span><input className="mt-1 w-full border rounded p-2" value={form.full_name} onChange={e=>set('full_name', e.target.value)} required /></label>
          <label className="block"><span className="text-sm">Password *</span><input className="mt-1 w-full border rounded p-2" type="password" value={form.password} onChange={e=>set('password', e.target.value)} required /></label>
          <label className="block"><span className="text-sm">Confirm Password *</span><input className="mt-1 w-full border rounded p-2" type="password" value={form.confirm_password} onChange={e=>set('confirm_password', e.target.value)} required /></label>
          <label className="block"><span className="text-sm">Role *</span><select className="mt-1 w-full border rounded p-2" value={form.role} onChange={e=>set('role', e.target.value)} required><option value="">Select…</option><option>Escrow Officer</option><option>Title Officer</option><option>Real Estate Agent</option><option>Attorney</option><option>Other</option></select></label>
          <label className="block"><span className="text-sm">State *</span><input className="mt-1 w-full border rounded p-2" value={form.state} onChange={e=>set('state', e.target.value)} required /></label>
          <label className="block md:col-span-2"><span className="text-sm">Company Name</span><input className="mt-1 w-full border rounded p-2" value={form.company_name} onChange={e=>set('company_name', e.target.value)} /></label>
          <label className="block"><span className="text-sm">Company Type</span><select className="mt-1 w-full border rounded p-2" value={form.company_type} onChange={e=>set('company_type', e.target.value)}><option value="">Select…</option><option>Title Company</option><option>Escrow Company</option><option>Law Firm</option><option>Real Estate Brokerage</option><option>Independent</option></select></label>
          <label className="block"><span className="text-sm">Phone</span><input className="mt-1 w-full border rounded p-2" value={form.phone} onChange={e=>set('phone', e.target.value)} /></label>
          <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={form.agree_terms} onChange={e=>set('agree_terms', e.target.checked)} /><span className="text-sm">I agree to the Terms *</span></label>
          <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={form.subscribe} onChange={e=>set('subscribe', e.target.checked)} /><span className="text-sm">Subscribe to product updates</span></label>
        </div>
        <button disabled={loading} className="w-full rounded bg-black text-white py-2">{loading?'Creating…':'Create account'}</button>
      </form>
    </main>
  );
}
