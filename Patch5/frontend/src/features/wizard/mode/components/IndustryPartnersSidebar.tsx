'use client';
import React, { useEffect, useMemo, useState } from 'react';
import PartnerSelect from '@/features/partners/client/PartnerSelect';

export default function IndustryPartnersSidebar({
  onPick
}: {
  onPick: (partner: any) => void;
}) {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/partners', { credentials: 'include' })
      .then(r => r.json()).then(d => setPartners(d.items || d || []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const p of partners) {
      const key = `${p.category || 'other'}`;
      groups[key] = groups[key] || [];
      groups[key].push(p);
    }
    return groups;
  }, [partners]);

  return (
    <aside aria-label="Industry Partners quick picks" style={{ minWidth: 280, padding: 16, borderLeft: '1px solid #e2e8f0', background: '#fafafa' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Industry Partners</div>
      {loading ? <div>Loading…</div> : null}
      {!loading && Object.keys(grouped).length === 0 ? <div>No partners yet.</div> : null}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 6, textTransform: 'capitalize' }}>{cat.replace('_',' ')}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {items.map((p:any) => (
              <button key={p.id}
                onClick={() => onPick(p)}
                style={{ textAlign: 'left', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600 }}>{p.company_name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{p.role?.replace('_',' ')} • {p.contact_name || p.email || '—'}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 16 }}>
        <PartnerSelect onSelected={(p) => onPick(p)} allowCreate />
      </div>
    </aside>
  );
}
