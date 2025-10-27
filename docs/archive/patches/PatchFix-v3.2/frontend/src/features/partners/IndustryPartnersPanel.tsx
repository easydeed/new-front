
'use client';
import React, { useState } from 'react';
import { usePartners } from './PartnersContext';
import type { PartnerCategory, PartnerRole } from './types';

const categories: { key: PartnerCategory; label: string }[] = [
  { key: 'title_company', label: 'Title Company' },
  { key: 'real_estate', label: 'Real Estate' },
  { key: 'lender', label: 'Lender' }
];

const roles: { key: PartnerRole; label: string }[] = [
  { key: 'title_officer', label: 'Title Officer' },
  { key: 'realtor', label: 'Realtor' },
  { key: 'loan_officer', label: 'Loan Officer' }
];

export default function IndustryPartnersPanel() {
  const { items, create } = usePartners();
  const [name, setName] = useState('');
  const [cat, setCat] = useState<PartnerCategory>('title_company');
  const [personName, setPersonName] = useState('');
  const [role, setRole] = useState<PartnerRole>('title_officer');

  return (
    <div>
      <div className="wiz-section-title">Industry Partners</div>
      <div className="wiz-list" style={{marginBottom:12}}>
        {items.slice(0,8).map((it, idx) => (
          <span key={idx} className="wiz-chip">{it.display}</span>
        ))}
      </div>
      <div className="wiz-section-title">Add New</div>
      <div style={{display:'grid', gap:8}}>
        <input className="wiz-input" placeholder="Organization name" value={name} onChange={e=>setName(e.target.value)} />
        <select className="wiz-select" value={cat} onChange={e=>setCat(e.target.value as PartnerCategory)}>
          {categories.map(c=> <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <input className="wiz-input" placeholder="Contact person (optional)" value={personName} onChange={e=>setPersonName(e.target.value)} />
        <select className="wiz-select" value={role} onChange={e=>setRole(e.target.value as PartnerRole)}>
          {roles.map(r=> <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <button className="wiz-btn" onClick={()=>{
          if (!name) return;
          create({ name, category: cat, person: personName ? { name: personName, role } : undefined });
          setName(''); setPersonName('');
        }}>Save Partner</button>
      </div>
    </div>
  );
}
