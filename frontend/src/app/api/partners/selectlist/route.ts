/**
 * Partners SelectList API Proxy - GET /api/partners/selectlist
 * Returns simplified partner list for dropdowns
 * Patch 5: Full Partners Infrastructure
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // Proxy to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    const res = await fetch(`${backendUrl}/partners/selectlist/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[API Proxy /api/partners/selectlist GET] Backend error:', res.status, errorText);
      return NextResponse.json(
        { error: errorText || `Backend returned ${res.status}` },
        { status: res.status }
      );
    }
    
    const data = await res.json();
    console.log('[API Proxy /api/partners/selectlist GET] Success:', data.length, 'partners');
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('[API Proxy /api/partners/selectlist GET] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
