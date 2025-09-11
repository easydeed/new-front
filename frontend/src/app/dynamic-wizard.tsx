"use client";

import React, { useEffect, useState } from 'react';
import { useWizardStore } from '../store';
import PropertySearchWithTitlePoint from '../components/PropertySearchWithTitlePoint';

type Registry = Record<string, {
  label: string;
  steps: { key: string; title: string }[];
}>;

export default function DynamicWizard() {
  const { docType, setDocType, currentStep, setCurrentStep, data, setData } = useWizardStore();
  const [registry, setRegistry] = useState<Registry>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://deedpro-main-api.onrender.com';
        const res = await fetch(`${base}/api/doc-types`);
        if (!res.ok) throw new Error(`Failed to load registry: ${res.status}`);
        const json = await res.json();
        setRegistry(json);
        if (!docType && json.grant_deed) setDocType('grant_deed');
      } catch (e: any) {
        setError(e.message || 'Failed to load document registry');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = registry[docType]?.steps || [];
  const totalSteps = steps.length + 1; // +1 for initial property search

  const handlePropertyVerified = (payload: any) => {
    setData('step1', payload);
    setCurrentStep(2);
  };

  const goNext = () => setCurrentStep(Math.min(currentStep + 1, totalSteps));
  const goBack = () => setCurrentStep(Math.max(currentStep - 1, 1));

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (error) return <div style={{ padding: 24, color: '#b91c1c' }}>Error: {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
      {/* Step 1: Property Search */}
      {currentStep === 1 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
          <h2 style={{ margin: 0, marginBottom: 12 }}>Property Search</h2>
          <PropertySearchWithTitlePoint onVerified={handlePropertyVerified} />
        </div>
      )}

      {/* Dynamic Steps from registry */}
      {currentStep > 1 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <strong>{registry[docType]?.label || 'Document'}</strong>
            <span>Step {currentStep - 1} of {steps.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((s, idx) => (
              <div key={s.key} style={{ display: currentStep - 2 === idx ? 'block' : 'none' }}>
                <h3 style={{ marginTop: 0 }}>{s.title}</h3>
                {/* Minimal UI placeholders; concrete inputs exist in existing components */}
                <textarea
                  style={{ width: '100%', minHeight: 120, border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}
                  placeholder={`Enter data for ${s.title}`}
                  value={String((data as any)[s.key] || '')}
                  onChange={(e) => setData(s.key, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <button onClick={goBack} style={{ padding: '8px 14px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff' }}>Back</button>
            <button onClick={goNext} style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#F57C00', color: '#fff' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}


