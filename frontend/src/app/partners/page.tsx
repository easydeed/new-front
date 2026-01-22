'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';

const CATEGORIES = ['title_company', 'real_estate', 'lender', 'other'] as const;
const ROLES = ['title_officer', 'realtor', 'loan_officer', 'other'] as const;

type Partner = {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  category: string;
  role: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
};

export default function PartnersPage() {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<Partner> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('token') || localStorage.getItem('access_token'))
      : null;
    
    fetch('/api/partners', { 
      credentials: 'include',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
      .then(r => r.json()).then(d => setItems(d.items || d || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  function blank(): Partial<Partner> {
    return {
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      category: 'title_company',
      role: 'title_officer',
      is_active: true,
      notes: ''
    };
  }

  function save(it: Partial<Partner>) {
    const method = it.id ? 'PUT' : 'POST';
    const url = it.id ? `/api/partners/${it.id}` : '/api/partners';
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('token') || localStorage.getItem('access_token'))
      : null;
    
    fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify(it)
    }).then(r => r.json())
    .then(() => { 
      setEditing(null); 
      setShowForm(false);
      load(); 
    });
  }

  function del(id: string) {
    if (!confirm('Delete this partner?')) return;
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('token') || localStorage.getItem('access_token'))
      : null;
    
    fetch(`/api/partners/${id}`, { 
      method: 'DELETE', 
      credentials: 'include',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
      .then(() => load());
  }

  function getCategoryBadge(category: string) {
    const colors: Record<string, string> = {
      title_company: '#3b82f6',
      real_estate: '#10b981',
      lender: '#f59e0b',
      other: '#6b7280'
    };
    const color = colors[category] || colors.other;
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: '500',
        background: `${color}15`,
        color: color,
        whiteSpace: 'nowrap'
      }}>
        {category.replace('_', ' ')}
      </span>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Industry Partners</h1>
              <p className="text-gray-500 mt-1">
                {items.length} partner{items.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button 
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors" 
              onClick={() => { 
                setEditing(blank()); 
                setShowForm(true); 
              }}
            >
              <span>➕</span> Add New Partner
            </button>
          </div>

          {/* Edit Form (when active) */}
          {showForm && editing && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{editing.id ? 'Edit Partner' : 'New Partner'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input 
                    value={editing.company_name || ''} 
                    onChange={e => setEditing({...editing, company_name: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Pacific Coast Title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input 
                    value={editing.contact_name || ''} 
                    onChange={e => setEditing({...editing, contact_name: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    value={editing.email || ''} 
                    onChange={e => setEditing({...editing, email: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="john@pct.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    value={editing.phone || ''} 
                    onChange={e => setEditing({...editing, phone: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    value={editing.category || 'title_company'} 
                    onChange={e => setEditing({...editing, category: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select 
                    value={editing.role || 'title_officer'} 
                    onChange={e => setEditing({...editing, role: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  value={editing.notes || ''} 
                  onChange={e => setEditing({...editing, notes: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  onClick={() => save(editing)}
                >
                  {editing.id ? '💾 Update' : '➕ Create'}
                </button>
                {editing.id && (
                  <button 
                    className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                    onClick={() => del(editing.id!)}
                  >
                    🗑️ Delete
                  </button>
                )}
                <button 
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  onClick={() => { setEditing(null); setShowForm(false); }}
                >
                  ✖️ Cancel
                </button>
              </div>
            </div>
          )}

          {/* Partners Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Company</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Added</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        Loading partners...
                      </td>
                    </tr>
                  )}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        No partners yet. Click "Add New Partner" to get started.
                      </td>
                    </tr>
                  )}
                  {!loading && items.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{p.company_name}</td>
                      <td className="px-6 py-4 text-gray-600">{p.contact_name || '—'}</td>
                      <td className="px-6 py-4">{getCategoryBadge(p.category)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{p.role?.replace('_',' ')}</td>
                      <td className="px-6 py-4">
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="text-blue-600 hover:underline">
                            {p.email}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{p.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                            onClick={() => { 
                              setEditing(p); 
                              setShowForm(true); 
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                            onClick={() => del(p.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats Card */}
          {items.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Total Partners</div>
                  <div className="text-2xl font-bold text-blue-600">{items.length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Title Companies</div>
                  <div className="text-2xl font-bold text-blue-500">{items.filter(p => p.category === 'title_company').length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Real Estate</div>
                  <div className="text-2xl font-bold text-emerald-500">{items.filter(p => p.category === 'real_estate').length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Lenders</div>
                  <div className="text-2xl font-bold text-amber-500">{items.filter(p => p.category === 'lender').length}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
