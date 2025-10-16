
export default async function finalizeDeed(payload: any): Promise<{ success: boolean; deedId?: string; error?: string; }> {
  try {
    // Get auth token from localStorage
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('token') || localStorage.getItem('access_token')) 
      : null;
    
    const res = await fetch('/api/deeds/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text();
      return { success: false, error: txt || String(res.status) };
    }
    const data = await res.json();
    return { success: Boolean(data?.success), deedId: data?.deedId || data?.id };
  } catch (e:any) {
    return { success: false, error: e?.message || 'network' };
  }
}

