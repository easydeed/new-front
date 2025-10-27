'use client';
import { useEffect, useState } from 'react';

export default function ModeToggle() {
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<'classic'|'modern'>('modern');

  useEffect(() => {
    setHydrated(true);
    const qs = new URLSearchParams(window.location.search);
    const urlMode = (qs.get('mode') as 'classic'|'modern'|null);
    const stored = localStorage.getItem('wizard_mode');
    const initial = urlMode || (stored as any) || (process.env.NEXT_PUBLIC_WIZARD_MODE_DEFAULT as any) || 'classic';
    setMode(initial);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('wizard_mode', mode);
  }, [hydrated, mode]);

  if (!hydrated) return null;

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50 }}>
      <label style={{ fontSize: 12, opacity: 0.75, display: 'block', marginBottom: 4 }}>Wizard Mode</label>
      <div style={{ display: 'flex', gap: 8, background: '#fff', border: '1px solid #eee', borderRadius: 999, padding: 4 }}>
        <button
          aria-label="Use Classic Wizard"
          onClick={() => setMode('classic')}
          style={{ padding: '6px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', background: mode==='classic' ? '#0f172a' : 'transparent', color: mode==='classic' ? 'white' : '#0f172a' }}
        >Classic</button>
        <button
          aria-label="Use Modern Wizard"
          onClick={() => setMode('modern')}
          style={{ padding: '6px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', background: mode==='modern' ? '#0f172a' : 'transparent', color: mode==='modern' ? 'white' : '#0f172a' }}
        >Modern</button>
      </div>
    </div>
  );
}
