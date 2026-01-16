// frontend/src/app/api/partners/selectlist/route.ts
// Proxy route for partners list API
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

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
    
    // If backend returns error, return empty array to unblock UI
    if (!res.ok) {
      console.error(`[partners/selectlist] Backend error ${res.status}`);
      return NextResponse.json([], { 
        status: 200,
        headers: { 
          'content-type': 'application/json',
          'x-partners-fallback': 'true',
        }
      });
    }
    
    // Parse response
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[partners/selectlist] JSON parse error');
      return NextResponse.json([], { 
        status: 200,
        headers: { 
          'content-type': 'application/json',
          'x-partners-fallback': 'parse-error'
        }
      });
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
    
    // Return empty array on exception to unblock UI
    return NextResponse.json([], { 
      status: 200,
      headers: { 
        'content-type': 'application/json',
        'x-partners-fallback': 'exception',
      }
    });
  }
}
