'use client';
import React, { useEffect, useState } from 'react';

export default function AdminPartnersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/partners', { credentials: 'include' })
      .then(r => r.json()).then(d => setItems(d.items || d || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Admin • All Partners</h2>
      {loading ? <div>Loading…</div> : null}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((p:any) => (
          <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: 'white' }}>
            <div style={{ fontWeight: 600 }}>{p.company_name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{p.category} • {p.role} • org: {p.organization_id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
