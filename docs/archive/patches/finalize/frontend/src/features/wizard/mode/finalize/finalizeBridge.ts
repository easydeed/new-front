'use client';
export type CanonicalDeed = { deedType: string; [k:string]: any };

function withMode(url: string, mode: 'modern'|'classic'='modern'){
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}mode=${mode}`;
}

/**
 * Posts canonical payload to backend and redirects to preview with mode context.
 * Set endpoint via opts.endpoint if your route differs.
 */
export async function finalizeDeed(canonical: CanonicalDeed, opts?: { token?: string; endpoint?: string; mode?: 'modern'|'classic' }){
  const endpoint = opts?.endpoint || '/api/deeds';
  const headers: Record<string,string> = { 'Content-Type':'application/json' };
  if (opts?.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(canonical) });
  if (!res.ok) {
    const text = await res.text().catch(()=>'');
    throw new Error(`Failed to create deed: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (json?.deedId) {
    const dest = withMode(`/deeds/${json.deedId}/preview`, opts?.mode ?? 'modern');
    window.location.assign(dest);
  }
  return json;
}
