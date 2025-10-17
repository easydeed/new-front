'use client';
import React, { useEffect, useMemo, useState } from 'react';

const CATEGORIES = ['title_company','real_estate','lender','other'] as const;
const ROLES = ['title_officer','realtor','loan_officer','other'] as const;

function Field({label, children}:{label:string; children:any}) {
  return <label style={{ display: 'block', marginBottom: 12 }}>
    <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>{label}</div>
    {children}
  </label>;
}

export default function PartnersManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any|null>(null);

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

  function blank() {
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

  function save(it:any) {
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
    .then(() => { setEditing(null); load(); });
  }

  function del(id:string) {
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

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Industry Partners</h2>
        <button onClick={() => setEditing(blank())} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0f172a', color: 'white', cursor: 'pointer' }}>New Partner</button>
      </div>

      {editing && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16, background: 'white' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Company">
              <input value={editing.company_name} onChange={e => setEditing({...editing, company_name: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
            </Field>
            <Field label="Contact name">
              <input value={editing.contact_name} onChange={e => setEditing({...editing, contact_name: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
            </Field>
            <Field label="Email">
              <input value={editing.email} onChange={e => setEditing({...editing, email: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
            </Field>
            <Field label="Phone">
              <input value={editing.phone} onChange={e => setEditing({...editing, phone: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
            </Field>
            <Field label="Category">
              <select value={editing.category} onChange={e => setEditing({...editing, category: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
              </select>
            </Field>
            <Field label="Role">
              <select value={editing.role} onChange={e => setEditing({...editing, role: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={editing.notes} onChange={e => setEditing({...editing, notes: e.target.value})} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', minHeight: 80 }} />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => save(editing)} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0f172a', color: 'white', cursor: 'pointer' }}>{editing.id ? 'Update' : 'Create'}</button>
            {editing.id ? <button onClick={() => del(editing.id)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Delete</button> : null}
            <button onClick={() => setEditing(null)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div>Loading…</div> : null}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((p:any) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: 'white' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.company_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{p.role?.replace('_',' ')} • {p.contact_name || p.email || '—'} • {p.category?.replace('_',' ')}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(p)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => del(p.id)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

