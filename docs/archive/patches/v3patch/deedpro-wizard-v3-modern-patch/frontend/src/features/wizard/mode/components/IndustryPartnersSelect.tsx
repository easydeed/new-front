
'use client';
import React, { useEffect, useState } from 'react';
import { listPartners, createPartner } from '@/lib/api/partners';

export default function IndustryPartnersSelect({ value, onChange }: { value?: string; onChange: (v: string) => void; }) {
  const [partners, setPartners] = useState<{id:string; name:string}[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => { (async () => {
    try { const res = await listPartners(); setPartners(res); } catch {}
  })(); }, []);

  async function add() {
    if (!newName.trim()) return;
    const p = await createPartner({ name: newName.trim() });
    setPartners(prev => [p, ...prev]);
    onChange(p.name);
    setAdding(false);
    setNewName('');
  }

  return (
    <div className="dp-partners-select">
      <select className="form-select" value={value || ''} onChange={(e) => {
        if (e.target.value === '__new') { setAdding(true); return; }
        onChange(e.target.value);
      }}>
        <option value="">Select partner…</option>
        {partners.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        <option value="__new">New…</option>
      </select>
      {adding && (
        <div className="dp-inline-modal">
          <div className="box">
            <h4>New Partner</h4>
            <input className="form-control" placeholder="Partner / Title Co. name" value={newName} onChange={(e)=>setNewName(e.target.value)} />
            <div className="actions">
              <button className="btn btn-secondary" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={add}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
