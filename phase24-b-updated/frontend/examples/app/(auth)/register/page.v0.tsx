'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/api'

export default function Page() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '', password: '', confirm_password: '',
    full_name: '', role: '', company_name: '',
    company_type: '', phone: '', state: '',
    agree_terms: false, subscribe: false
  })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof form>(k:K, v:any){ setForm({ ...form, [k]: v }) }

  function validate(): boolean {
    const e: Record<string,string> = {}
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Invalid email'
    if ((form.password||'').length < 8) e.password = 'Min 8 characters'
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords must match'
    if (!form.full_name) e.full_name = 'Required'
    if (!form.role) e.role = 'Choose a role'
    if (!form.state) e.state = 'Choose a state'
    if (!form.agree_terms) e.agree_terms = 'You must agree to terms'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await apiPost('/users/register', form)
      const qp = new URLSearchParams({ registered: 'true', email: form.email }).toString()
      router.push(`/login?${qp}`)
    } catch (err) {
      setErrors({ _form: 'Registration failed. Try another email?' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-white">
      <div className="w-full max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Create your account</h1>
        {errors._form && <p className="mt-2 text-red-600">{errors._form}</p>}
        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="text-sm">Email *</span>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="email" required
              value={form.email} onChange={(e)=>set('email', e.target.value)}/>
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </label>

          <label className="block">
            <span className="text-sm">Password *</span>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="password" required
              value={form.password} onChange={(e)=>set('password', e.target.value)}/>
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </label>
          <label className="block">
            <span className="text-sm">Confirm Password *</span>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="password" required
              value={form.confirm_password} onChange={(e)=>set('confirm_password', e.target.value)}/>
            {errors.confirm_password && <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>}
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm">Full Name *</span>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="text" required
              value={form.full_name} onChange={(e)=>set('full_name', e.target.value)}/>
            {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
          </label>

          <label className="block">
            <span className="text-sm">Role *</span>
            <select className="mt-1 w-full rounded-md border px-3 py-2" required
              value={form.role} onChange={(e)=>set('role', e.target.value)}>
              <option value="">Select…</option>
              <option>Escrow Officer</option>
              <option>Title Officer</option>
              <option>Real Estate Agent</option>
              <option>Attorney</option>
              <option>Other</option>
            </select>
            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
          </label>

          <label className="block">
            <span className="text-sm">State *</span>
            <select className="mt-1 w-full rounded-md border px-3 py-2" required
              value={form.state} onChange={(e)=>set('state', e.target.value)}>
              <option value="">Select…</option>
              {"".join([f'<option value="{s}">{s}</option>' for s in [
                'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
                'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA',
                'RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
              ]])}
            </select>
            {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
          </label>

          <label className="block">
            <span className="text-sm">Company Name</span>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="text"
              value={form.company_name} onChange={(e)=>set('company_name', e.target.value)}/>
          </label>
          <label className="block">
            <span className="text-sm">Company Type</span>
            <select className="mt-1 w-full rounded-md border px-3 py-2"
              value={form.company_type} onChange={(e)=>set('company_type', e.target.value)}>
              <option value="">Select…</option>
              <option>Title Company</option>
              <option>Escrow Company</option>
              <option>Law Firm</option>
              <option>Real Estate Brokerage</option>
              <option>Independent</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Phone</span>
            <input className="mt-1 w-full rounded-md border px-3 py-2" type="tel"
              value={form.phone} onChange={(e)=>set('phone', e.target.value)}/>
          </label>

          <label className="mt-2 flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={form.agree_terms} onChange={(e)=>set('agree_terms', e.target.checked)}/>
            <span className="text-sm">I agree to the Terms *</span>
          </label>
          {errors.agree_terms && <p className="md:col-span-2 -mt-2 text-sm text-red-600">{errors.agree_terms}</p>}

          <label className="mt-2 flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={form.subscribe} onChange={(e)=>set('subscribe', e.target.checked)}/>
            <span className="text-sm">Subscribe to newsletter</span>
          </label>

          <div className="md:col-span-2 mt-2">
            <button disabled={loading} className="w-full rounded-md border bg-black px-3 py-2 text-white disabled:opacity-60">
              {loading ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
