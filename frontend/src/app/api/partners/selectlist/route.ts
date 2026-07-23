// frontend/src/app/api/partners/selectlist/route.ts
// Proxy route for partners list API
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { PARTNERS_BACKEND as API_BASE } from '../_backend';

export async function GET(req: NextRequest) {
  try {
    // Get headers
    const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const org = req.headers.get('x-organization-id') || req.headers.get('X-Organization-Id') || '';
    
    // Build URL (backend mounts at /partners not /api/partners)
    const url = `${API_BASE}/partners/selectlist/`;
    
    // Make request
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': auth || '',
        'x-organization-id': org || '',
        'accept': 'application/json',
        'User-Agent': 'DeedPro-Frontend/1.0'
      } as any,
      cache: 'no-store',
    });
    
    // Get response text
    const text = await res.text();
    
    // Bug #12b fix: forward the real failure — a swallowed error rendered
    // identically to "no partners yet" and hid the actual cause.
    if (!res.ok) {
      console.error(`[partners/selectlist] Backend error ${res.status}: ${text.slice(0, 200)}`);
      let body: unknown;
      try { body = JSON.parse(text); } catch { body = { detail: text || `Backend returned ${res.status}` }; }
      return NextResponse.json(body, { status: res.status });
    }
    
    // Parse response
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[partners/selectlist] JSON parse error');
      return NextResponse.json({ detail: 'Invalid response from partners backend' }, { status: 502 });
    }
    
    // Success - return the data
    const ct = res.headers.get('content-type') || 'application/json';
    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { 
        'content-type': ct,
        'x-partners-source': 'backend'
      } 
    });
    
  } catch (e: any) {
    console.error('[partners/selectlist] Exception:', e.message);
    return NextResponse.json({ detail: `Partners proxy error: ${e.message}` }, { status: 502 });
  }
}
