'use client';
export type CanonicalDeed = {
  deedType: string;
  [k:string]: any;
};

export async function finalizeDeed(canonical: CanonicalDeed, opts?: { token?: string; endpoint?: string }){
  const endpoint = opts?.endpoint || '/api/deeds';
  const headers: Record<string,string> = { 'Content-Type':'application/json' };
  if (opts?.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(canonical) });
  if (!res.ok) throw new Error('Failed to create deed');
  const json = await res.json();
  if (json?.deedId) {
    window.location.href = `/deeds/${json.deedId}/preview`;
  }
  return json;
}
