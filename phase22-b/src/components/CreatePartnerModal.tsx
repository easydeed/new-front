'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePartnerModal({ onClose, onCreated }: Props) {
  const [company, setCompany] = useState('');
  const [rateLimit, setRateLimit] = useState(120);
  const [scopes, setScopes] = useState<string[]>(['deed:create', 'deed:read']);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (s: string) => {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleCreate = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/partners/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, scopes, rate_limit_per_minute: rateLimit })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setApiKey(data.api_key);
    } catch (e: any) {
      setError(e.message || 'Failed to create partner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xl">
        {!apiKey ? (
          <>
            <h2 className="text-xl font-semibold mb-4">Add New Partner</h2>
            {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="SoftPro Corporation"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scopes</label>
                <div className="flex items-center gap-4 text-sm">
                  {['deed:create','deed:read'].map(s => (
                    <label key={s} className="flex items-center gap-2">
                      <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rate Limit (req/min)</label>
                <input
                  type="number"
                  className="w-40 border rounded-lg px-3 py-2"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value || '0'))}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg border" onClick={onClose}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                onClick={handleCreate}
                disabled={loading || !company}
              >
                {loading ? 'Generating…' : 'Generate API Key'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2">Partner Created</h2>
            <p className="text-sm text-gray-600 mb-4">Copy this API key now — it will not be shown again.</p>
            <div className="bg-gray-100 rounded-lg p-3 font-mono break-all mb-4">{apiKey}</div>
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={() => { onCreated(); onClose(); }}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
