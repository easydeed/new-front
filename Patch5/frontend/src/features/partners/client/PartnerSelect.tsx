'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Combobox, { ComboOption } from '@/features/wizard/mode/components/Combobox';

const CATEGORIES = ['title_company','real_estate','lender','other'] as const;
const ROLES = ['title_officer','realtor','loan_officer','other'] as const;

export default function PartnerSelect({
  value,
  onSelected,
  allowCreate=false
}:{
  value?: string;
  onSelected: (partner:any) => void;
  allowCreate?: boolean;
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

  const options: ComboOption[] = useMemo(() => partners.map((p:any) => ({
    value: p.id,
    label: `${p.company_name} — ${p.contact_name || p.role || ''}`,
    meta: p
  })), [partners]);


  return (
    <div>
      <Combobox
        label="Pick partner"
        value={value || ''}
        onChange={(v) => {
          const found = partners.find((p:any) => p.id === v);
          if (found) onSelected(found);
          else if (allowCreate && v) {
            // quick create minimal partner using typed string
            fetch('/api/partners', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ company_name: v, category: 'other', role: 'other' })
            })
            .then(r => r.json())
            .then(p => { onSelected(p); setPartners([p, ...partners]); })
            .catch(() => {});
          }
        }}
        options={options}
        allowCustom={allowCreate}
        placeholder="Search partners…"
      />
    </div>
  );
}
