// frontend/src/components/notifications/NotificationsBell.tsx
'use client';

import React, { useEffect, useState } from 'react';

const ENABLED = process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED === 'true';
const POLL_MS = Number(process.env.NEXT_PUBLIC_NOTIFICATIONS_POLL_MS || 30000);

export function NotificationsBell() {
  const [count, setCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  async function loadCount() {
    if (!ENABLED || !token) return;
    try {
      const res = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.count || 0);
      }
    } catch {}
  }

  async function loadItems() {
    if (!ENABLED || !token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data || []);
      }
    } catch {}
  }

  async function markAllRead() {
    if (!ENABLED || !token || items.length === 0) return;
    try {
      const ids = items.filter(x => !x.read).map(x => x.id);
      if (ids.length === 0) return;
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      setCount(0);
      await loadItems();
    } catch {}
  }

  useEffect(() => {
    loadCount();
    const id = setInterval(loadCount, POLL_MS);
    return () => clearInterval(id);
  }, [token]);

  return !ENABLED ? null : (
    <div style={{ position: 'relative' }}>
      <button
        aria-label="Notifications"
        onClick={async () => { setOpen(!open); if (!open) { await loadItems(); await markAllRead(); } }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18 }}
      >
        🔔
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white',
            borderRadius: '999px', padding: '2px 6px', fontSize: 12
          }}>{count}</span>
        )}
      </button>
      
      {/* Tooltip positioned to the right */}
      {showTooltip && !open && (
        <div style={{
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: '8px',
          background: '#1f2937',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 100,
          pointerEvents: 'none'
        }}>
          Notifications {count > 0 && `(${count})`}
        </div>
      )}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 28, width: 360, maxHeight: 420, overflow: 'auto',
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
          zIndex: 50, padding: 8
        }}>
          <div style={{ fontWeight: 600, padding: '8px 6px' }}>Notifications</div>
          {items.length === 0 ? (
            <div style={{ padding: 12, color: '#6b7280' }}>No notifications</div>
          ) : items.map((n, idx) => (
            <div key={idx} style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
              <div style={{ fontWeight: 600 }}>{n.title}</div>
              <div style={{ fontSize: 14 }}>{n.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
