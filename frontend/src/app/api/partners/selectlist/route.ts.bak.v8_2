// frontend/src/app/api/partners/selectlist/route.ts
// FINAL FIX: Partners 404 - Enhanced diagnostics + fallback
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';

export async function GET(req: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[partners/selectlist] ${timestamp} - Route called`);
  
  try {
    // Get headers
    const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const org = req.headers.get('x-organization-id') || req.headers.get('X-Organization-Id') || '';
    
    console.log(`[partners/selectlist] Headers:`, { 
      hasAuth: !!auth, 
      hasOrg: !!org,
      authPreview: auth ? `${auth.substring(0, 20)}...` : 'none'
    });
    
    // Build URL
    const url = `${API_BASE}/api/partners/selectlist`;
    console.log(`[partners/selectlist] Proxying to: ${url}`);
    
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
    
    console.log(`[partners/selectlist] Backend response:`, { 
      status: res.status, 
      statusText: res.statusText,
      contentType: res.headers.get('content-type')
    });
    
    // Get response text
    const text = await res.text();
    console.log(`[partners/selectlist] Response length: ${text?.length || 0} bytes`);
    
    // If backend returns error, log it
    if (!res.ok) {
      console.error(`[partners/selectlist] Backend error ${res.status}:`, text);
      
      // Return empty array instead of error to unblock UI
      return NextResponse.json([], { 
        status: 200,
        headers: { 
          'content-type': 'application/json',
          'x-partners-fallback': 'true',
          'x-backend-status': String(res.status)
        }
      });
    }
    
    // Parse and validate response
    let data;
    try {
      data = JSON.parse(text);
      console.log(`[partners/selectlist] Parsed data:`, { 
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        keys: typeof data === 'object' ? Object.keys(data) : 'N/A'
      });
    } catch (parseError) {
      console.error(`[partners/selectlist] JSON parse error:`, parseError);
      // Return empty array on parse error
      return NextResponse.json([], { 
        status: 200,
        headers: { 
          'content-type': 'application/json',
          'x-partners-fallback': 'parse-error'
        }
      });
    }
    
    // Success! Return the data
    const ct = res.headers.get('content-type') || 'application/json';
    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { 
        'content-type': ct,
        'x-partners-source': 'backend'
      } 
    });
    
  } catch (e: any) {
    console.error(`[partners/selectlist] Exception:`, {
      name: e.name,
      message: e.message,
      stack: e.stack?.split('\n')[0]
    });
    
    // Return empty array on exception to unblock UI
    return NextResponse.json([], { 
      status: 200,
      headers: { 
        'content-type': 'application/json',
        'x-partners-fallback': 'exception',
        'x-error-message': e.message
      }
    });
  }
}
