'use client';

import { useEffect, useState } from 'react';
import CreatePartnerModal from '@/components/CreatePartnerModal';

interface Partner {
  key_prefix: string;
  company: string;
  is_active: boolean;
  scopes: string[];
  rate_limit_per_minute: number;
  created_at: string;
}

export default function PartnersPage() {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/partners/admin/list', { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const revoke = async (prefix: string) => {
    if (!confirm('Revoke this API key?')) return;
    const res = await fetch(`/api/partners/admin/revoke/${prefix}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">API Partners</h1>
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={() => setShowModal(true)}>
          + Add Partner
        </button>
      </div>

      {error && <div className="text-red-600">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Company</th>
                <th className="py-2">Key Prefix</th>
                <th className="py-2">Status</th>
                <th className="py-2">Scopes</th>
                <th className="py-2">Rate Limit</th>
                <th className="py-2">Created</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.key_prefix} className="border-b hover:bg-gray-50">
                  <td className="py-2">{p.company}</td>
                  <td className="py-2"><code>{p.key_prefix}</code></td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-lg text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-2">{p.scopes.join(', ')}</td>
                  <td className="py-2">{p.rate_limit_per_minute}/min</td>
                  <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="py-2">
                    <a className="text-blue-600 hover:underline mr-3" href={`/admin/partners/${p.key_prefix}`}>View</a>
                    {p.is_active && <button className="text-red-600 hover:underline" onClick={() => revoke(p.key_prefix)}>Revoke</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <CreatePartnerModal onClose={() => setShowModal(false)} onCreated={load} />}
    </div>
  );
}
