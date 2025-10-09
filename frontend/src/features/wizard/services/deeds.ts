// Phase 11 Prequal - Deed metadata persistence service

export async function saveDeedMetadata(payload: any, token?: string) {
  const res = await fetch('/api/deeds/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const j = await res.json().catch(() => ({ detail: 'Failed to save deed' }));
    throw new Error(j.detail || 'Failed to save deed');
  }
  
  return res.json();
}

