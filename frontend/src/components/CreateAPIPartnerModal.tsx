/**
 * CreateAPIPartnerModal
 * 
 * This modal is for creating API Partners (third-party integrators like SoftPro, Qualia)
 * who get API keys to access DeedPro programmatically.
 * 
 * NOT for Industry Partners (title companies, lenders, etc.) used in deed generation.
 * For Industry Partners, see: features/partners/QuickAddPartnerModal.tsx
 */
'use client';

import { useState } from 'react';
import { X, Key, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateAPIPartnerModal({ onClose, onCreated }: Props) {
  const [company, setCompany] = useState('');
  const [rateLimit, setRateLimit] = useState(120);
  const [scopes, setScopes] = useState<string[]>(['deed:create', 'deed:read']);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleScope = (s: string) => {
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleCreate = async () => {
    setLoading(true); 
    setError(null);
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch('/api/partners/admin/bootstrap', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ company, scopes, rate_limit_per_minute: rateLimit })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setApiKey(data.api_key);
      toast.success('API Partner created successfully');
    } catch (e: any) {
      setError(e.message || 'Failed to create API partner');
      toast.error('Failed to create API partner');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {!apiKey ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Add API Partner</h2>
                  <p className="text-sm text-gray-500">For third-party integrations</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="SoftPro Corporation"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Scopes
                </label>
                <div className="flex items-center gap-4 text-sm">
                  {['deed:create', 'deed:read'].map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={scopes.includes(s)} 
                        onChange={() => toggleScope(s)}
                        className="w-4 h-4 text-brand-500 rounded focus:ring-brand-500"
                      />
                      <span className="font-mono text-gray-600">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate Limit (requests/minute)
                </label>
                <input
                  type="number"
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value || '0'))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
              <button 
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                onClick={handleCreate}
                disabled={loading || !company}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Generate API Key
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">API Partner Created</h2>
                  <p className="text-sm text-gray-500">Copy the key below</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ Copy this API key now — it will not be shown again.
                </p>
              </div>
              
              <div className="relative">
                <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm break-all pr-12">
                  {apiKey}
                </div>
                <button
                  onClick={handleCopy}
                  className="absolute top-3 right-3 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button 
                className="px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium transition-colors"
                onClick={() => { onCreated(); onClose(); }}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

