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
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="wizard-container">
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem' 
          }}>
            <div>
              <h1 style={{ margin: 0 }}>Industry Partners</h1>
              <div style={{ color: 'var(--gray-600)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                {items.length} partner{items.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button 
              className="btn-primary" 
              onClick={() => { 
                setEditing(blank()); 
                setShowForm(true); 
              }}
            >
              ➕ Add New Partner
            </button>
          </div>

          {/* Edit Form (when active) */}
          {showForm && editing && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-body">
                <h3 style={{ marginTop: 0 }}>{editing.id ? 'Edit Partner' : 'New Partner'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                      Company Name *
                    </label>
                    <input 
                      value={editing.company_name || ''} 
                      onChange={e => setEditing({...editing, company_name: e.target.value})} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--gray-300)' }} 
                      placeholder="Pacific Coast Title"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                      Contact Name
                    </label>
                    <input 
                      value={editing.contact_name || ''} 
                      onChange={e => setEditing({...editing, contact_name: e.target.value})} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--gray-300)' }} 
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                      Email
                    </label>
                    <input 
                      value={editing.email || ''} 
                      onChange={e => setEditing({...editing, email: e.target.value})} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--gray-300)' }} 
                      placeholder="john@pct.com"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                      Phone
                    </label>
                    <input 
                      value={editing.phone || ''} 
                      onChange={e => setEditing({...editing, phone: e.target.value})} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--gray-300)' }} 
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                      Category
                    </label>
                    <select 
                      value={editing.category || 'title_company'} 
                      onChange={e => setEditing({...editing, category: e.target.value})} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--gray-300)' }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                      Role
                    </label>
                    <select 
                      value={editing.role || 'title_officer'} 
                      onChange={e => setEditing({...editing, role: e.target.value})} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--gray-300)' }}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: '0.25rem' }}>
                    Notes
                  </label>
                  <textarea 
                    value={editing.notes || ''} 
                    onChange={e => setEditing({...editing, notes: e.target.value})} 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--gray-300)', minHeight: '80px' }} 
                    placeholder="Additional notes..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn-primary" onClick={() => save(editing)}>
                    {editing.id ? '💾 Update' : '➕ Create'}
                  </button>
                  {editing.id && (
                    <button 
                      className="btn" 
                      onClick={() => del(editing.id!)}
                      style={{ background: '#ef4444', color: 'white' }}
                    >
                      🗑️ Delete
                    </button>
                  )}
                  <button className="btn" onClick={() => { setEditing(null); setShowForm(false); }}>
                    ✖️ Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Partners Table */}
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table w-100 table-striped">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Contact</th>
                      <th>Category</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                          Loading partners...
                        </td>
                      </tr>
                    )}
                    {!loading && items.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                          No partners yet. Click "Add New Partner" to get started.
                        </td>
                      </tr>
                    )}
                    {!loading && items.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: '500' }}>{p.company_name}</td>
                        <td>{p.contact_name || '—'}</td>
                        <td>{getCategoryBadge(p.category)}</td>
                        <td>
                          <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                            {p.role?.replace('_',' ')}
                          </span>
                        </td>
                        <td>
                          {p.email ? (
                            <a href={`mailto:${p.email}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                              {p.email}
                            </a>
                          ) : '—'}
                        </td>
                        <td>{p.phone || '—'}</td>
                        <td>
                          <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button 
                              className="btn btn-sm" 
                              onClick={() => { 
                                setEditing(p); 
                                setShowForm(true); 
                              }}
                              style={{ 
                                padding: '0.25rem 0.75rem', 
                                fontSize: '0.875rem',
                                background: 'var(--primary)',
                                color: 'white'
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className="btn btn-sm" 
                              onClick={() => del(p.id)}
                              style={{ 
                                padding: '0.25rem 0.75rem', 
                                fontSize: '0.875rem',
                                background: '#ef4444',
                                color: 'white'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          {items.length > 0 && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-body">
                <h4 style={{ marginTop: 0 }}>Quick Stats</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Total Partners</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary)' }}>
                      {items.length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Title Companies</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#3b82f6' }}>
                      {items.filter(p => p.category === 'title_company').length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Real Estate</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>
                      {items.filter(p => p.category === 'real_estate').length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Lenders</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f59e0b' }}>
                      {items.filter(p => p.category === 'lender').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
