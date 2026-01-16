'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, ExternalLink, Trash2, Key } from 'lucide-react';
import CreateAPIPartnerModal from '@/components/CreateAPIPartnerModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Partner {
  key_prefix: string;
  company: string;
  is_active: boolean;
  scopes: string[];
  rate_limit_per_minute: number;
  created_at: string;
}

export default function PartnersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  
  // ✅ PHASE 22-B: Admin auth check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    // TODO: Add role verification (admin only)
    // For now, just check token exists
  }, [router]);

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

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    
    setRevoking(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/partners/admin/revoke/${revokeTarget}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toast.success('API key revoked successfully');
        load();
      } else {
        toast.error('Failed to revoke API key');
      }
    } catch (err) {
      toast.error('Failed to revoke API key');
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">API Partners</h1>
            <p className="text-sm text-gray-500">Manage third-party integrations</p>
          </div>
        </div>
        <button 
          className="px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors flex items-center gap-2" 
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium text-gray-900">No API partners yet</p>
          <p className="text-sm">Add your first integration partner to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="py-3 px-4 font-medium text-gray-700">Company</th>
                <th className="py-3 px-4 font-medium text-gray-700">Key Prefix</th>
                <th className="py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="py-3 px-4 font-medium text-gray-700">Scopes</th>
                <th className="py-3 px-4 font-medium text-gray-700">Rate Limit</th>
                <th className="py-3 px-4 font-medium text-gray-700">Created</th>
                <th className="py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.key_prefix} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{p.company}</td>
                  <td className="py-3 px-4">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{p.key_prefix}</code>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{p.scopes.join(', ')}</td>
                  <td className="py-3 px-4 text-gray-600">{p.rate_limit_per_minute}/min</td>
                  <td className="py-3 px-4 text-gray-600">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <a 
                        className="text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium" 
                        href={`/admin/partners/${p.key_prefix}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                      </a>
                      {p.is_active && (
                        <button 
                          className="text-red-600 hover:text-red-700 flex items-center gap-1 font-medium" 
                          onClick={() => setRevokeTarget(p.key_prefix)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Partner Modal */}
      {showModal && (
        <CreateAPIPartnerModal 
          onClose={() => setShowModal(false)} 
          onCreated={load} 
        />
      )}
      
      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke API Key"
        message="This will immediately invalidate the API key. Any integrations using this key will stop working."
        confirmLabel="Revoke Key"
        cancelLabel="Cancel"
        variant="danger"
        loading={revoking}
      />
    </div>
  );
}
