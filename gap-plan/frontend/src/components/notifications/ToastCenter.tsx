// frontend/src/components/notifications/ToastCenter.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';

type Toast = { id: number; text: string };
const Ctx = createContext<{ push: (text: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ToastCenter not mounted');
  return ctx;
}

export function ToastCenter({ children }: { children?: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  function push(text: string) {
    const id = Date.now();
    setItems(prev => [...prev, { id, text }]);
    setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), 4000);
  }
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div style={{ position: 'fixed', right: 20, bottom: 20, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 1000 }}>
        {items.map(i => (
          <div key={i.id} style={{ background: 'black', color: 'white', padding: '10px 14px', borderRadius: 8, maxWidth: 380, boxShadow: '0 12px 24px rgba(0,0,0,0.25)' }}>
            {i.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
