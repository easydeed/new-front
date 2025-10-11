// frontend/src/features/wizard/finalize/useFinalizeDeed.ts
'use client';

export function useFinalizeDeed() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const API = process.env.NEXT_PUBLIC_API_URL || '';

  async function generatePreview(docType: string, ctx: any): Promise<string | null> {
    try {
      const path = docType === 'grant_deed' ? '/api/generate/grant-deed-ca' : `/api/generate-deed`;
      const res = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(ctx),
      });
      if (!res.ok) { console.error(await res.text()); return null; }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function finalizeSaveAndShare(docType: string, ctx: any, shareEmail?: string): Promise<boolean> {
    try {
      const saveRes = await fetch(`${API}/deeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          deed_type: docType,
          status: 'completed',
          property_address: ctx.property_address || ctx.address || null,
          grantor: ctx.grantors_text || null,
          grantee: ctx.grantees_text || ctx.trust_name || null,
          metadata: ctx
        })
      });
      if (!saveRes.ok) {
        console.warn('Save deed metadata failed');
        return false;
      }
      const saved = await saveRes.json();
      const deedId = saved.id || saved.deed_id;

      if (shareEmail) {
        await fetch(`${API}/deeds/${deedId}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ recipient_email: shareEmail })
        });
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  return { generatePreview, finalizeSaveAndShare };
}
