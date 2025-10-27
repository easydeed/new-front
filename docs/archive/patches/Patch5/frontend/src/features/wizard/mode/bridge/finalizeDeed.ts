'use client';
/**
 * Canonical finalize for Modern mode. Posts payload to backend and routes to preview.
 * This *replaces* any previous window.location redirects to Classic.
 */
export async function finalizeDeed(payload: any): Promise<{success:boolean; deedId?: string; error?: string}> {
  try {
    const res = await fetch('/api/deeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!res.ok) {
      const t = await res.text();
      return { success: false, error: t || 'Finalize failed' };
    }
    const data = await res.json();
    return { success: true, deedId: data.id || data.deedId };
  } catch (e:any) {
    return { success: false, error: e?.message || 'Network error' };
  }
}
