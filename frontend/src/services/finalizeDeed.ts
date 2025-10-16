
export default async function finalizeDeed(payload: any): Promise<{ success: boolean; deedId?: string; error?: string; }> {
  try {
    const res = await fetch('/api/deeds/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

